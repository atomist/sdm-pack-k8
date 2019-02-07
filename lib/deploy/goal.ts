/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GitProject } from "@atomist/automation-client";
import {
    AnyPush,
    DefaultGoalNameGenerator,
    ExecuteGoal,
    ExecuteGoalResult,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefinitionFrom,
    Goal,
    GoalInvocation,
    PushTest,
    SdmGoalEvent,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import { KubernetesApplication } from "../kubernetes/request";
import { generateKubernetesGoalEventData } from "./data";
import { deployApplication } from "./deploy";
import { getEnvironmentLabel } from "./environment";

/** Return repository slug for SDM goal event. */
export function goalEventSlug(goalEvent: SdmGoalEvent): string {
    return `${goalEvent.repo.owner}/${goalEvent.repo.name}`;
}

/**
 * Function signature for callback that can modify and return the
 * [[KubernetesApplication]] object.
 */
export type ApplicationDataCallback =
    (a: KubernetesApplication, p: GitProject, g: KubernetesDeploy, e: SdmGoalEvent) => Promise<KubernetesApplication>;

/**
 * Registration object to pass to KubernetesDeployment goal to
 * configure how deployment works.
 */
export interface KubernetesDeployRegistration {
    /**
     * Allows the user of this pack to modify the default application
     * data before execution of deployment.
     */
    applicationData?: ApplicationDataCallback;
    /**
     * It not set (falsey), this SDM will fulfill its own Kubernetes
     * deployment goals.  If set, its value defines the name of the
     * SDM that will fulfill the goal.  In this case, there should be
     * another SDM running whose name, i.e., its name as defined in
     * its registration/package.json, is the same as this name.
     */
    name?: string;
    /**
     * Optional push test for this goal implementation.
     */
    pushTest?: PushTest;
}

/**
 * Goal that initiates deploying an application to a Kubernetes
 * cluster.  Deploying the application is completed by the
 * [[kubernetesDeployHandler]] event handler.  By default, this goal
 * will be configured such that it is fulfilled by the SDM that
 * creates it.  To have this goal be executed by another SDM, set the
 * fulfillment name to the name of that SDM:
 *
 *     const deploy = new KubernetesDeploy()
 *         .with({ name: otherSdm.configuration.name });
 *
 */
export class KubernetesDeploy extends FulfillableGoalWithRegistrations<KubernetesDeployRegistration> {

    /** Standard SDM FulfillableGoalDetails. */
    public readonly details: FulfillableGoalDetails;

    /**
     * Create a KubernetesDeploy object.
     *
     * @param details Define unique aspects of this Kubernetes deployment, see [[KubernetesDeploy.details]].
     * @param dependsOn Other goals that must complete successfully before scheduling this goal.
     */
    constructor(details?: FulfillableGoalDetails, ...dependsOn: Goal[]) {
        const deets = defaultDetails(details);
        super(getGoalDefinitionFrom(deets, DefaultGoalNameGenerator.generateName("kubernetes-deploy")), ...dependsOn);
        this.details = deets;
    }

    /**
     * Register a deployment with the initiator fulfillment.
     */
    public with(registration: KubernetesDeployRegistration): this {
        this.addFulfillment({
            name: registration.name || this.sdm.configuration.name,
            goalExecutor: initiateKubernetesDeploy(this, registration),
            pushTest: registration.pushTest,
        });

        return this;
    }

    /**
     * Called by the SDM on initialization.  This function calls
     * `super.register` and adds a startup listener to the SDM.
     *
     * The startup listener registers a default goal fulfillment that
     * adds itself as fulfiller of its deployment requests if this
     * goal has no fulfillments or callbacks at startup.
     */
    public register(sdm: SoftwareDeliveryMachine): void {
        super.register(sdm);

        sdm.addStartupListener(async () => {
            if (this.fulfillments.length === 0 && this.callbacks.length === 0) {
                this.with({ pushTest: AnyPush });
            }
        });
    }
}

/**
 * Provide reasonable defaults for the various goal descriptions.
 */
function defaultDetails(details: FulfillableGoalDetails = {}): FulfillableGoalDetails {
    const envLabel = getEnvironmentLabel(details);
    if (!details.displayName) {
        details.displayName = `deploy${envLabel}`;
    }
    details.descriptions = details.descriptions || {};
    if (!details.descriptions.completed) {
        details.descriptions.completed = `Deployed${envLabel}`;
    }
    if (!details.descriptions.failed) {
        details.descriptions.failed = `Deployment${envLabel} failed`;
    }
    if (!details.descriptions.waitingForApproval) {
        details.descriptions.waitingForApproval = `Successfully deployed${envLabel}`;
    }
    return details;
}

/**
 * If in SDM team mode, this goal executor generates and stores the
 * Kubernetes application data for deploying an application to
 * Kubernetes.  It returns the augmented SdmGoalEvent with the
 * Kubernetes application information in the `data` property and the
 * state of the SdmGoalEvent set to "in_process".  The actual
 * deployment is done by the [[kubernetesDeployHandler]] event
 * handler.
 *
 * If in SDM local mode, generate the Kubernetes application data and
 * deploy the application.
 *
 * @param k8Deploy Kubernetes deploy object
 * @param registration Kubernetes deploy object registration
 * @return An ExecuteGoal result that is not really a result, but an intermediate state.
 */
export function initiateKubernetesDeploy(k8Deploy: KubernetesDeploy, registration: KubernetesDeployRegistration): ExecuteGoal {
    return async (goalInvocation: GoalInvocation): Promise<ExecuteGoalResult> => {
        const goalEvent = await generateKubernetesGoalEventData(k8Deploy, registration, goalInvocation);
        if (isInLocalMode()) {
            return deployApplication(goalEvent, goalInvocation.context, goalInvocation.progressLog);
        } else {
            goalEvent.state = SdmGoalState.in_process;
            return goalEvent;
        }
    };
}

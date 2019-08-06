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

import {
    GitProject,
    logger,
    ProjectFile,
} from "@atomist/automation-client";
import {
    fakeContext,
    ProjectLoadingParameters,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import * as _ from "lodash";
import { KubernetesSyncOptions } from "../config";
import { parseKubernetesSpecFile } from "../deploy/spec";
import { applySpec } from "../kubernetes/apply";
import { decryptSecret } from "../kubernetes/secret";
import { errMsg } from "../support/error";
import { defaultCloneOptions } from "./clone";
import { k8sSpecGlob } from "./diff";

/**
 * Clone the sync repo and apply the specs to the Kubernetes cluster.
 */
export async function repoSync(sdm: SoftwareDeliveryMachine): Promise<void> {
    const disposers: Array<() => Promise<void>> = [];
    const workspaceId: string = _.get(sdm, "configuration.workspaceIds[0]");
    const context = fakeContext(workspaceId);
    context.lifecycle = {
        dispose: async () => { await Promise.all(disposers.map(d => d())); },
        registerDisposable: (d: () => Promise<void>) => { disposers.push(d); },
    };
    const projectLoadingParameters: ProjectLoadingParameters = {
        credentials: sdm.configuration.sdm.k8s.options.sync.credentials,
        cloneOptions: defaultCloneOptions,
        context,
        id: sdm.configuration.sdm.k8s.options.sync.repo,
        readOnly: true,
    };
    const opts: KubernetesSyncOptions = _.get(sdm, "configuration.sdm.k8s.options.sync");
    try {
        await sdm.configuration.sdm.projectLoader.doWithProject(projectLoadingParameters, syncApply(opts));
    } catch (e) {
        e.message = `Failed to perform sync using repo ${opts.repo.owner}/${opts.repo.repo}: ${e.message}`;
        logger.error(e.message);
    } finally {
        try {
            await context.lifecycle.dispose();
        } catch (e) {
            logger.warn(`Failed to clean up sync repo: ${e.message}`);
        }
    }
    return;
}

/**
 * Return a function that ensures all specs in `syncRepo` have
 * corresponding resources in the Kubernetes cluster.  If the resource
 * does not exist, it is created using the spec.  If it does exist, it
 * is patched using the spec.  Errors are collected and thrown after
 * processing all specs so one bad spec does not stop processing.
 *
 * @param opts Kubernetes sync options
 */
function syncApply(opts: KubernetesSyncOptions): (p: GitProject) => Promise<void> {
    return async syncRepo => {
        const specFiles = await sortSpecs(syncRepo);
        const errors: Error[] = [];
        for (const specFile of specFiles) {
            logger.debug(`Processing spec ${specFile.path}`);
            try {
                let spec = await parseKubernetesSpecFile(specFile);
                if (spec.kind === "Secret" && opts && opts.secretKey) {
                    spec = await decryptSecret(spec, opts.secretKey);
                }
                await applySpec(spec);
            } catch (e) {
                e.message = `Failed to apply '${specFile.path}': ${errMsg(e)}`;
                logger.error(e.message);
                errors.push(e);
            }
        }
        if (errors.length > 0) {
            errors[0].message = `There were errors during repo sync: ${errors.map(e => e.message).join("; ")}`;
            throw errors[0];
        }
        return;
    };
}

/**
 * Consume stream of files from project and sort them by their `path`
 * property using `localeCompare`.  Any file at the root of the
 * project, i.e., not in a subdirectory, having the extensions
 * ".json", ".yaml", or ".yml` are considered specs.
 *
 * Essentially, this function converts a FileStream into a Promise of
 * sorted ProjectFiles.
 *
 * @param syncRepo Repository of specs to sort
 * @return Sorted array of specs in project
 */
export function sortSpecs(syncRepo: GitProject): Promise<ProjectFile[]> {
    return new Promise<ProjectFile[]>((resolve, reject) => {
        const specsStream = syncRepo.streamFiles(k8sSpecGlob);
        const specs: ProjectFile[] = [];
        specsStream.on("data", f => specs.push(f));
        specsStream.on("error", reject);
        specsStream.on("end", () => resolve(specs.sort((a, b) => a.path.localeCompare(b.path))));
    });
}
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

import * as k8s from "@kubernetes/client-node";

/* tslint:disable */
// see https://github.com/kubernetes-client/javascript/issues/19
async function patchWithHeaders(api: any, patcher: any, ...args: any[]) {
    const oldDefaultHeaders = api.defaultHeaders;
    api.defaultHeaders = {
        ...api.defaultHeaders,
        "Content-Type": "application/strategic-merge-patch+json",
    };
    const returnValue = await patcher.apply(api, args as any);
    api.defaultHeaders = oldDefaultHeaders;
    return returnValue;
}

class Core_v1Api_Patch extends k8s.Core_v1Api {
    patchNamespacedSecret(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedSecret, args);
    }
    patchNamespacedService(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedService, args);
    }
    patchNamespacedServiceAccount(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedServiceAccount, args);
    }
}

class Apps_v1Api_Patch extends k8s.Apps_v1Api {
    patchNamespacedDeployment(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedDeployment, args);
    }
}

class Extensions_v1beta1Api_Patch extends k8s.Extensions_v1beta1Api {
    patchNamespacedIngress(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedIngress, args);
    }
}

class RbacAuthorization_v1Api_Patch extends k8s.RbacAuthorization_v1Api {
    patchClusterRole(...args: any[]) {
        return patchWithHeaders(this, super.patchClusterRole, args);
    }
    patchNamespacedRole(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedRole, args);
    }
    patchClusterRoleBinding(...args: any[]) {
        return patchWithHeaders(this, super.patchClusterRoleBinding, args);
    }
    patchNamespacedRoleBinding(...args: any[]) {
        return patchWithHeaders(this, super.patchNamespacedRoleBinding, args);
    }
}
/* tslint:enable */

/**
 * Kubernetes API clients used to create/update/delete application
 * resources.
 */
export interface KubernetesClients {
    /** Kubernetes Core client */
    // core: k8s.Core_v1Api;
    /** Kubernetes Apps client */
    // apps: k8s.Apps_v1Api;
    /** Kubernetes Extension client */
    // ext: k8s.Extensions_v1beta1Api;
    /** Kubernetes RBAC client */
    // rbac: k8s.RbacAuthorization_v1Api;

    /** Kubernetes Core client with patch headers */
    core: Core_v1Api_Patch;
    /** Kubernetes Apps client with patch headers */
    apps: Apps_v1Api_Patch;
    /** Kubernetes Extension client with patch headers */
    ext: Extensions_v1beta1Api_Patch;
    /** Kubernetes RBAC client with patch headers */
    rbac: RbacAuthorization_v1Api_Patch;
}

/**
 * Create the KubernetesClients structure.
 */
export function makeApiClients(kc: k8s.KubeConfig): KubernetesClients {
    const core = kc.makeApiClient(k8s.Core_v1Api);
    const apps = kc.makeApiClient(k8s.Apps_v1Api); // GA in Kubernetes 1.9
    const rbac = kc.makeApiClient(k8s.RbacAuthorization_v1Api); // GA in Kubernetes 1.8
    const ext = kc.makeApiClient(k8s.Extensions_v1beta1Api);
    return { core, apps, rbac, ext };
}

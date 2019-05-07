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

import { logger } from "@atomist/automation-client";
import * as k8s from "@kubernetes/client-node";
import * as stringify from "json-stringify-safe";
import { makeApiClients } from "./clients";
import { loadKubeConfig } from "./config";
import {
    deleteDeployment,
    upsertDeployment,
} from "./deployment";
import {
    deleteIngress,
    upsertIngress,
} from "./ingress";
import { upsertNamespace } from "./namespace";
import {
    deleteRbac,
    upsertRbac,
} from "./rbac";
import {
    KubernetesApplication,
    KubernetesDelete,
} from "./request";
import {
    deleteSecrets,
    upsertSecrets,
} from "./secret";
import {
    deleteService,
    upsertService,
} from "./service";

/**
 * Create or update all the resources for an application in a
 * Kubernetes cluster if it does not exist.
 *
 * @param app Kubernetes application creation request
 * @param sdmFulfiller The registered name of the SDM fulfilling the deployment goal.
 * @return an array of all the resources upserted
 */
export async function upsertApplication(app: KubernetesApplication, sdmFulfiller: string): Promise<k8s.KubernetesObject[]> {
    let config: k8s.KubeConfig;
    try {
        config = loadKubeConfig();
    } catch (e) {
        e.message = `Failed to load Kubernetes config to deploy ${app.ns}/${app.name}: ${e.message}`;
        logger.error(e.message);
        throw e;
    }
    const clients = makeApiClients(config);
    const req = { ...app, sdmFulfiller, clients };

    try {
        const k8sResources: k8s.KubernetesObject[] = [];
        const nsResult = await upsertNamespace(req);
        k8sResources.push(nsResult.body);
        const rbacResult = await upsertRbac(req);
        k8sResources.push(...Object.values<{ body: k8s.KubernetesObject }>(rbacResult as any).filter(r => !!r).map(r => r.body));
        const svcResult = await upsertService(req);
        k8sResources.push(svcResult.body);
        const secResult = await upsertSecrets(req);
        k8sResources.push(...secResult.map(s => s.body));
        const depResult = await upsertDeployment(req);
        k8sResources.push(depResult.body);
        const ingResult = await upsertIngress(req);
        k8sResources.push(ingResult.body);
        return k8sResources.filter(r => !!r);
    } catch (e) {
        e.message = `Failed to upsert '${reqString(req)}': ${e.message}`;
        logger.error(e.message);
        throw e;
    }
}

/**
 * Delete an application from a kubernetes cluster.  If any resource
 * requested to be deleted does not exist, it is logged but no error
 * is returned.
 *
 * @param req delete application request object
 * @return array of deleted objects
 */
export async function deleteApplication(del: KubernetesDelete): Promise<k8s.KubernetesObject[]> {
    const slug = `${del.ns}/${del.name}`;
    let config: k8s.KubeConfig;
    try {
        config = loadKubeConfig();
    } catch (e) {
        e.message(`Failed to load Kubernetes config to delete ${slug}: ${e.message}`);
        logger.error(e.message);
        throw e;
    }
    const clients = makeApiClients(config);
    const req = { ...del, clients };

    const deleted: k8s.KubernetesObject[] = [];
    const errs: Error[] = [];
    try {
        deleted.push(await deleteIngress(req));
    } catch (e) {
        e.message = `Failed to delete ingress ${slug}: ${e.message}`;
        errs.push(e);
    }
    try {
        deleted.push(await deleteDeployment(req));
    } catch (e) {
        e.message = `Failed to delete deployment ${slug}: ${e.message}`;
        errs.push(e);
    }
    try {
        deleted.push(...(await deleteSecrets(req)));
    } catch (e) {
        e.message = `Failed to delete secrets of ${slug}: ${e.message}`;
        errs.push(e);
    }
    try {
        deleted.push(await deleteService(req));
    } catch (e) {
        e.message = `Failed to delete service ${slug}: ${e.message}`;
        errs.push(e);
    }
    try {
        deleted.push(...(await deleteRbac(req)));
    } catch (e) {
        e.message = `Failed to delete RBAC resources for ${slug}: ${e.message}`;
        errs.push(e);
    }
    if (errs.length > 0) {
        const msg = `Failed to delete application '${reqString(req)}': ${errs.map(e => e.message).join("; ")}`;
        logger.error(msg);
        throw new Error(msg);
    }
    return deleted.filter(d => !!d);
}

/** Stringify filter for a Kubernetes request object. */
export function reqFilter<T>(k: string, v: T): T | undefined {
    if (k === "config" || k === "clients" || k === "secrets") {
        return undefined;
    } else if (typeof v === "string" && v === "[Circular ~]") {
        return undefined;
    }
    return v;
}

/** Stringify a Kubernetes request object. */
export function reqString(req: any): string {
    return stringify(req, reqFilter);
}

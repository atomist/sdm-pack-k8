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
    configurationValue,
    GitProject,
    guid,
    logger,
    Project,
    ProjectFile,
    projectUtils,
    RemoteRepoRef,
} from "@atomist/automation-client";
import {
    CachingProjectLoader,
    ProjectLoader,
    ProjectLoadingParameters,
} from "@atomist/sdm";
import * as k8s from "@kubernetes/client-node";
import * as yaml from "js-yaml";
import * as stringify from "json-stringify-safe";
import { DeepPartial } from "ts-essentials";
import { SyncOptions } from "../config";
import { parseKubernetesSpecFile } from "../deploy/spec";
import {
    appName,
    KubernetesDelete,
} from "../kubernetes/request";
import { cloneOptions } from "./clone";
import { k8sSpecGlob } from "./diff";
import { commitTag } from "./tag";

export type SyncAction = "upsert" | "delete";

/**
 * Synchronize changes from deploying app to the configured syncRepo.
 * If no syncRepo is configured, do nothing.
 *
 * @param app Kubernetes application change that triggered the sync
 * @param resources Kubernetes resource objects to synchronize
 * @param action Action performed, "upsert" or "delete"
 */
export async function syncApplication(app: KubernetesDelete, resources: k8s.KubernetesObject[], action: SyncAction = "upsert"): Promise<void> {
    const slug = appName(app);
    const syncOptions: SyncOptions = configurationValue("sdm.k8s.options.sync", undefined);
    if (!syncOptions || !syncOptions.repo) {
        return;
    }
    const syncRepo = syncOptions.repo as RemoteRepoRef;
    if (resources.length < 1) {
        return;
    }
    const projectLoadingParameters: ProjectLoadingParameters = {
        credentials: syncOptions.credentials,
        cloneOptions,
        id: syncRepo,
        readOnly: false,
    };
    const projectLoader: ProjectLoader = configurationValue("sdm.projectLoader", new CachingProjectLoader());
    try {
        await projectLoader.doWithProject(projectLoadingParameters, syncResources(app, resources, action));
    } catch (e) {
        e.message = `Failed to perform sync resources from ${slug} to sync repo ${syncRepo.owner}/${syncRepo.repo}: ${e.message}`;
        logger.error(e.message);
        throw e;
    }
    return;
}

export interface ProjectFileSpec {
    file: ProjectFile;
    spec: DeepPartial<k8s.KubernetesObject>;
}

/**
 * Update the sync repo with the upserted resources from a
 * KubernetesApplication.  For each upserted resource in `resources`,
 * loop through all the existing Kubernetes spec files, i.e., those
 * that match [[k8sSpecGlob]], to see if the apiVersion, kind, name,
 * and namespace, which may be undefined, match.  If a match is found,
 * update that spec file.  If no match is found, create a unique file
 * name and store the resource spec in it.  If changes are made,
 * commit and push the changes.
 *
 * @param app Kubernetes application object
 * @param resources Resources that were upserted as part of this application
 * @param action Action performed, "upsert" or "delete"
 * @return Function that updates the sync repo with the resource specs
 */
export function syncResources(app: KubernetesDelete, resources: k8s.KubernetesObject[], action: SyncAction): (p: GitProject) => Promise<void> {
    return async syncProject => {
        const specs: ProjectFileSpec[] = [];
        await projectUtils.doWithFiles(syncProject, k8sSpecGlob, async file => {
            try {
                const spec = await parseKubernetesSpecFile(file);
                specs.push({ file, spec });
            } catch (e) {
                logger.warn(`Failed to process sync repo spec ${file.path}, ignoring: ${e.message}`);
            }
        });
        const [syncAction, syncVerb] = (action === "delete") ? [resourceDeleted, "Delete"] : [resourceUpserted, "Update"];
        for (const resource of resources) {
            const fileSpec = matchSpec(resource, specs);
            await syncAction(resource, syncProject, fileSpec);
        }
        if (await syncProject.isClean()) {
            return;
        }
        try {
            await syncProject.commit(`${syncVerb} specs for ${appName(app)}\n\n[atomist:generated] ${commitTag()}\n`);
            await syncProject.push();
        } catch (e) {
            e.message = `Failed to commit and push resource changes to sync repo: ${e.message}`;
            logger.error(e.message);
            throw e;
        }
    };
}

/**
 * Persist the upsert of a resource to the sync repo project.
 *
 * @param resource Kubernetes resource that was upserted
 * @param p Sync repo project
 * @param fs File and spec object that matches resource, may be undefined
 */
async function resourceUpserted(resource: k8s.KubernetesObject, p: Project, fs: ProjectFileSpec): Promise<void> {
    if (fs) {
        const specString = (/\.ya?ml$/.test(fs.file.path)) ? yaml.safeDump(resource) : stringifySpec(resource);
        await fs.file.setContent(specString);
    } else {
        const specRoot = specFileBasename(resource);
        const specExt = ".json";
        let specPath = specRoot + specExt;
        while (await p.getFile(specPath)) {
            specPath = specRoot + "-" + guid().split("-")[0] + specExt;
        }
        await p.addFile(specPath, stringifySpec(resource));
    }
}

/**
 * Persist the deletion of a resource to the sync repo project.
 *
 * @param resource Kubernetes resource that was upserted
 * @param p Sync repo project
 * @param fs File and spec object that matches resource, may be undefined
 */
async function resourceDeleted(resource: k8s.KubernetesObject, p: Project, fs: ProjectFileSpec): Promise<void> {
    if (fs) {
        await p.deleteFile(fs.file.path);
    }
}

/**
 * Search `fileSpecs` for a spec that matches `spec`.  To be
 * considered a match, the apiVersion, kind, name, and namespace,
 * which may be undefined, must match.
 *
 * @param spec Kubernetes object spec to match
 * @param fileSpecs Array of spec and file objects to search
 * @return First file and spec object to match spec
 */
export function matchSpec(spec: k8s.KubernetesObject, fileSpecs: ProjectFileSpec[]): ProjectFileSpec | undefined {
    return fileSpecs.find(fs => spec.apiVersion === fs.spec.apiVersion &&
        spec.kind === fs.spec.kind &&
        spec.metadata.name === fs.spec.metadata.name &&
        spec.metadata.namespace === fs.spec.metadata.namespace);
}

/**
 * Create a suitable basename for the spec file for `resource`.  The
 * form of the file name is "NAMESPACE-NAME-KIND", where "NAMESPACE-"
 * is omitted if resource is not namespaced,, the kind is converted
 * from PascalCase to kebab-case, and the whole name is lowercased.
 *
 * @param resource Kubernetes resource spec
 * @return Base file name for resource spec
 */
export function specFileBasename(resource: k8s.KubernetesObject): string {
    const ns = (resource.metadata.namespace) ? `${resource.metadata.namespace}-` : "";
    return `${ns}${resource.metadata.name}-${resource.kind.replace(/([a-z])([A-Z])/g, "$1-$2")}`.toLowerCase();
}

function stringifySpec(resource: k8s.KubernetesObject): string {
    return stringify(resource, undefined, 2) + "\n";
}
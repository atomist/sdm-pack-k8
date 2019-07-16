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

/* tslint:disable:max-file-line-count */

import {
    GitProject,
    InMemoryProject,
    InMemoryProjectFile,
    projectUtils,
} from "@atomist/automation-client";
import * as yaml from "js-yaml";
import * as assert from "power-assert";
import { KubernetesApplication } from "../../lib/kubernetes/request";
import {
    matchSpec,
    ProjectFileSpec,
    specFileBasename,
    syncResources,
} from "../../lib/sync/application";
import { k8sSpecGlob } from "../../lib/sync/diff";

describe("sync/application", () => {

    describe("matchSpec", () => {

        it("should find nothing", () => {
            const sss = [
                [],
                [
                    {
                        file: new InMemoryProjectFile("svc.json", "{}"),
                        spec: {
                            apiVersion: "v1",
                            kind: "Service",
                            metadata: {
                                name: "lyle",
                                namespace: "lovett",
                            },
                        },
                    },
                    {
                        file: new InMemoryProjectFile("jondep.json", "{}"),
                        spec: {
                            apiVersion: "apps/v1",
                            kind: "Deployment",
                            metadata: {
                                name: "jon",
                                namespace: "lovett",
                            },
                        },
                    },
                    {
                        file: new InMemoryProjectFile("dep.json", "{}"),
                        spec: {
                            apiVersion: "apps/v1",
                            kind: "Deployment",
                            metadata: {
                                name: "lyle",
                                namespace: "alzado",
                            },
                        },
                    },
                    {
                        file: new InMemoryProjectFile("beta-dep.json", "{}"),
                        spec: {
                            apiVersion: "extensions/v1beta1",
                            kind: "Deployment",
                            metadata: {
                                name: "lyle",
                                namespace: "lovett",
                            },
                        },
                    },
                ],
            ];
            sss.forEach(ss => {
                const s = {
                    apiVersion: "apps/v1",
                    kind: "Deployment",
                    metadata: {
                        name: "lyle",
                        namespace: "lovett",
                    },
                };
                const m = matchSpec(s, ss);
                assert(m === undefined);
            });
        });

        it("should find the file spec", () => {
            const s = {
                apiVersion: "v1",
                kind: "Deployment",
                metadata: {
                    name: "lyle",
                    namespace: "lovett",
                },
            };
            const ss: ProjectFileSpec[] = [
                {
                    file: new InMemoryProjectFile("dep.json", "{}"),
                    spec: {
                        apiVersion: "v1",
                        kind: "Deployment",
                        metadata: {
                            name: "lyle",
                            namespace: "lovett",
                        },
                    },
                },
            ];
            const m = matchSpec(s, ss);
            assert.deepStrictEqual(m, ss[0]);
        });

        it("should find the right file spec among several", () => {
            const s = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: "lyle",
                    namespace: "lovett",
                },
            };
            const ss: ProjectFileSpec[] = [
                {
                    file: new InMemoryProjectFile("svc.json", "{}"),
                    spec: {
                        apiVersion: "v1",
                        kind: "Service",
                        metadata: {
                            name: "lyle",
                            namespace: "lovett",
                        },
                    },
                },
                {
                    file: new InMemoryProjectFile("jondep.json", "{}"),
                    spec: {
                        apiVersion: "apps/v1",
                        kind: "Deployment",
                        metadata: {
                            name: "jon",
                            namespace: "lovett",
                        },
                    },
                },
                {
                    file: new InMemoryProjectFile("dep.json", "{}"),
                    spec: {
                        apiVersion: "apps/v1",
                        kind: "Deployment",
                        metadata: {
                            name: "lyle",
                            namespace: "lovett",
                        },
                    },
                },
                {
                    file: new InMemoryProjectFile("beta-dep.json", "{}"),
                    spec: {
                        apiVersion: "extensions/v1beta1",
                        kind: "Deployment",
                        metadata: {
                            name: "lyle",
                            namespace: "lovett",
                        },
                    },
                },
            ];
            const m = matchSpec(s, ss);
            assert.deepStrictEqual(m, ss[2]);
        });

    });

    describe("specFileBasename", () => {

        it("should create a namespace file name", () => {
            const o = {
                apiVersion: "v1",
                kind: "Namespace",
                metadata: {
                    name: "lyle",
                },
            };
            const s = specFileBasename(o);
            assert(s === "10_lyle_namespace");
        });

        it("should create a simple namespaced file name", () => {
            [
                { a: "apps/v1", k: "Deployment", p: "70" },
                { a: "extensions/v1beta1", k: "Ingress", p: "80" },
                { a: "rbac.authorization.k8s.io/v1", k: "Role", p: "25" },
                { a: "v1", k: "Secret", p: "60" },
                { a: "v1", k: "Service", p: "50" },
            ].forEach(r => {
                const o = {
                    apiVersion: r.a,
                    kind: r.k,
                    metadata: {
                        name: "lyle",
                        namespace: "lovett",
                    },
                };
                const s = specFileBasename(o);
                const e = r.p + "_lovett_lyle_" + r.k.toLowerCase();
                assert(s === e);
            });
        });

        it("should create a kebab-case namespaced file name", () => {
            [
                { a: "v1", k: "ServiceAccount", l: "service-account", p: "20" },
                { a: "rbac.authorization.k8s.io/v1", k: "RoleBinding", l: "role-binding", p: "30" },
                { a: "apps/v1", k: "DaemonSet", l: "daemon-set", p: "70" },
                { a: "networking.k8s.io/v1", k: "NetworkPolicy", l: "network-policy", p: "40" },
                { a: "v1", k: "PersistentVolumeClaim", l: "persistent-volume-claim", p: "40" },
                { a: "extensions/v1beta1", k: "PodSecurityPolicy", l: "pod-security-policy", p: "40" },
                { a: "policy/v1beta1", k: "HorizontalPodAutoscaler", l: "horizontal-pod-autoscaler", p: "80" },
                { a: "policy/v1beta1", k: "PodDisruptionBudget", l: "pod-disruption-budget", p: "80" },
            ].forEach(r => {
                const o = {
                    apiVersion: r.a,
                    kind: r.k,
                    metadata: {
                        name: "lyle",
                        namespace: "lovett",
                    },
                };
                const s = specFileBasename(o);
                const e = r.p + "_lovett_lyle_" + r.l;
                assert(s === e);
            });
        });

        it("should create a kebab-case cluster file name", () => {
            [
                { a: "v1", k: "PersistentVolume", l: "persistent-volume", p: "15" },
                { a: "storage.k8s.io/v1", k: "StorageClass", l: "storage-class", p: "15" },
                { a: "rbac.authorization.k8s.io/v1", k: "ClusterRole", l: "cluster-role", p: "25" },
                { a: "rbac.authorization.k8s.io/v1", k: "ClusterRoleBinding", l: "cluster-role-binding", p: "30" },
            ].forEach(r => {
                const o = {
                    apiVersion: r.a,
                    kind: r.k,
                    metadata: {
                        name: "lyle",
                    },
                };
                const s = specFileBasename(o);
                const e = r.p + "_lyle_" + r.l;
                assert(s === e);
            });
        });

    });

    describe("syncResources", () => {

        it("should create spec files", async () => {
            const p: GitProject = InMemoryProject.of() as any;
            p.isClean = async () => false;
            let commitMessage: string;
            p.commit = async msg => { commitMessage = msg; return p; };
            let pushed = false;
            p.push = async msg => { pushed = true; return p; };
            const a: KubernetesApplication = {
                name: "tonina",
                ns: "black-angel",
            } as any;
            const rs = [
                {
                    apiVersion: "apps/v1",
                    kind: "Deployment",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "Service",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "ServiceAccount",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "Secret",
                    type: "Opaque",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                    data: {
                        Track01: "w4FyYm9sIERlIExhIFZpZGE=",
                        Track02: "Q2FseXBzbyBCbHVlcw==",
                    },
                },
            ];
            const o = {
                repo: {
                    owner: "tonina",
                    repo: "black-angel",
                    url: "https://github.com/tonina/black-angel",
                },
            };
            await syncResources(a, rs, "upsert", o)(p);
            const eCommitMessage = `Update specs for black-angel/tonina

[atomist:generated] [atomist:sync-commit=@atomist/sdm-pack-k8s]
`;
            assert(commitMessage === eCommitMessage);
            assert(pushed, "commit was not pushed");
            assert(await p.totalFileCount() === 4);
            assert(p.fileExistsSync("70_black-angel_tonina_deployment.json"));
            assert(p.fileExistsSync("50_black-angel_tonina_service.json"));
            assert(p.fileExistsSync("20_black-angel_tonina_service-account.json"));
            assert(p.fileExistsSync("60_black-angel_tonina_secret.json"));
            const d = await (await p.getFile("70_black-angel_tonina_deployment.json")).getContent();
            const de = `{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "tonina",
    "namespace": "black-angel"
  }
}
`;
            assert(d === de);
            const s = await (await p.getFile("60_black-angel_tonina_secret.json")).getContent();
            const se = `{
  "apiVersion": "v1",
  "data": {
    "Track01": "w4FyYm9sIERlIExhIFZpZGE=",
    "Track02": "Q2FseXBzbyBCbHVlcw=="
  },
  "kind": "Secret",
  "metadata": {
    "name": "tonina",
    "namespace": "black-angel"
  },
  "type": "Opaque"
}
`;
            assert(s === se);
        });

        it("should update spec files and avoid conflicts", async () => {
            const depJson = JSON.stringify({
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: "tonina",
                    namespace: "black-angel",
                },
            });
            const saYaml = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: tonina
  namespace: black-angel
`;
            const p: GitProject = InMemoryProject.of(
                { path: "70_black-angel_tonina_deployment.json", content: depJson },
                { path: "50_black-angel_tonina_service.json", content: "{}\n" },
                { path: "19+black-angel+tonina+service-acct.yaml", content: saYaml },
            ) as any;
            p.isClean = async () => false;
            let commitMessage: string;
            p.commit = async msg => { commitMessage = msg; return p; };
            let pushed = false;
            p.push = async msg => { pushed = true; return p; };
            const a: KubernetesApplication = {
                name: "tonina",
                ns: "black-angel",
            } as any;
            const rs = [
                {
                    apiVersion: "apps/v1",
                    kind: "Deployment",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                        labels: {
                            "atomist.com/workspaceId": "T0N1N4",
                        },
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "Service",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "extensions/v1beta1",
                    kind: "Ingress",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "ServiceAccount",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                        labels: {
                            "atomist.com/workspaceId": "T0N1N4",
                        },
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "Secret",
                    type: "Opaque",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                    data: {
                        Track01: "w4FyYm9sIERlIExhIFZpZGE=",
                        Track02: "Q2FseXBzbyBCbHVlcw==",
                    },
                },
            ];
            const o = {
                repo: {
                    owner: "tonina",
                    repo: "black-angel",
                    url: "https://github.com/tonina/black-angel",
                },
                secretKey: "10. Historia De Un Amor (feat. Javier Limón & Tali Rubinstein)",
            };
            await syncResources(a, rs, "upsert", o)(p);
            const eCommitMessage = `Update specs for black-angel/tonina

[atomist:generated] [atomist:sync-commit=@atomist/sdm-pack-k8s]
`;
            assert(commitMessage === eCommitMessage);
            assert(pushed, "commit was not pushed");
            assert(await p.totalFileCount() === 6);
            assert(p.fileExistsSync("70_black-angel_tonina_deployment.json"));
            assert(p.fileExistsSync("50_black-angel_tonina_service.json"));
            assert(p.fileExistsSync("80_black-angel_tonina_ingress.json"));
            assert(p.fileExistsSync("19+black-angel+tonina+service-acct.yaml"));
            const dep = JSON.parse(await p.getFile("70_black-angel_tonina_deployment.json").then(f => f.getContent()));
            assert.deepStrictEqual(dep, rs[0]);
            const s = await p.getFile("50_black-angel_tonina_service.json").then(f => f.getContent());
            assert(s === "{}\n");
            const sa = await p.getFile("19+black-angel+tonina+service-acct.yaml").then(f => f.getContent());
            assert(sa === yaml.safeDump(rs[3], { sortKeys: true }));
            let foundServiceSpec = false;
            await projectUtils.doWithFiles(p, k8sSpecGlob, async f => {
                if (/^50_black-angel_tonina_service_[a-f0-9]+\.json$/.test(f.path)) {
                    const c = await f.getContent();
                    const sv = JSON.parse(c);
                    assert.deepStrictEqual(sv, rs[1]);
                    foundServiceSpec = true;
                }
            });
            assert(foundServiceSpec, "failed to find new service spec");
            const sec = JSON.parse(await p.getFile("60_black-angel_tonina_secret.json").then(f => f.getContent()));
            const sece = {
                apiVersion: "v1",
                kind: "Secret",
                type: "Opaque",
                metadata: {
                    name: "tonina",
                    namespace: "black-angel",
                },
                data: {
                    Track01: "pIVq/+dRdfzQk4QRFkcwneZwzyAl3RBJTLI5WvAqdLg=",
                    Track02: "ArfFf8S0cHOycteqW6w/hGU7dIUuRBsbnUXSJ+yK7BI=",
                },
            };
            assert.deepStrictEqual(sec, sece);
        });

        it("should delete spec files", async () => {
            const depJson = JSON.stringify({
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: "tonina",
                    namespace: "black-angel",
                },
            });
            const saYaml = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: tonina
  namespace: black-angel
`;
            const svcJson = JSON.stringify({
                apiVersion: "v1",
                kind: "Service",
                metadata: {
                    name: "tonina",
                    namespace: "black-angel",
                },
            });
            const p: GitProject = InMemoryProject.of(
                { path: "black-angel~tonina~deployment.json", content: depJson },
                { path: "black-angel-tonina-service.json", content: "{}\n" },
                { path: "black-angel-tonina-service-acct.yaml", content: saYaml },
                { path: "black-angel-tonina-svc.json", content: svcJson },
            ) as any;
            p.isClean = async () => false;
            let commitMessage: string;
            p.commit = async msg => { commitMessage = msg; return p; };
            let pushed = false;
            p.push = async msg => { pushed = true; return p; };
            const a: KubernetesApplication = {
                name: "tonina",
                ns: "black-angel",
            } as any;
            const rs = [
                {
                    apiVersion: "apps/v1",
                    kind: "Deployment",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                        labels: {
                            "atomist.com/workspaceId": "T0N1N4",
                        },
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "Service",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "extensions/v1beta1",
                    kind: "Ingress",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                    },
                },
                {
                    apiVersion: "v1",
                    kind: "ServiceAccount",
                    metadata: {
                        name: "tonina",
                        namespace: "black-angel",
                        labels: {
                            "atomist.com/workspaceId": "T0N1N4",
                        },
                    },
                },
            ];
            const o = {
                repo: {
                    owner: "tonina",
                    repo: "black-angel",
                    url: "https://github.com/tonina/black-angel",
                },
            };
            await syncResources(a, rs, "delete", o)(p);
            const eCommitMessage = `Delete specs for black-angel/tonina

[atomist:generated] [atomist:sync-commit=@atomist/sdm-pack-k8s]
`;
            assert(commitMessage === eCommitMessage);
            assert(pushed, "commit was not pushed");
            assert(await p.totalFileCount() === 1);
            assert(!p.fileExistsSync("black-angel~tonina~deployment.json"));
            assert(p.fileExistsSync("black-angel-tonina-service.json"));
            assert(!p.fileExistsSync("black-angel-tonina-ingress.json"));
            assert(!p.fileExistsSync("black-angel-tonina-service-acct.yaml"));
            assert(!p.fileExistsSync("black-angel-tonina-svc.yaml"));
            const svc = await p.getFile("black-angel-tonina-service.json").then(f => f.getContent());
            assert(svc === "{}\n");
        });

    });

});

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

import * as assert from "power-assert";
import { deploymentTemplate } from "../../lib/kubernetes/deployment";

/* tslint:disable:max-file-line-count */

describe("kubernetes/deployment", () => {

    describe("deploymentTemplate", () => {

        it("should create a deployment spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                imagePullSecret: "comfort",
                port: 5510,
                sdmFulfiller: "EMI",
            };
            const d = await deploymentTemplate(r);
            assert(d.kind === "Deployment");
            assert(d.metadata.name === r.name);
            assert(d.metadata.namespace === r.ns);
            assert(d.metadata.labels["app.kubernetes.io/managed-by"] === r.sdmFulfiller);
            assert(d.metadata.labels["app.kubernetes.io/name"] === r.name);
            assert(d.metadata.labels["app.kubernetes.io/part-of"] === r.name);
            assert(d.metadata.labels["atomist.com/workspaceId"] === r.workspaceId);
            assert(d.spec.replicas === 1);
            assert(d.spec.selector.matchLabels["app.kubernetes.io/name"] === r.name);
            assert(d.spec.selector.matchLabels["atomist.com/workspaceId"] === r.workspaceId);
            assert(d.spec.template.metadata.annotations["atomist.com/k8vent"] ===
                `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/KAT3BU5H"]}`);
            assert(d.spec.template.metadata.labels["app.kubernetes.io/name"] === r.name);
            assert(d.spec.template.metadata.labels["app.kubernetes.io/part-of"] === r.name);
            assert(d.spec.template.metadata.labels["app.kubernetes.io/managed-by"] === r.sdmFulfiller);
            assert(d.spec.template.metadata.labels["atomist.com/workspaceId"] === r.workspaceId);
            assert(d.spec.template.metadata.name === r.name);
            assert(d.spec.template.spec.containers.length === 1);
            assert(d.spec.template.spec.containers[0].name === r.name);
            assert(d.spec.template.spec.containers[0].image === r.image);
            assert(d.spec.template.spec.containers[0].ports.length === 1);
            assert(d.spec.template.spec.containers[0].ports[0].name === "http");
            assert(d.spec.template.spec.containers[0].ports[0].containerPort === r.port);
            assert(d.spec.template.spec.containers[0].ports[0].protocol === "TCP");
            assert(d.spec.template.spec.containers[0].readinessProbe.httpGet.path === "/");
            assert(d.spec.template.spec.containers[0].readinessProbe.httpGet.port === "http");
            assert(d.spec.template.spec.containers[0].readinessProbe.httpGet.scheme === "HTTP");
            assert(d.spec.template.spec.containers[0].readinessProbe.initialDelaySeconds === 30);
            assert(d.spec.template.spec.containers[0].readinessProbe.timeoutSeconds === 3);
            assert(d.spec.template.spec.containers[0].readinessProbe.periodSeconds === 10);
            assert(d.spec.template.spec.containers[0].readinessProbe.successThreshold === 1);
            assert(d.spec.template.spec.containers[0].readinessProbe.failureThreshold === 3);
            assert(d.spec.template.spec.containers[0].livenessProbe.httpGet.path === "/");
            assert(d.spec.template.spec.containers[0].livenessProbe.httpGet.port === "http");
            assert(d.spec.template.spec.containers[0].livenessProbe.httpGet.scheme === "HTTP");
            assert(d.spec.template.spec.containers[0].livenessProbe.initialDelaySeconds === 30);
            assert(d.spec.template.spec.containers[0].livenessProbe.timeoutSeconds === 3);
            assert(d.spec.template.spec.containers[0].livenessProbe.periodSeconds === 10);
            assert(d.spec.template.spec.containers[0].livenessProbe.successThreshold === 1);
            assert(d.spec.template.spec.containers[0].livenessProbe.failureThreshold === 3);
            assert(d.spec.template.spec.imagePullSecrets[0].name === r.imagePullSecret);
        });

        it("should create a custom deployment spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                imagePullSecret: "comfort",
                port: 5510,
                sdmFulfiller: "EMI",
                deploymentSpec: {
                    spec: {
                        replicas: 2,
                        restartPolicy: "Never",
                        revisionHistoryLimit: 5,
                        template: {
                            spec: {
                                containers: [
                                    { imagePullPolicy: "Always" },
                                ],
                                dnsPolicy: "ClusterFirstWithHostNet",
                            },
                        },
                    },
                },
                replicas: 12,
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 2,
                    restartPolicy: "Never",
                    revisionHistoryLimit: 5,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    imagePullPolicy: "Always",
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                    readinessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    livenessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    ports: [
                                        {
                                            name: "http",
                                            containerPort: r.port,
                                            protocol: "TCP",
                                        },
                                    ],
                                },
                            ],
                            dnsPolicy: "ClusterFirstWithHostNet",
                            imagePullSecrets: [
                                {
                                    name: r.imagePullSecret,
                                },
                            ],
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

        it("should fix API version and kind in provided spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                imagePullSecret: "comfort",
                port: 5510,
                sdmFulfiller: "EMI",
                deploymentSpec: {
                    apiVersion: "extensions/v1beta1",
                    kind: "Deploy",
                },
                replicas: 12,
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 12,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                    readinessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    livenessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    ports: [
                                        {
                                            name: "http",
                                            containerPort: r.port,
                                            protocol: "TCP",
                                        },
                                    ],
                                },
                            ],
                            imagePullSecrets: [
                                {
                                    name: r.imagePullSecret,
                                },
                            ],
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

        it("should create a deployment spec with zero replicas", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                imagePullSecret: "comfort",
                port: 5510,
                replicas: 0,
                sdmFulfiller: "EMI",
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 0,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                    readinessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    livenessProbe: {
                                        httpGet: {
                                            path: "/",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                        initialDelaySeconds: 30,
                                        timeoutSeconds: 3,
                                        periodSeconds: 10,
                                        successThreshold: 1,
                                        failureThreshold: 3,
                                    },
                                    ports: [
                                        {
                                            name: "http",
                                            containerPort: r.port,
                                            protocol: "TCP",
                                        },
                                    ],
                                },
                            ],
                            imagePullSecrets: [
                                {
                                    name: r.imagePullSecret,
                                },
                            ],
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

        it("should create a deployment spec with custom replicas", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                replicas: 12,
                sdmFulfiller: "EMI",
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 12,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

        it("should create a deployment spec with service account", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                roleSpec: {},
                sdmFulfiller: "EMI",
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 1,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                },
                            ],
                            serviceAccountName: r.name,
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

        it("should create a deployment spec using service account name", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                roleSpec: {
                    rules: [
                        {
                            apiGroups: [""],
                            resources: ["namespaces", "pods", "services"],
                            verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
                        },
                    ],
                },
                sdmFulfiller: "EMI",
                serviceAccountSpec: {
                    metadata: {
                        name: "peter-gabriel",
                    },
                },
            };
            const d = await deploymentTemplate(r);
            const e = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: {
                    name: r.name,
                    namespace: r.ns,
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    replicas: 1,
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/name": r.name,
                            "atomist.com/workspaceId": r.workspaceId,
                        },
                    },
                    template: {
                        metadata: {
                            name: r.name,
                            labels: {
                                "app.kubernetes.io/managed-by": r.sdmFulfiller,
                                "app.kubernetes.io/name": r.name,
                                "app.kubernetes.io/part-of": r.name,
                                "atomist.com/workspaceId": r.workspaceId,
                            },
                            annotations: {
                                "atomist.com/k8vent": `{"webhooks":["https://webhook.atomist.com/atomist/kube/teams/${r.workspaceId}"]}`,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: r.name,
                                    image: r.image,
                                    resources: {
                                        limits: {
                                            cpu: "1000m",
                                            memory: "384Mi",
                                        },
                                        requests: {
                                            cpu: "100m",
                                            memory: "320Mi",
                                        },
                                    },
                                },
                            ],
                            serviceAccountName: "peter-gabriel",
                        },
                    },
                    strategy: {
                        type: "RollingUpdate",
                        rollingUpdate: {
                            maxUnavailable: 0,
                            maxSurge: 1,
                        },
                    },
                },
            };
            assert.deepStrictEqual(d, e);
        });

    });

});

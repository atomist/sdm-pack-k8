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
import {
    ingressTemplate,
    upsertIngress,
} from "../../lib/kubernetes/ingress";
import { KubernetesResourceRequest } from "../../lib/kubernetes/request";

describe("kubernetes/ingress", () => {

    describe("ingressTemplate", () => {

        it("should create a wildcard ingress spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                path: "/bush/kate/hounds-of-love/cloudbusting",
                sdmFulfiller: "EMI",
            };
            const i = await ingressTemplate(r);
            const e = {
                apiVersion: "extensions/v1beta1",
                kind: "Ingress",
                metadata: {
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                },
                spec: {
                    rules: [
                        {
                            http: {
                                paths: [
                                    {
                                        backend: {
                                            serviceName: r.name,
                                            servicePort: "http",
                                        },
                                        path: r.path,
                                    },
                                ],
                            },
                        },
                    ],
                },
            };
            assert.deepStrictEqual(i, e);
        });

        it("should create a host ingress spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                path: "/bush/kate/hounds-of-love/cloudbusting",
                host: "emi.com",
                protocol: "https" as "https",
                sdmFulfiller: "EMI",
                tlsSecret: "emi-com",
            };
            const i = await ingressTemplate(r);
            const e = {
                apiVersion: "extensions/v1beta1",
                kind: "Ingress",
                metadata: {
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                },
                spec: {
                    rules: [
                        {
                            host: r.host,
                            http: {
                                paths: [
                                    {
                                        backend: {
                                            serviceName: r.name,
                                            servicePort: "http",
                                        },
                                        path: r.path,
                                    },
                                ],
                            },
                        },
                    ],
                    tls: [
                        {
                            hosts: [
                                "emi.com",
                            ],
                            secretName: "emi-com",
                        },
                    ],
                },
            };
            assert.deepStrictEqual(i, e);
        });

        it("should merge in provided ingress spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                path: "/bush/kate/hounds-of-love/cloudbusting",
                host: "emi.com",
                protocol: "https" as "https",
                sdmFulfiller: "EMI",
                tlsSecret: "emi-com",
                ingressSpec: {
                    metadata: {
                        annotations: {
                            "kubernetes.io/ingress.class": "nginx",
                            "nginx.ingress.kubernetes.io/client-body-buffer-size": "512k",
                            "nginx.ingress.kubernetes.io/limit-connections": "100",
                            "nginx.ingress.kubernetes.io/limit-rps": "25",
                            "nginx.ingress.kubernetes.io/rewrite-target": "/cb",
                        },
                    },
                } as any,
            };
            const s = await ingressTemplate(r);
            const e = {
                apiVersion: "extensions/v1beta1",
                kind: "Ingress",
                metadata: {
                    annotations: {
                        "kubernetes.io/ingress.class": "nginx",
                        "nginx.ingress.kubernetes.io/rewrite-target": "/cb",
                        "nginx.ingress.kubernetes.io/client-body-buffer-size": "512k",
                        "nginx.ingress.kubernetes.io/limit-connections": "100",
                        "nginx.ingress.kubernetes.io/limit-rps": "25",
                    },
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                },
                spec: {
                    rules: [
                        {
                            host: r.host,
                            http: {
                                paths: [
                                    {
                                        backend: {
                                            serviceName: r.name,
                                            servicePort: "http",
                                        },
                                        path: r.path,
                                    },
                                ],
                            },
                        },
                    ],
                    tls: [
                        {
                            hosts: [
                                "emi.com",
                            ],
                            secretName: "emi-com",
                        },
                    ],
                },
            };
            assert.deepStrictEqual(s, e);
        });

        it("should correct API version and kind in provided spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                path: "/bush/kate/hounds-of-love/cloudbusting",
                host: "emi.com",
                protocol: "https" as "https",
                sdmFulfiller: "EMI",
                tlsSecret: "emi-com",
                ingressSpec: {
                    apiVersion: "v1",
                    kind: "Egress",
                } as any,
            };
            const s = await ingressTemplate(r);
            const e = {
                apiVersion: "extensions/v1beta1",
                kind: "Ingress",
                metadata: {
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                },
                spec: {
                    rules: [
                        {
                            host: r.host,
                            http: {
                                paths: [
                                    {
                                        backend: {
                                            serviceName: r.name,
                                            servicePort: "http",
                                        },
                                        path: r.path,
                                    },
                                ],
                            },
                        },
                    ],
                    tls: [
                        {
                            hosts: [
                                "emi.com",
                            ],
                            secretName: "emi-com",
                        },
                    ],
                },
            };
            assert.deepStrictEqual(s, e);
        });

    });

    describe("upsertIngress", () => {

        it("should not do anything if port is not defined", async () => {
            const a: KubernetesResourceRequest = {
                name: "brotherhood",
                ns: "new-order",
                path: "blue-monday",
            } as any;
            const i = await upsertIngress(a);
            assert(i === undefined);
        });

        it("should not do anything if path is not defined", async () => {
            const a: KubernetesResourceRequest = {
                name: "brotherhood",
                ns: "new-order",
                port: 1986,
            } as any;
            const i = await upsertIngress(a);
            assert(i === undefined);
        });

    });

});

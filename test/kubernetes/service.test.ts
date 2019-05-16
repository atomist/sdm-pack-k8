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
import { KubernetesResourceRequest } from "../../lib/kubernetes/request";
import {
    serviceTemplate,
    upsertService,
} from "../../lib/kubernetes/service";

describe("kubernetes/service", () => {

    describe("serviceTemplate", () => {

        it("should create a service spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                sdmFulfiller: "EMI",
            };
            const s = await serviceTemplate(r);
            const e = {
                apiVersion: "v1",
                kind: "Service",
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
                    ports: [
                        {
                            name: "http",
                            port: 5510,
                            protocol: "TCP",
                            targetPort: "http",
                        },
                    ],
                    selector: {
                        "app.kubernetes.io/name": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    sessionAffinity: "None",
                    type: "NodePort",
                },
            };
            assert.deepStrictEqual(s, e);
        });

        it("should merge in provided service spec", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                sdmFulfiller: "EMI",
                serviceSpec: {
                    metadata: {
                        annotation: {
                            "music.com/genre": "Art Rock",
                        },
                        labels: {
                            "emi.com/producer": "Kate Bush",
                        },
                    },
                    spec: {
                        externalTrafficPolicy: "Local",
                        sessionAffinity: "ClusterIP",
                    },
                } as any,
            };
            const s = await serviceTemplate(r);
            const e = {
                apiVersion: "v1",
                kind: "Service",
                metadata: {
                    annotation: {
                        "music.com/genre": "Art Rock",
                    },
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                        "emi.com/producer": "Kate Bush",
                    },
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                },
                spec: {
                    externalTrafficPolicy: "Local",
                    ports: [
                        {
                            name: "http",
                            port: 5510,
                            protocol: "TCP",
                            targetPort: "http",
                        },
                    ],
                    selector: {
                        "app.kubernetes.io/name": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    sessionAffinity: "ClusterIP",
                    type: "NodePort",
                },
            };
            assert.deepStrictEqual(s, e);
        });

        it("should merge in service spec fixing API version and kind", async () => {
            const r = {
                workspaceId: "KAT3BU5H",
                ns: "hounds-of-love",
                name: "cloudbusting",
                image: "gcr.io/kate-bush/hounds-of-love/cloudbusting:5.5.10",
                port: 5510,
                sdmFulfiller: "EMI",
                serviceSpec: {
                    apiVersion: "extensions/v1beta1",
                    kind: "Sorvice",
                    metadata: {
                        annotation: {
                            "music.com/genre": "Art Rock",
                        },
                        labels: {
                            "emi.com/producer": "Kate Bush",
                        },
                    },
                    spec: {
                        externalTrafficPolicy: "Local",
                        sessionAffinity: "ClusterIP",
                    },
                } as any,
            };
            const s = await serviceTemplate(r);
            const e = {
                apiVersion: "v1",
                kind: "Service",
                metadata: {
                    annotation: {
                        "music.com/genre": "Art Rock",
                    },
                    labels: {
                        "app.kubernetes.io/managed-by": r.sdmFulfiller,
                        "app.kubernetes.io/name": r.name,
                        "app.kubernetes.io/part-of": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                        "emi.com/producer": "Kate Bush",
                    },
                    name: "cloudbusting",
                    namespace: "hounds-of-love",
                },
                spec: {
                    externalTrafficPolicy: "Local",
                    ports: [
                        {
                            name: "http",
                            port: 5510,
                            protocol: "TCP",
                            targetPort: "http",
                        },
                    ],
                    selector: {
                        "app.kubernetes.io/name": r.name,
                        "atomist.com/workspaceId": r.workspaceId,
                    },
                    sessionAffinity: "ClusterIP",
                    type: "NodePort",
                },
            };
            assert.deepStrictEqual(s, e);
        });

    });

    describe("upsertService", () => {

        it("should not do anything if port is not defined", async () => {
            const a: KubernetesResourceRequest = {
                name: "brotherhood",
                ns: "new-order",
            } as any;
            const i = await upsertService(a);
            assert(i === undefined);
        });

    });

});

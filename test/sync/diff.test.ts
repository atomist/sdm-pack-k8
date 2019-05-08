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

import { LocalProject } from "@atomist/automation-client";
import {
    execPromise,
    ProgressLog,
    PushFields,
} from "@atomist/sdm";
import * as assert from "power-assert";
import {
    diffPush,
    parseNameStatusDiff,
    PushDiff,
} from "../../lib/sync/diff";

describe("sync/diff", () => {

    describe("parseNameStatusDiff", () => {

        it("should safely parse nothing", () => {
            const s = "87c6ba8a3e2e3961d318fa8c50885b1ca0c4e1dc";
            ["", "\n", "\0", "\0\n"].forEach(d => {
                const c = parseNameStatusDiff(s, d);
                const e: PushDiff[] = [];
                assert.deepStrictEqual(c, e);
            });
        });

        it("should parse valid input", () => {
            const s = "87c6ba8a3e2e3961d318fa8c50885b1ca0c4e1dc";
            const ds = [
                "D a.yaml A aa.json D b.yml A d.json M e.json A fyml A i/j/k/l.json A s t.json M x.yaml ",
                "D a.yaml A aa.json D b.yml A d.json M e.json A fyml A i/j/k/l.json A s t.json M x.yaml \n",
            ];
            ds.forEach(d => {
                const c = parseNameStatusDiff(s, d);
                const e: PushDiff[] = [
                    { sha: s, change: "delete", path: "a.yaml" },
                    { sha: s, change: "delete", path: "b.yml" },
                    { sha: s, change: "apply", path: "aa.json" },
                    { sha: s, change: "apply", path: "d.json" },
                    { sha: s, change: "apply", path: "e.json" },
                    { sha: s, change: "apply", path: "s t.json" },
                    { sha: s, change: "apply", path: "x.yaml" },
                ];
                assert.deepStrictEqual(c, e);
            });
        });

        it("should sort the paths", () => {
            const s = "87c6ba8a3e2e3961d318fa8c50885b1ca0c4e1dc";
            const d = "D a.yaml A s t.json D b.yml A d.json M e.json A aa.json A i/j/k/l.json M x.yaml A f ";
            const c = parseNameStatusDiff(s, d);
            const e: PushDiff[] = [
                { sha: s, change: "delete", path: "a.yaml" },
                { sha: s, change: "delete", path: "b.yml" },
                { sha: s, change: "apply", path: "aa.json" },
                { sha: s, change: "apply", path: "d.json" },
                { sha: s, change: "apply", path: "e.json" },
                { sha: s, change: "apply", path: "s t.json" },
                { sha: s, change: "apply", path: "x.yaml" },
            ];
            assert.deepStrictEqual(c, e);
        });

    });

    describe("diffPush", () => {

        it("should run git diff and parse output", async () => {
            await execPromise("git", ["fetch", "--depth=5", "origin", "test-branch-do-not-delete"]);
            const p: LocalProject = {
                baseDir: process.cwd(),
            } as any;
            const push: PushFields.Fragment = {
                commits: [
                    {
                        sha: "958c655ef5b6436fbe5ae430a878ff14b75d39ce",
                        message: "Senseless changes to test diffPush",
                    },
                    {
                        sha: "7708d44678164ab41d35014c7743ab1fad877a22",
                        message: `Autofix: TypeScript header

[atomist:generated] [atomist:autofix=typescript_header]`,
                    },
                    {
                        sha: "af496fa1e04c3471a0ded9cc2e406bcdbfd528ee",
                        message: `Change package description

[atomist:generated] [atomist:commit:test]
`,
                    },
                    {
                        sha: "778197e3c3bd128ebd36a20f212bad2a9613ca15",
                        message: "Update, add, delete files, plus ignored changes",
                    },
                ],
            };
            const t = "[atomist:commit:test]";
            let logs: string = "";
            const l: ProgressLog = {
                write: (d: string) => logs += d,
            } as any;
            const c = await diffPush(p, push, t, l);
            const e = [
                { change: "delete", path: "package-lock.json", sha: "958c655ef5b6436fbe5ae430a878ff14b75d39ce" },
                { change: "apply", path: "test.json", sha: "958c655ef5b6436fbe5ae430a878ff14b75d39ce" },
                { change: "apply", path: "tslint.json", sha: "958c655ef5b6436fbe5ae430a878ff14b75d39ce" },
                { change: "apply", path: "package-lock.json", sha: "7708d44678164ab41d35014c7743ab1fad877a22" },
                { change: "delete", path: "package-lock.json", sha: "778197e3c3bd128ebd36a20f212bad2a9613ca15" },
                { change: "delete", path: "package.json", sha: "778197e3c3bd128ebd36a20f212bad2a9613ca15" },
                { change: "apply", path: "blaml.yaml", sha: "778197e3c3bd128ebd36a20f212bad2a9613ca15" },
                { change: "apply", path: "test.json", sha: "778197e3c3bd128ebd36a20f212bad2a9613ca15" },
            ];
            assert.deepStrictEqual(c, e);
        }).timeout(4000);

    });

});

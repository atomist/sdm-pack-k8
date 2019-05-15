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

import * as crypto from "crypto";
import { promisify } from "util";

const algo = "aes-256-cbc";

/**
 * Encrypt a text string and return is base64 encoded.
 *
 * @param text String to be encrypted
 * @param key Secrey key/passphrase to use to encrypt
 * @return Base64 encoded string of encrypted text
 */
export async function encrypt(text: string, key: string): Promise<string> {
    const derivedKey = await deriveKey(key);
    const iv = await deriveKey(derivedKey.toString("hex"), 16);
    const cipher = crypto.createCipheriv(algo, derivedKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("base64");
}

/**
 * Decrypt a base64 encoded text string.
 *
 * @param text String to be decrypted
 * @param key Secrey key/passphrase to use to decrypt, must be the same as the one used to encrypt
 * @return UTF8 encoded string of decrypted text
 */
export async function decrypt(text: string, key: string): Promise<string> {
    const derivedKey = await deriveKey(key);
    const iv = await deriveKey(derivedKey.toString("hex"), 16);
    const decipher = crypto.createDecipheriv(algo, derivedKey, iv);
    const encryptedText = Buffer.from(text, "base64");
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
}

async function deriveKey(key: string, length: number = 32): Promise<Buffer> {
    const pScrypt: (k: string, s: string, l: number) => Promise<Buffer> = promisify(crypto.scrypt);
    const saltLength = 16;
    const salt = (key.repeat(Math.floor(saltLength / key.length) + 1)).substring(0, saltLength);
    return pScrypt(key, salt, length);
}

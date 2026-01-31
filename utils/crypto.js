import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const key = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY, "hex");

export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("hex");
}

export function decrypt(encryptedHex) {
    const buffer = Buffer.from(encryptedHex, "hex");

    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encryptedText = buffer.slice(32);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

    return decrypted.toString("utf8");
}

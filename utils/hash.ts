import crypto from "crypto";

export function sha256(message: string) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);

    // hash the message
    return crypto.createHash("sha256").update(msgBuffer).digest("hex");

    // convert ArrayBuffer to Array
    // const hashArray = Array.from(new Uint8Array(hashBuffer));

    // // convert bytes to hex string
    // const hashHex = hashArray
    //     .map((b) => b.toString(16).padStart(2, "0"))
    //     .join("");
    // return hashHex;
}


let uint8Array = new Uint8Array([
    0,   0,   0,   0, 243, 249, 252, 254, 255, 255, 127,  63,
    244, 122, 189, 222, 239, 119,  59, 157, 255, 255, 127,  63,
    1,   0,   0,   0,   0,   0,   0,   0
]);

function uint8ArrayToHex(array: Uint8Array): string {
    return Array.from(array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

// Step 3: Print the hex string
const hexString = uint8ArrayToHex(uint8Array);
console.log(hexString);

import { ethers } from "ethers";
let h = await ethers.keccak256(ethers.toUtf8Bytes("hello world"));
console.log(h);
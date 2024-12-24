function bigUint64ArrayToLittleEndianHex(array: BigUint64Array): string {
    return Array.from(array).map(num => {
        let hex = num.toString(16).padStart(16, '0');
        let littleEndianHex = '';
        for (let i = hex.length - 2; i >= 0; i -= 2) {
            littleEndianHex += hex.slice(i, i + 2);
        }
        return littleEndianHex;
    }).join('');
}

// Example usage
const array = new BigUint64Array(
    [
        7650428674698361946n,
        14980623240377110513n,
        16835242901320696514n,
        340209823462135409n
    ]

);
const littleEndianHex = bigUint64ArrayToLittleEndianHex(array);
console.log(littleEndianHex);
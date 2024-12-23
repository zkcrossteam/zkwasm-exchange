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
const array = new BigUint64Array([3384289936557590707n, 14765969190488931697n, 3674533666729572964n, 50880686230481809n]);
const littleEndianHex = bigUint64ArrayToLittleEndianHex(array);
console.log(littleEndianHex);
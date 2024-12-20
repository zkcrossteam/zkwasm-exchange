function bigUint64ArrayToJson(array: BigUint64Array): string {
    const jsonArray = Array.from(array, element => element.toString());
    return JSON.stringify(jsonArray);
}

// Example usage
const bigUint64Array = new BigUint64Array([1n, 2n, 3n, 4n]);
const jsonString = bigUint64ArrayToJson(bigUint64Array);
console.log(jsonString); // Output: ["1", "2", "3", "4"]
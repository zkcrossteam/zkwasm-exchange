import { MongoClient, Binary } from 'mongodb';

async function example() {
    const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
    const db = client.db('test');
    const collection = db.collection('myCollection');

    // // 原始数据
    // const bigUint64Array = new BigUint64Array([1n, 2n, 3n]);
    //
    // // 存储为 Binary
    // let result = await collection.insertOne({
    //     data: new Binary(Buffer.from(bigUint64Array.buffer))
    // });
    //
    // console.log("result", result);

    // 读取数据
    const doc = await collection.findOne({});
    if (doc) {
        // Convert the Binary data back to a Buffer
        const buffer = doc.data.buffer;

        // Create a new BigUint64Array from the buffer
        const retrieved = new BigUint64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8);

        console.log(retrieved); // [1n, 2n, 3n]
    }

    await client.close();
}

example().then(r => console.log("done"));
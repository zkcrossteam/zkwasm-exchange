import { MongoClient, Binary } from 'mongodb';
import {Token, TokenModel} from "./info/info.js";
import mongoose from 'mongoose';

async function example() {
    const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
    const db = client.db('test');
    const collection = db.collection('myCollection');

    // 原始数据
    const bigUint64Array = new BigUint64Array([1n, 2n, 3n]);

    // 存储为 Binary
    let result = await collection.insertOne({
        data: new Binary(Buffer.from(bigUint64Array.buffer))
    });

    console.log("result", result);

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

async function tokenExample() {
    await mongoose.connect("mongodb://127.0.0.1:27017", {
        dbName:"test",
    }).then(() => console.log('MongoDB connected'));
    const token = new Token(0, "c6e7df5e7b4f2a278906862b61205850344d4e7d");
    // 读取数据
    const doc = await TokenModel.findOneAndUpdate({tokenIdx:0}, token, {upsert:true});
    if (doc) {
        console.log("retrieve result:", doc);
    }
}


tokenExample().then(r => console.log("done"));
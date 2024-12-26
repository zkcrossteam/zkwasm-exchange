import { Player } from "./api.js";
import { ethers, EventLog } from "ethers";
import { BigNumber } from '@ethersproject/bignumber';  // Import BigNumber from @ethersproject/bignumber
import abiData from './Proxy.json' assert { type: 'json' };
import dotenv from 'dotenv';
import { ZKWasmAppRpc } from "zkwasm-ts-server";
import mongoose from 'mongoose';
import {get_server_admin_key} from "zkwasm-ts-server/src/config.js";

dotenv.config();

// Mongoose Schema and Model for saving tx hashes and state, including additional details
const txSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },  // Ensure txHash is unique
  evmTxHash: { type: String, required: true },
  state: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
  l1token: { type: String, required: true },
  tokenIdx: { type: Number, required: true },
  address: { type: String, required: true },
  pid_1: { type: BigInt, required: true },
  pid_2: { type: BigInt, required: true },
  amount: { type: BigInt, required: true },
});

const TxHash = mongoose.model('TxHash', txSchema);

// const rpc = new ZKWasmAppRpc("https://rpc.zkplay.app");
let admin = new Player(get_server_admin_key(), "http://localhost:3000");
console.log("install admin ...\n");
await admin.register();

let provider = new ethers.JsonRpcProvider(process.env.RPC_PROVIDER!);

const proxyContract = new ethers.Contract(process.env.SETTLEMENT_CONTRACT_ADDRESS!, abiData.abi, provider);

// Function to check if txHash exists and its state is pending or in-progress
async function findTxByHash(txHash: string) {
  return await TxHash.findOne({ txHash });
}

// Function to update state after deposit with retry logic
async function updateTxState(txHash: string, state: string) {
  try {
    await TxHash.updateOne({ txHash }, { state });
    console.log(`Transaction state updated to: ${state} for txHash: ${txHash}`);
  } catch (error) {
    console.error(`Failed to update tx state for txHash ${txHash}: ${(error as Error).message}`);
  }
}

// Function to process the TopUp event and save to the database
async function processTopUpEvent(event: EventLog) {
  try {
    // Cast event to EventLog type to access args
    const eventLog = event as EventLog;
    const [l1token, address, pid_1, pid_2, amount] = eventLog.args;
    console.log("l1token: ", l1token);
    if(l1token !== (await proxyContract._tokens(0))) {
      console.log('Skip not the right token: ', l1token);
      return;
    }
    console.log(`TopUp event received: pid_1=${pid_1.toString()}, pid_2=${pid_2.toString()}, amount=${amount.toString()} wei`);

    let hash = ethers.keccak256(ethers.toUtf8Bytes(event.transactionHash + event.index.toString()));

    // Check if this transaction is already in the database and in 'pending' or 'in-progress' state
    let tx = await findTxByHash(hash);
    
    if (!tx) {
      console.log(`Transaction hash not found: ${event.transactionHash}`);
      let allTokens = await proxyContract.allTokens();
      console.log("allTokens: ", allTokens);
      let l1TokenBigNumber = BigInt(l1token);
      let tokenUint160 = l1TokenBigNumber & ((1n<<160n) - 1n);
      console.log("tokenUint160: ", tokenUint160);
      let tokenIdx = -1;
      for(let i = 0; i < allTokens.length; i++) {
        let tokenId = allTokens[i].token_uid & ((1n<<160n) - 1n);
        console.log("tokenId: ", tokenId);
        if (tokenId == tokenUint160) {
          tokenIdx = i;
          break;
        }
      }
      if (tokenIdx == -1) {
        while(1) {
          console.log("tokenIdx == -1, shouldn't arrive here");
          await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second
        }
      }
      // Save tx hash and initial state as pending, along with other details
      tx = new TxHash({
        txHash: hash,
        evmTxHash: event.transactionHash,
        state: 'pending', // Initially set to pending
        l1token,
        tokenIdx,
        address,
        pid_1,
        pid_2,
        amount,
      });
      console.log(11);
      await tx.save();
      console.log(`Transaction hash and details saved: ${event.transactionHash}, ${hash}`);
    } else {
      console.log(`TxHash ${event.transactionHash}, hash ${hash} already exists in the DB with state: ${tx.state}`);
    }

    // Only process transactions that are 'pending' or 'in-progress'
    if (tx && tx.state === 'pending') {
        try {
          // Set transaction state to "in-progress"
          await updateTxState(hash, 'in-progress');
          console.log(`hash ${hash}, evmTxHash ${tx.evmTxHash} Transaction state updated to "in-progress".`);

          // Convert amount from wei to ether
          let amountInGWei = amount / BigInt(10 ** 9);
          console.log("Deposited amount (in ether): ", amountInGWei);
          if (amountInGWei < 1n) {
            console.error(`--------------Skip: Amount must be at least 1 Titan (in ether instead of wei) ${event.transactionHash}\n`);

          } else {
            // Proceed with the deposit
            await admin.depositWithUint64Pid(pid_1, pid_2, BigInt(tx.tokenIdx), amountInGWei);
            console.log(`------------------Deposit successful! ${event.transactionHash}\n`);
          }

          // After successful deposit, set state to 'completed'
          await updateTxState(hash, 'completed');
          console.log(`hash ${hash}, evmTxHash ${tx.evmTxHash} Transaction state updated to "completed".`);
        } catch (error) {
          console.error('Error during deposit:', error);
          // In case of failure, mark as 'failed'
	  // await updateTxState(event.transactionHash, 'failed');
        }
    } else if (tx.state === 'in-progress'){
        while(1) {
          console.log("in-progress, something wrong happen, should manuel check retry or skip tx");
	      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second
        }
    } else {
      if (tx.state != 'completed') {
        while(1) {
          console.log("shouldn't arrive here");
          await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second
        }
	  }
    }
  } catch (error) {
    console.error('Error processing TopUp event:', error);
  }
}

// Function to retrieve all past TopUp events
async function getTopUpEvents() {
  try {
    // You can specify a block range, or use `fromBlock: 0` to query all events
    const filter = proxyContract.filters.TopUp();
    const events = await proxyContract.queryFilter(filter, 0, 'latest');

    console.log(`Found ${events.length} TopUp events.`);

    for (const event of events) {
      const eventLog = event as EventLog;
      // Process each past event
      await processTopUpEvent(eventLog);
    }
  } catch (error) {
    console.error('Error retrieving TopUp events:', error);
  }
}

async function main() {
  const dbName = `${process.env.SETTLEMENT_CONTRACT_ADDRESS}_deposit`; // Dynamically set DB name using contract address

  // Connect to MongoDB (without deprecated options)
  await mongoose.connect(process.env.MONGO_URI!, {
    dbName,
  }).then(() => console.log('MongoDB connected'));

  // Get all TopUp events from the contract
  await getTopUpEvents();

  // Listen for new TopUp events
  proxyContract.on('TopUp', async (l1token: string, address: string, pid_1: BigNumber, pid_2: BigNumber, amount: BigNumber, event: any) => {
    console.log(event);
    //const eventLog = event as EventLog;  // Explicitly cast to EventLog
    //console.log(eventLog);
    console.log(`New TopUp event detected: ${event.log.transactionHash}`);
    // Process the new TopUp event
    await processTopUpEvent(event.log);
  });
}

main();


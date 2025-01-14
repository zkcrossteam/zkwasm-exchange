import { query, ZKWasmAppRpc, LeHexBN } from "zkwasm-ts-server";
import BN from 'bn.js';

function bytesToHex(bytes: Array<number>): string  {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

const CMD_ADD_TOKEN = 1n;
const CMD_ADD_MARKET = 2n;
const CMD_DEPOSIT = 3n;

const CMD_INSTALL_PLAYER = 4n;
const ADD_LIMIT_ORDER = 5n;
const ADD_MARKET_ORDER = 6n;
const CANCEL_ORDER = 7n;
const CLOSE_MARKET = 8n;
const TRANSFER = 9n;
const WITHDRAW = 10n;
const ADD_TRADE = 11n;
const UPDATE_TOKEN = 12n;
const CMD_INC_COUNTER = 2n;

export class TransactionData {
  nonce: bigint;
  command: bigint;
  params: Array<bigint>;
  constructor(nonce: bigint, command: bigint, params: Array<bigint>) {
    this.nonce = nonce;
    this.command = command;
    this.params = params;
  }
  encodeCommand() {
    const cmd = (this.nonce << 16n) + (BigInt(this.params.length + 1) << 8n) + this.command;
    let buf = [cmd];
    buf = buf.concat(this.params);
    const barray = new BigUint64Array(buf);
    return barray;
  }
}

function address2BigUint64Array(address: string): BigUint64Array {
  address = address.startsWith("0x") ? address.slice(2): address;
  let addressBN = new BN(address, 16);
  let a = addressBN.toArray("be", 20); // 20 bytes = 160 bits and split into 4, 8, 8

  console.log("address is", address);
  console.log("address be is", a);


  /*
(32 bit amount | 32 bit highbit of address)
(64 bit mid bit of address (be))
(64 bit tail bit of address (be))
   */


  let firstLimb = BigInt('0x' + bytesToHex(a.slice(0,4).reverse()));
  let sndLimb = BigInt('0x' + bytesToHex(a.slice(4,12).reverse()));
  let thirdLimb = BigInt('0x' + bytesToHex(a.slice(12, 20).reverse()));
  return new BigUint64Array([firstLimb<<32n, sndLimb, thirdLimb]);
}

function createCommand(nonce: bigint, command: bigint, feature: bigint) {
  return (nonce << 16n) + (feature << 8n) + command;
}

//const rpc = new ZKWasmAppRpc("http://114.119.187.224:8085");
//this.rpc = new ZKWasmAppRpc("http://localhost:3000");

export class Player {
  processingKey: string;
  rpc: ZKWasmAppRpc;
  constructor(key: string, rpc: string) {
    this.processingKey = key
    this.rpc = new ZKWasmAppRpc(rpc);
  }

  /* deposit 
  async deposit(balance: bigint) {
    let nonce = await this.getNonce();
    let accountInfo = new LeHexBN(query(this.processingKey).pkx).toU64Array();
    try {
      let finished = await this.rpc.sendTransaction(
        new BigUint64Array([createCommand(nonce, CMD_DEPOSIT, 0n), accountInfo[1], accountInfo[2], balance]),
        this.processingKey
      );
      console.log("deposit processed at:", finished);
    } catch(e) {
      if(e instanceof Error) {
        console.log(e.message);
      }
      console.log("deposit error at processing key:", this.processingKey);
    }
  }
  */

  async getState(): Promise<any> {
    let state:any = await this.rpc.queryState(this.processingKey);
    return JSON.parse(state.data);
  }

  async getNonce(): Promise<bigint> {
    let state:any = await this.rpc.queryState(this.processingKey);
    let nonce = 0n;
    // console.log("state", state);
    if (state.data) {
      let data = JSON.parse(state.data);
      if (data.player) {
        nonce = BigInt(data.player.nonce);
      }
    }
    return nonce;
  }

  async register() {
    let nonce = await this.getNonce();
    try {
      let txData = new TransactionData(nonce, CMD_INSTALL_PLAYER, []);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
        // new BigUint64Array([createCommand(nonce, CMD_INSTALL_PLAYER, 0n), 0n, 0n, 0n, 1n, 2n,3n,4n]),
        this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async addToken(idx: bigint, address: string) {
    let nonce = await this.getNonce();
    // console.log("nonce", nonce);
    try {
      let addr = address2BigUint64Array(address);
      let params = [idx];
      params.push(...addr);
      let txData = new TransactionData(nonce, CMD_ADD_TOKEN, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log("Error", e.message);
      }
    }
  }

  async updateToken(idx: bigint, address: string) {
    let nonce = await this.getNonce();
    // console.log("nonce", nonce);
    try {
      let addr = address2BigUint64Array(address);
      let params = [idx];
      params.push(...addr);
      let txData = new TransactionData(nonce, UPDATE_TOKEN, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log("Error", e.message);
      }
    }
  }

  async addMarket(tokenAIdx: bigint, tokenBIdx: bigint, lastPrice: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [tokenAIdx, tokenBIdx, lastPrice];
      let txData = new TransactionData(nonce, CMD_ADD_MARKET, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async closeMarket(marketId: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [marketId];
      let txData = new TransactionData(nonce, CLOSE_MARKET, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async deposit(pid: string, tokenAIdx: bigint, amount: bigint) {
    let nonce = await this.getNonce();
    try {
      let pid2 = new LeHexBN(pid).toU64Array();
      let params = [pid2[1], pid2[2], tokenAIdx, amount];
      let txData = new TransactionData(nonce, CMD_DEPOSIT, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }


  async depositWithUint64Pid(pid_1: bigint, pid_2: bigint, tokenAIdx: bigint, amount: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [pid_1, pid_2, tokenAIdx, amount];
      let txData = new TransactionData(nonce, CMD_DEPOSIT, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async addLimitOrder(marketId: bigint, flag: bigint, limitPrice: bigint, amount: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [marketId, flag, limitPrice, amount];
      let txData = new TransactionData(nonce, ADD_LIMIT_ORDER, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async addMarketOrder(marketId: bigint, flag: bigint, bTokenAmount: bigint, aTokenAmount: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [marketId, flag, bTokenAmount, aTokenAmount];
      let txData = new TransactionData(nonce, ADD_MARKET_ORDER, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async cancelOrder(orderId: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [orderId];
      let txData = new TransactionData(nonce, CANCEL_ORDER, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async addTrace(aOrderId: bigint, bOrderId: bigint, aActualAmount: bigint, bActualAmount: bigint) {
    let nonce = await this.getNonce();
    try {
      let params = [aOrderId, bOrderId, aActualAmount, bActualAmount];
      let txData = new TransactionData(nonce, ADD_TRADE, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async transfer(pid: string, tokenIdx: bigint, amount: bigint) {
    let nonce = await this.getNonce();
    try {
      let pid2 = new LeHexBN(pid).toU64Array();
      let params = [pid2[1], pid2[2], tokenIdx, amount];
      let txData = new TransactionData(nonce, TRANSFER, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  async withdraw(idx: bigint, address: string, amount:bigint) {
    let nonce = await this.getNonce();
    try {
      let addr = address2BigUint64Array(address);
      let params = [idx];
      params.push(...addr);
      params.push(amount);
      let txData = new TransactionData(nonce, WITHDRAW, params);
      let result = await this.rpc.sendTransaction(
          txData.encodeCommand(),
          this.processingKey
      );
      return result
    } catch(e) {
      if (e instanceof Error) {
        console.log("Error", e.message);
      }
    }
  }
  /*
  async withdrawRewards(address: string, amount: bigint) {
    let nonce = await this.getNonce();
    let addressBN = new BN(address, 16);
    let a = addressBN.toArray("be", 20); // 20 bytes = 160 bits and split into 4, 8, 8

    console.log("address is", address);
    console.log("address be is", a);

    let firstLimb = BigInt('0x' + bytesToHex(a.slice(0,4).reverse()));
    let sndLimb = BigInt('0x' + bytesToHex(a.slice(4,12).reverse()));
    let thirdLimb = BigInt('0x' + bytesToHex(a.slice(12, 20).reverse()));


    console.log("first is", firstLimb);
    console.log("snd is", sndLimb);
    console.log("third is", thirdLimb);

    try {
      let processStamp = await this.rpc.sendTransaction(
        new BigUint64Array([
          createCommand(nonce, CMD_WITHDRAW, 0n),
          (firstLimb << 32n) + amount,
          sndLimb,
          thirdLimb
        ]), this.processingKey);
      console.log("withdraw rewards processed at:", processStamp);
    } catch(e) {
      if (e instanceof Error) {
        console.log(e.message);
      }
      console.log("collect reward error at address:", address);
    }
  }
  */
}


//import initHostBind, * as hostbind from "./wasmbind/hostbind.js";
//import initHostBind, * as hostbind from "./wasmbind/hostbind.js";
import { Player} from "./api.js";
import {get_server_admin_key} from "zkwasm-ts-server/src/config.js";
let account = "12345";
let player = new Player(get_server_admin_key(), "http://localhost:3000");
let playerB = new Player(account, "http://localhost:3000");
async function main() {
  //let towerId = 10038n + y;
  let state = await player.getState();
  console.log(state);

  state = await player.register();
  console.log(state);

  state = await playerB.register();
  console.log(state);

  console.log("add token 0");
  state = await player.addToken(0n, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log(state);

  console.log("update token 0");
  state = await player.updateToken(0n, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  console.log(state);


  console.log("add token 1");
  state = await player.addToken(1n, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  console.log(state);

  console.log("add token market");
  state = await player.addMarket(0n, 1n);
  console.log(state);

  console.log("Deposit 10000 tokens 0 to the player");
  state = await player.deposit("428c73246352807b9b31b84ff788103abc7932b72801a1b23734e7915cc7f610", 0n, 300000n);
  console.log(state);

  console.log("Deposit 10000 tokens  1 to the playerB");
  state = await player.deposit("0c839e6ff76723263a6261ce07813303fd2895a07c67369f657fcf6af320292b", 1n, 300000n);
  console.log(state);
  state = await player.deposit("0c839e6ff76723263a6261ce07813303fd2895a07c67369f657fcf6af320292b", 0n, 300000n);
  console.log(state);

  state = await playerB.getState();
  console.log(JSON.stringify(state.player, null, 2));

  console.log("add limit order");
  state = await player.addLimitOrder(1n, 1n, BigInt(1e9), 100n);
  console.log(state);

  console.log("add market order");
  state = await playerB.addMarketOrder(1n, 0n, 100n);
  console.log(state);

  console.log(JSON.stringify(state, null, 2));

  console.log("add trade");
  // @ts-ignore
  state = await player.addTrace(BigInt(state.state.order_id_counter - 1), BigInt(state.state.order_id_counter), 100n, 100n);
  console.log(state);
  // console.log(JSON.stringify(state, null, 2));

  console.log("limit order and limit order test");

  console.log("limit order and limit order test, add limit order");
  state = await player.addLimitOrder(1n, 1n, BigInt(2*1e9), 100n);
  console.log(state);

  console.log("limit order and limit order test, add limit order");
  state = await playerB.addLimitOrder(1n, 0n, BigInt(1e9), 100n);
  console.log(state);

  console.log(JSON.stringify(state, null, 2));

  console.log("limit order and limit order test, add trade");
  // @ts-ignore
  state = await player.addTrace(BigInt(state.state.order_id_counter - 1), BigInt(state.state.order_id_counter), 100n, 100n);
  console.log(state);

  state = await player.getState();
  console.log(JSON.stringify(state.player, null, 2));
  state = await playerB.getState();
  console.log(JSON.stringify(state.player, null, 2));
  console.log("transfer 1 tokens 0 to the playerB");
  state = await player.transfer("0c839e6ff76723263a6261ce07813303fd2895a07c67369f657fcf6af320292b", 0n, 1n);
  console.log(JSON.stringify(state.player, null, 2));

  state = await playerB.getState();
  console.log(JSON.stringify(state.player, null, 2));
  console.log("withdraw 1 tokens 0 from the playerB");
  state = await playerB.withdraw(0n, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 1n);
  console.log(JSON.stringify(state.player, null, 2));

  console.log("add limit order");
  state = await player.addLimitOrder(1n, 1n, 1n, 1n);

  console.log("cancel order");
  state = await player.cancelOrder(BigInt(state.state.order_id_counter));
  console.log(JSON.stringify(state.state.orders[state.state.orders.length-1], null, 2));

  console.log("add token 2");
  state = await player.addToken(2n, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  console.log(state);
  console.log("add token market");
  state = await player.addMarket(0n, 2n);
  console.log(state);

  console.log("close market");
  state = await player.closeMarket(BigInt(state.state.market_id_counter));
  console.log(state);

  console.log(JSON.stringify(state.state, null, 2));
}

main();


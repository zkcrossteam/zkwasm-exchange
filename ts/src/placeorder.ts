//import initHostBind, * as hostbind from "./wasmbind/hostbind.js";
//import initHostBind, * as hostbind from "./wasmbind/hostbind.js";
import { Player} from "./api.js";
import { get_server_admin_key } from "zkwasm-ts-server/src/config.js";
import { hasSubscribers } from "node:diagnostics_channel";
let account = "12345";
let player = new Player(get_server_admin_key(), "http://localhost:3000");

const fee = 3n;

async function main() {
  //let towerId = 10038n + y;
  let state = await player.getState();
  console.log(state);
  console.log(state.player.data.positions);

  let name = "limit order buy and market order sell test, b token amount:";
  console.log(name, "add limit order");
  let rst = await player.addLimitOrder(1n, 1n, BigInt(1e9), 100n);
  console.log("result:", rst);

  console.log("Deposit 10000 tokens 0 to the player");
  state = await player.deposit("428c73246352807b9b31b84ff788103abc7932b72801a1b23734e7915cc7f610", 0n, 300000n);
  console.log(state);
  state = await player.deposit("428c73246352807b9b31b84ff788103abc7932b72801a1b23734e7915cc7f610", 1n, 300000n);
  console.log(state);


  console.log("query state again:");
  state = await player.getState();
  console.log(state);
  console.log(state.player.data.positions);



  name = "limit order buy and market order sell test, b token amount:";
  console.log(name, "add limit order");
  rst = await player.addLimitOrder(1n, 1n, BigInt(1e9), 100n);
  console.log("result:", rst);


}



main();


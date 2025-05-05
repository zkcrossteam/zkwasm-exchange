import { Player} from "./api.js";
import {get_server_admin_key} from "zkwasm-ts-server/src/config.js";
import { ZKWasmAppRpc } from "zkwasm-ts-server";

let player = new Player(get_server_admin_key(), "http://localhost:3000");
const rpc = new ZKWasmAppRpc("http://localhost:3000");

async function main() {
  let state = await player.getState();
  console.log(state);

  state = await player.register();
  console.log(state);

  console.log("add token 0");
  state = await player.addToken(0n, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log(state);

  let queryResult:any = await rpc.queryData("tokens");
  console.log("queryResult", queryResult, "length:", queryResult.data.length);
  if(queryResult.data.length != 0) {
    console.log("Query token works");
  } else {
    console.log("Query token failed");
  }
}

main();

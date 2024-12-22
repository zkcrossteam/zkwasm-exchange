use wasm_bindgen::prelude::*;
use zkwasm_rest_abi::*;
use transaction::Transaction;

pub mod config;
pub mod state;
pub mod settlement;
mod transaction;
mod player;

use crate::config::Config;
use crate::state::State;
zkwasm_rest_abi::create_zkwasm_apis!(Transaction, State, Config);

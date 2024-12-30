use transaction::Transaction;
use wasm_bindgen::prelude::*;
use zkwasm_rest_abi::*;

pub mod config;
mod player;
pub mod settlement;
pub mod state;
mod transaction;
mod event;

use crate::config::Config;
use crate::state::State;
zkwasm_rest_abi::create_zkwasm_apis!(Transaction, State, Config);

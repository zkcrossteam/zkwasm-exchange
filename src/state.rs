use serde::Serialize;
use crate::player::HelloWorldPlayer;
use crate::settlement::SettlementInfo;

#[derive (Serialize)]
pub struct State {
    pub counter: u64,
    pub total_fee: u64,
    pub market_id_counter: u64,
    pub order_id_counter: u64,
    pub trade_id_counter: u64,
    // add debug order, trade, market info
}

impl State {
    pub fn get_state(pkey: Vec<u64>) -> String {
        let player = HelloWorldPlayer::get_from_pid(&HelloWorldPlayer::pkey_to_pid(&pkey.try_into().unwrap()));
        serde_json::to_string(&player).unwrap()
    }

    pub fn rand_seed() -> u64 {
        0
    }

    pub fn store() {
        // TODO store to db
    }

    pub fn initialize() {
        // TODO load from db
    }

    pub fn new() -> Self {
        State {
            counter: 0,
            total_fee: 0,
            market_id_counter: 0,
            order_id_counter: 0,
            trade_id_counter: 0,
        }
    }

    pub fn snapshot() -> String {
        let state = unsafe { &STATE };
        serde_json::to_string(&state).unwrap()
    }

    pub fn preempt() -> bool {
        let state = unsafe {&STATE};
        return state.counter % 20 == 0;
    }

    pub fn flush_settlement() -> Vec<u8> {
        let data = SettlementInfo::flush_settlement();
        // unsafe {STATE.store()};
        data
    }

    pub fn tick(&mut self) {
        self.counter += 1;
    }

    pub fn get_new_market_id(&mut self) -> u64 {
        self.market_id_counter += 1;
        self.market_id_counter
    }

    pub fn get_new_order_id(&mut self) -> u64 {
        self.order_id_counter += 1;
        self.order_id_counter
    }

    pub fn get_new_trade_id(&mut self) -> u64 {
        self.trade_id_counter += 1;
        self.trade_id_counter
    }
}

pub static mut STATE: State  = State {
    counter: 0,
    total_fee: 0,
    market_id_counter: 0,
    order_id_counter: 0,
    trade_id_counter: 0,
};


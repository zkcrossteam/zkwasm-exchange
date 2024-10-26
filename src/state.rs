use crate::config::{default_entities, default_local, get_modifier};
use crate::events::restart_object_modifier;
use crate::events::EventQueue;
use crate::StorageData;
use crate::settlement::{encode_address, SettleMentInfo, WithdrawInfo};
use crate::MERKLE_MAP;
use std::cell::RefCell;
use crate::Player;
use core::slice::IterMut;

#[derive(Debug, Serialize)]
pub struct PlayerData {
    pub counter: u64,
}

impl Default for PlayerData {
    fn default() -> Self {
        Self {
            counter: 0
        }
    }
}

impl StorageData for PlayerData {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let counter = *u64data.next().unwrap();
        PlayerData {
            counter
        }
    }
    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.counter);
    }
}

pub type AutomataPlayer = Player<PlayerData>;

#[derive (Serialize)]
pub struct State {}

impl State {
    pub fn get_state(pid: Vec<u64>) -> String {
        let player = AutomataPlayer::get(&pid.try_into().unwrap()).unwrap();
        serde_json::to_string(&player).unwrap()
    }
    pub fn store() {
    }
    pub fn initialize() {
    }
    pub fn new() -> Self {
        State {}
    }
}

pub struct SafeState(RefCell<SafeState>);
unsafe impl Sync for SafeEventQueue {}

lazy_static::lazy_static! {
    pub static ref STATE: SafeState = SafeState (RefCell::new(State::new()));
}

pub struct Transaction {
    pub command: u64,
    pub data: Vec<u64>,
}

const INSTALL_PLAYER: u64 = 1;
const INC_COUNTER: u64 = 2;

const ERROR_PLAYER_ALREADY_EXIST:u32 = 1;
const ERROR_PLAYER_NOT_EXIST:u32 = 2;

impl Transaction {
    pub fn decode_error(e: u32) -> &'static str {
        match e {
           ERROR_PLAYER_NOT_EXIST => "PlayerNotExist",
           ERROR_PLAYER_ALREADY_EXIST => "PlayerAlreadyExist",
           _ => "Unknown"
        }
    }
    pub fn decode(params: [u64; 4]) -> Self {
        let command = (params[0] >> 32) & 0xff;
        let mut data = vec![];
        data = vec![params[1], params[2], params[3]]; // pkey[0], pkey[1], amount
        Transaction {
            command,
            data,
        }
    }
    pub fn install_player(&self, pkey: &[u64; 4]) -> u32 {
        let player = AutomataPlayer::get(pkey);
        match player {
            Some(_) => ERROR_PLAYER_ALREADY_EXIST,
            None => {
                let player = Player::new(&pkey);
                player.store();
                0
            }
        }
    }

    pub fn inc_counter(&self, pkey: &[u64; 4]) -> u32 {
        //let player = AutomataPlayer::get(pkey);
        todo!()
    }

    /*
    pub fn withdraw(&self, pkey: &[u64; 4]) -> u32 {
        let mut player = AutomataPlayer::get(pkey);
        match player.as_mut() {
            None => ERROR_PLAYER_NOT_EXIST,
            Some(player) => {
                if let Some(treasure) = player.data.local.0.last_mut() {
                    let withdraw = WithdrawInfo::new(
                        0,
                        0,
                        0,
                        [*treasure as u64, 0, 0, 0],
                        encode_address(&self.data),
                    );
                    SettleMentInfo::append_settlement(withdraw);
                    *treasure = 0;
                    //let t = player.data.local.0.last().unwrap();
                    //zkwasm_rust_sdk::dbg!("treasure is {}", t);
                    player.store();
                } else {
                    unreachable!();
                }
                0
            }
        }
    }
    */

    pub fn snapshot() -> String {
        let state = unsafe { &STATE };
        serde_json::to_string(&state).unwrap()
    }

    pub fn preempt() -> bool {
        return false;
    }

    pub fn process(&self, pkey: &[u64; 4]) -> u32 {
        let b = match self.command {
            INSTALL_PLAYER => self.install_player(pkey),
            INC_COUNTER => self.inc_counter(pkey),
            _ => {
                0
            }
        };
        let kvpair = unsafe { &mut MERKLE_MAP.merkle.root };
        zkwasm_rust_sdk::dbg!("root after process {:?}\n", kvpair);
        b
    }

    pub fn flush_settlement() -> Vec<u8> {
        let data = SettlementInfo::flush_settlement();
        unsafe {STATE.store()};
        data
    }
}

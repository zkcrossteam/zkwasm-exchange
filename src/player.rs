use serde::Serialize;
use std::collections::HashMap;
use std::slice::IterMut;
use zkwasm_rest_abi::{Player, StorageData, MERKLE_MAP};

const POSITION_PREFIX: u64 = 0xfffffffffffffffe;

#[derive(Debug, Serialize, Clone)]
pub struct Position {
    pub balance: u64,
    pub lock_balance: u64,
}

impl Default for Position {
    fn default() -> Self {
        Self {
            balance: 0,
            lock_balance: 0,
        }
    }
}

impl Position {
    pub fn get_key(token_idx: u32, pid: &[u64; 2]) -> [u64; 4] {
        [POSITION_PREFIX, token_idx as u64, pid[0], pid[1]]
    }

    pub fn store(&self, token_idx: u32, pid: &[u64; 2]) {
        let mut data = Vec::new();
        self.to_data(&mut data);
        let kvpair = unsafe { &mut MERKLE_MAP };
        kvpair.set(&Self::get_key(token_idx, pid), data.as_slice());
    }

    pub fn load(token_idx: u32, pid: &[u64; 2]) -> Self {
        let kvpair = unsafe { &mut MERKLE_MAP };
        let mut data = kvpair.get(&Self::get_key(token_idx, pid));
        if data.is_empty() {
            return Self::default();
        }
        let mut u64data = data.iter_mut();
        Self::from_data(&mut u64data)
    }

    pub fn inc_balance(&mut self, amount: u64) {
        self.balance += amount;
    }

    pub fn dec_balance(&mut self, amount: u64) {
        self.balance -= amount;
    }

    pub fn inc_lock_balance(&mut self, amount: u64) {
        // todo add check overflow
        self.lock_balance += amount;
    }

    pub fn dec_lock_balance(&mut self, amount: u64) {
        // todo add check less than zero
        self.lock_balance -= amount;
    }
}

impl StorageData for Position {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let balance = *u64data.next().unwrap();
        let lock_balance = *u64data.next().unwrap();
        Position {
            balance,
            lock_balance,
        }
    }
    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.balance);
        data.push(self.lock_balance);
    }
}

#[derive(Debug, Serialize)]
pub struct PlayerData {
    pub counter: u64,
    pub positions: HashMap<u32, Position>,
}

impl PlayerData {
    pub fn store_positions(&self, pid: &[u64; 2]) {
        for (token_idx, position) in self.positions.iter() {
            position.store(*token_idx, pid);
        }
    }

    pub fn load_position(&mut self, token_idx: u32, pid: &[u64; 2]) -> &Position {
        if let Some(p) = self.positions.get(&token_idx) {
            return p;
        }
        let p = Position::load(token_idx, pid);
        self.positions.insert(token_idx, p.clone());
        self.positions.get(&token_idx).unwrap()
    }
}

impl Default for PlayerData {
    fn default() -> Self {
        Self {
            counter: 0,
            positions: HashMap::new(),
        }
    }
}

impl StorageData for PlayerData {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let counter = *u64data.next().unwrap();
        PlayerData {
            counter,
            positions: HashMap::new(),
        }
    }
    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.counter);
    }
}

pub type HelloWorldPlayer = Player<PlayerData>;

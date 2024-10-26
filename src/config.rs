use crate::settlement::SettleMentInfo;
use crate::state::Attributes;
use crate::state::Modifier;
use serde::Serialize;
const ENTITY_ATTRIBUTES_SIZE: usize = 6;
const LOCAL_ATTRIBUTES_SIZE: usize = 8;

#[derive(Serialize, Clone)]
pub struct Config {
    version: &'static str,
}
lazy_static::lazy_static! {
    pub static ref CONFIG: Config = Config {
        version: "1.0",
    }
}

impl Config {
    pub fn to_json_string() -> String {
        serde_json::to_string(&CONFIG.clone()).unwrap()
    }

    pub fn autotick() -> bool {
        true
    }
}

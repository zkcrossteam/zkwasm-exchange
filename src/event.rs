use crate::state::STATE;

pub static mut EVENTS:Vec<u64> = vec![];

pub const EVENT_POSITION: u64 = 1;
pub const EVENT_TOKEN: u64 = 2;
pub const EVENT_MARKET: u64 = 3;
pub const EVENT_ORDER: u64 = 4;
pub const EVENT_TRADE: u64 = 5;

pub unsafe fn init_events() {
    EVENTS.clear();
    EVENTS.push(0); // 0 for ret code
    EVENTS.push(0); // 1 for eventid
}

pub unsafe fn get_event<'a>() -> &'a mut Vec<u64> {
    &mut EVENTS
}

pub unsafe fn finalize_events(ret_code: u32) {
    EVENTS[0] = ret_code as u64;
    if EVENTS.len() > 2 {
        EVENTS[1] = STATE.get_new_event_id();
    }
}
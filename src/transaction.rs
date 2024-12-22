use crate::config::ADMIN_PUBKEY;
use crate::player::HelloWorldPlayer;
use crate::settlement::{SettlementInfo, SETTLEMENT};
use crate::state::STATE;
use crate::StorageData;
use std::slice::IterMut;
use std::u64;
use zkwasm_rest_abi::{WithdrawInfo, MERKLE_MAP};
use zkwasm_rust_sdk::require;

pub struct Transaction {
    pub nonce: u64,
    pub data: Data,
}

const AUTOTICK: u64 = 0;
const ADD_TOKEN: u64 = 1;
const ADD_MARKET: u64 = 2;
const DEPOSIT_TOKEN: u64 = 3;
const REGISTER_PLAYER: u64 = 4;
const ADD_LIMIT_ORDER: u64 = 5;

const ADD_MARKET_ORDER: u64 = 6;
const CANCEL_ORDER: u64 = 7;
const CLOSE_MARKET: u64 = 8;
const TRANSFER: u64 = 9;
const WITHDRAW: u64 = 10;
const ADD_TRADE: u64 = 11;

// TODO fix error number
const ERROR_PLAYER_ALREADY_EXIST: u32 = 1;
const ERROR_TOKEN_ALREADY_EXIST: u32 = 1;
const ERROR_TOKEN_NOT_EXIST: u32 = 1;
const ERROR_PLAYER_NOT_EXIST: u32 = 2;
const ERROR_MARKET_NOT_EXIST: u32 = 2;

const ERROR_BALANCE_NOT_ENOUGH: u32 = 3;

const ERROR_PLAYER_ORDER_NOT_MATCH: u32 = 4;

const ERROR_ORDER_NOT_LIVE: u32 = 4;

const ERROR_ORDER_NOT_EXIT: u32 = 5;
const ERROR_TRADE_A_BUY_B_SELL: u32 = 6;
const ERROR_LIMIT_ORDER_PRICE_NOT_MATCH: u32 = 7;
const ERROR_SAME_TRADE_ORDER_PID: u32 = 8;
const ERROR_A_AND_B_ORDER_BOTH_MARKET: u32 = 9;
const ERROR_BALANCE_NOT_MATCH: u32 = 3;
const ERROR_PLAYER_IS_NOT_ADMIN: u32 = 0xffffffff;

const COMMON_PREFIX: u64 = 0xffffffffffffffff;
const ORDER_PREFIX: u64 = 0xfffffffffffffffd;
const TRADE_PREFIX: u64 = 0xfffffffffffffffc;
const TOKEN_STORE_PREFIX: u64 = 1;
const MARKET_STORE_PREFIX: u64 = 1;

pub fn u64_array_to_address(arr: &[u64; 3]) -> [u8; 20] {
    let mut address = [0u8; 20];
    for i in 0..20 {
        address[i] = (arr[i / 8] >> (i % 8)) as u8;
    }
    address
}

impl Transaction {
    pub fn decode_error(e: u32) -> &'static str {
        match e {
            ERROR_PLAYER_NOT_EXIST => "PlayerNotExist",
            ERROR_PLAYER_ALREADY_EXIST => "PlayerAlreadyExist",
            _ => "Unknown",
        }
    }
    pub fn decode(params: &[u64]) -> Self {
        zkwasm_rust_sdk::dbg!("decode \n");
        let str = format!("{:?}", params);
        zkwasm_rust_sdk::dbg!("{}\n", str);
        zkwasm_rust_sdk::dbg!("\n");
        let command = params[0] & 0xff;
        let nonce = params[0] >> 16;
        let data = match command {
            ADD_TOKEN => {
                unsafe {
                    require(params.len() == 5);
                };
                let token_idx = params[1] as u32;
                let mut address = u64_array_to_address(&[params[2], params[3], params[4]]);
                Data::AddToken(AddTokenParams { token_idx, address })
            }
            ADD_MARKET => {
                unsafe {
                    require(params.len() == 3);
                };
                let token_a = params[1] as u32;
                let token_b = params[2] as u32;
                Data::AddMarket(AddMarketParams { token_a, token_b })
            }

            DEPOSIT_TOKEN => {
                unsafe {
                    require(params.len() == 5);
                };
                zkwasm_rust_sdk::dbg!("deposit token\n");
                Data::Deposit(DepositParams {
                    pid_1: params[1],
                    pid_2: params[2],
                    token_idx: params[3] as u32,
                    amount: params[4],
                })
            }

            REGISTER_PLAYER => Data::RegisterPlayer,

            ADD_LIMIT_ORDER => Data::AddLimitOrder(AddLimitOrderParams {
                market_id: params[1],
                flag: params[2],
                limit_price: params[3],
                amount: params[4],
            }),
            ADD_MARKET_ORDER => Data::AddMarketOrder(AddMarketOrderParams {
                market_id: params[1],
                flag: params[2],
                amount: params[3],
            }),
            CANCEL_ORDER => Data::CancelOrder(CancelOrderParams {
                order_id: params[1],
            }),
            CLOSE_MARKET => Data::CloseMarket(CloseMarketParams {
                market_id: params[1],
            }),
            TRANSFER => Data::Transfer(TransferParams {
                pid_1: params[1],
                pid_2: params[2],
                token_idx: params[3] as u32,
                amount: params[4],
            }),
            WITHDRAW => Data::Withdraw(WithdrawParams {
                token_idx: params[1] as u32,
                to_address: u64_array_to_address(&[params[2], params[3], params[4]]),
                amount: params[5],
            }),
            ADD_TRADE => Data::AddTrade(AddTradeParams {
                a_order_id: params[1],
                b_order_id: params[2],
                a_actual_amount: params[3],
                b_actual_amount: params[4],
            }),
            _ => {
                zkwasm_rust_sdk::dbg!("unknown command\n");
                Data::RegisterPlayer
            }
        };
        Transaction { nonce, data }
    }
    pub fn install_player(&self, pkey: &[u64; 4]) -> u32 {
        zkwasm_rust_sdk::dbg!("install \n");
        let pid = HelloWorldPlayer::pkey_to_pid(pkey);
        let player = HelloWorldPlayer::get_from_pid(&pid);
        match player {
            Some(_) => ERROR_PLAYER_ALREADY_EXIST,
            None => {
                let player = HelloWorldPlayer::new_from_pid(pid);
                player.store();
                0
            }
        }
    }

    pub fn inc_counter(&self, _pkey: &[u64; 4]) -> u32 {
        //let player = HelloWorldPlayer::get(pkey);
        todo!()
    }

    pub fn is_admin(pkey: &[u64; 4]) -> bool {
        *pkey == *ADMIN_PUBKEY
    }

    pub fn process(&self, pkey: &[u64; 4], _rand: &[u64; 4]) -> u32 {
        let pid_1 = pkey[1];
        let pid_2 = pkey[2];
        zkwasm_rust_sdk::dbg!("process pkey: {} {}\n", pid_1, pid_2);
        match self.data {
            Data::RegisterPlayer => self.install_player(pkey),
            Data::AddToken(ref params) => {
                if !Self::is_admin(pkey) {
                    zkwasm_rust_sdk::dbg!("you are not admin\n");
                    return ERROR_PLAYER_IS_NOT_ADMIN;
                }
                zkwasm_rust_sdk::dbg!("add token\n");
                if Token::load(params.token_idx).is_some() {
                    return ERROR_TOKEN_ALREADY_EXIST;
                }
                let token = Token::new(params.token_idx, params.address);
                token.store();
                // TODO emit event
                0
            }
            Data::AddMarket(ref params) => {
                zkwasm_rust_sdk::dbg!("add market\n");
                if !Self::is_admin(pkey) {
                    zkwasm_rust_sdk::dbg!("you are not admin\n");
                    return ERROR_PLAYER_IS_NOT_ADMIN;
                }
                let a_exist = Token::load(params.token_a).is_some();
                let b_exist = Token::load(params.token_b).is_some();
                zkwasm_rust_sdk::dbg!("token_a {} \n", a_exist);
                zkwasm_rust_sdk::dbg!("token_b {} \n", b_exist);
                unsafe {
                    require(Token::load(params.token_a).is_some());
                    require(Token::load(params.token_b).is_some());
                }
                let new_market_id = unsafe { STATE.get_new_market_id() };
                let market = Market::new(new_market_id, params.token_a, params.token_b);
                market.store();
                // TODO emit event
                0
            }
            Data::Deposit(ref params) => {
                zkwasm_rust_sdk::dbg!("deposit\n");
                if !Self::is_admin(pkey) {
                    zkwasm_rust_sdk::dbg!("you are not admin\n");
                    return ERROR_PLAYER_IS_NOT_ADMIN;
                }
                let pid_1 = params.pid_1;
                let pid_2 = params.pid_2;
                zkwasm_rust_sdk::dbg!("Deposit: {} {}\n", pid_1, pid_2);
                let player = HelloWorldPlayer::get_from_pid(&[params.pid_1, params.pid_2]);
                if player.is_none() {
                    return ERROR_PLAYER_NOT_EXIST;
                }
                let token = Token::load(params.token_idx);
                if token.is_none() {
                    zkwasm_rust_sdk::dbg!("deposit token not exist\n");
                    return ERROR_TOKEN_NOT_EXIST;
                }
                let pid = [params.pid_1, params.pid_2];
                let mut position = player.unwrap().data.load_position(params.token_idx, &pid);
                //todo checkout overflow?
                position.balance += params.amount;
                position.store(params.token_idx, &pid);
                0
            }
            Data::AddLimitOrder(ref params) => {
                zkwasm_rust_sdk::dbg!("add limit order\n");

                match Self::add_limit_order(&[pid_1, pid_2], params) {
                    Ok(value) => value,
                    Err(value) => return value,
                }
            }

            Data::AddMarketOrder(ref params) => {
                zkwasm_rust_sdk::dbg!("add market order\n");
                match Self::add_market_order(&[pid_1, pid_2], params) {
                    Ok(value) => value,
                    Err(value) => return value,
                }
            }
            Data::CancelOrder(ref params) => {
                zkwasm_rust_sdk::dbg!("cancel order\n");
                match Self::cancel_order(&[pid_1, pid_2], params) {
                    Ok(value) => value,
                    Err(value) => return value,
                }
            }
            Data::CloseMarket(ref params) => {
                zkwasm_rust_sdk::dbg!("close market\n");
                if !Self::is_admin(pkey) {
                    zkwasm_rust_sdk::dbg!("you are not admin\n");
                    return ERROR_PLAYER_IS_NOT_ADMIN;
                }
                let market = Market::load(params.market_id);
                if market.is_none() {
                    zkwasm_rust_sdk::dbg!("market not exist\n");
                    return ERROR_MARKET_NOT_EXIST;
                }
                let mut market = market.unwrap();
                market.status = MARKET_STATUS_CLOSE;
                market.store();
                0
            }

            Data::Transfer(ref params) => {
                zkwasm_rust_sdk::dbg!("transfer\n");
                if !Self::is_admin(pkey) {
                    zkwasm_rust_sdk::dbg!("you are not admin\n");
                    return ERROR_PLAYER_IS_NOT_ADMIN;
                }
                let player_1 = HelloWorldPlayer::get_from_pid(&[pid_1, pid_2]);
                let player_2 = HelloWorldPlayer::get_from_pid(&[params.pid_1, params.pid_2]);
                if player_1.is_none() || player_2.is_none() {
                    zkwasm_rust_sdk::dbg!("transfer, player a or player b is none\n");
                    return ERROR_PLAYER_NOT_EXIST;
                }
                let token = Token::load(params.token_idx);
                if token.is_none() {
                    zkwasm_rust_sdk::dbg!("transfer, token not exist\n");
                    return ERROR_TOKEN_NOT_EXIST;
                }
                let mut position_1 = player_1
                    .unwrap()
                    .data
                    .load_position(params.token_idx, &[pid_1, pid_2]);
                let mut position_2 = player_2
                    .unwrap()
                    .data
                    .load_position(params.token_idx, &[params.pid_1, params.pid_2]);
                if position_1.balance < params.amount {
                    zkwasm_rust_sdk::dbg!("transfer, balance not enough\n");
                    return ERROR_BALANCE_NOT_ENOUGH;
                }
                position_1.dec_balance(params.amount);
                position_2.inc_balance(params.amount);
                position_1.store(params.token_idx, &[pid_1, pid_2]);
                position_2.store(params.token_idx, &[params.pid_1, params.pid_2]);
                0
            }
            Data::Withdraw(ref params) => {
                zkwasm_rust_sdk::dbg!("withdraw\n");
                let player = HelloWorldPlayer::get_from_pid(&[pid_1, pid_2]);
                if player.is_none() {
                    zkwasm_rust_sdk::dbg!("withdraw, player not exist\n");
                    return ERROR_PLAYER_NOT_EXIST;
                }
                let token = Token::load(params.token_idx);
                if token.is_none() {
                    zkwasm_rust_sdk::dbg!("withdraw, token not exist\n");
                    return ERROR_TOKEN_NOT_EXIST;
                }
                let mut position = player
                    .unwrap()
                    .data
                    .load_position(params.token_idx, &[pid_1, pid_2]);
                if position.balance < params.amount {
                    zkwasm_rust_sdk::dbg!("withdraw, balance not enough\n");
                    return ERROR_BALANCE_NOT_ENOUGH;
                }
                let withdraw_info = WithdrawInfo {
                    feature: params.token_idx,
                    address: params.to_address,
                    amount: params.amount,
                };
                SettlementInfo::append_settlement(withdraw_info);
                position.dec_balance(params.amount);
                position.store(params.token_idx, &[pid_1, pid_2]);
                0
            }
            Data::AddTrade(ref params) => {
                zkwasm_rust_sdk::dbg!("add trade\n");
                let a_order = Order::load(params.a_order_id);
                let b_order = Order::load(params.b_order_id);
                if a_order.is_none() || b_order.is_none() {
                    zkwasm_rust_sdk::dbg!("add trade, a order or b order is none\n");
                    return ERROR_ORDER_NOT_EXIT;
                }
                let mut a_order = a_order.unwrap();
                let mut b_order = b_order.unwrap();
                if a_order.is_live() || b_order.is_live() {
                    zkwasm_rust_sdk::dbg!("add trade, a order or b order is not live\n");
                    return ERROR_ORDER_NOT_LIVE;
                }
                let market = Market::load(a_order.market_id);
                if market.is_none() {
                    zkwasm_rust_sdk::dbg!("add trade, a order or b order is not exist\n");
                    return ERROR_MARKET_NOT_EXIST;
                }
                let market = market.unwrap();
                if market.is_close() {
                    zkwasm_rust_sdk::dbg!("add trade, a order or b order is closed\n");
                    return ERROR_MARKET_NOT_EXIST;
                }
                if !(a_order.is_buy() && b_order.is_sell()) {
                    zkwasm_rust_sdk::dbg!("add trade, a order is not buy or b order is not sell\n");
                    return ERROR_TRADE_A_BUY_B_SELL;
                }
                if a_order.pid == b_order.pid {
                    zkwasm_rust_sdk::dbg!("add trade, a order and b order is from same user\n");
                    return ERROR_SAME_TRADE_ORDER_PID;
                }
                let player_a = HelloWorldPlayer::get_from_pid(&a_order.pid);
                let player_b = HelloWorldPlayer::get_from_pid(&b_order.pid);
                if player_a.is_none() || player_b.is_none() {
                    zkwasm_rust_sdk::dbg!("add trade, player a or player b is none\n");
                    return ERROR_PLAYER_NOT_EXIST;
                }
                let mut player_a = player_a.unwrap();
                let mut player_b = player_b.unwrap();
                // 第一种情况 a order, b order 都是 limit order
                if a_order.is_limit_order() && b_order.is_limit_order() {
                    if a_order.price != b_order.price {
                        zkwasm_rust_sdk::dbg!("both a and b is limit order but price not equal\n");
                        return ERROR_LIMIT_ORDER_PRICE_NOT_MATCH;
                    }
                    if a_order.price * params.b_actual_amount != params.a_actual_amount {
                        zkwasm_rust_sdk::dbg!(
                            "both a and b is limit order but price not equal 2\n"
                        );
                        return ERROR_LIMIT_ORDER_PRICE_NOT_MATCH;
                    }
                }
                let mut player_a_token_a_position =
                    player_a.data.load_position(market.token_a, &a_order.pid);
                let mut player_a_token_b_position =
                    player_a.data.load_position(market.token_b, &a_order.pid);
                let mut player_b_token_a_position =
                    player_b.data.load_position(market.token_a, &b_order.pid);
                let mut player_b_token_b_position =
                    player_b.data.load_position(market.token_b, &b_order.pid);
                let a_cost = params.a_actual_amount;
                let b_cost = params.b_actual_amount;
                if a_order.lock_balance < params.a_actual_amount
                    || b_order.lock_balance < params.b_actual_amount
                {
                    zkwasm_rust_sdk::dbg!("balance not match\n");
                    return ERROR_BALANCE_NOT_MATCH;
                }
                if a_order.is_limit_order() && b_order.is_limit_order() {
                    a_order.lock_balance -= params.a_actual_amount;
                    b_order.lock_balance -= params.b_actual_amount;
                    a_order.already_deal_amount += params.b_actual_amount;
                    b_order.already_deal_amount += params.b_actual_amount;
                } else if a_order.is_limit_order() && b_order.is_market_order() {
                    // 第二种情况 a order 是 limit order, b order 是 market order
                    a_order.lock_balance -= params.a_actual_amount;
                    b_order.lock_balance -= params.b_actual_amount;
                    a_order.already_deal_amount += params.b_actual_amount;
                    b_order.already_deal_amount += params.b_actual_amount;
                } else if a_order.is_market_order() && b_order.is_limit_order() {
                    // 第三种情况 a order 是 market order, b order 是 limit order
                    a_order.lock_balance -= params.a_actual_amount;
                    b_order.lock_balance -= params.b_actual_amount;
                    a_order.already_deal_amount += params.a_actual_amount;
                    b_order.already_deal_amount += params.b_actual_amount;
                } else {
                    // 第四种情况 a order, b order 都是 market order
                    zkwasm_rust_sdk::dbg!("balance a order and b order is market order\n");
                    return ERROR_A_AND_B_ORDER_BOTH_MARKET;
                }

                player_a_token_a_position.dec_lock_balance(a_cost);
                player_a_token_b_position.inc_balance(b_cost);
                player_b_token_a_position.inc_balance(a_cost);
                player_b_token_b_position.dec_lock_balance(b_cost);
                a_order.update_status();
                a_order.store();
                b_order.update_status();
                b_order.store();
                player_a_token_a_position.store(market.token_a, &a_order.pid);
                player_a_token_b_position.store(market.token_b, &a_order.pid);
                player_b_token_a_position.store(market.token_a, &b_order.pid);
                player_b_token_b_position.store(market.token_b, &b_order.pid);
                let trace_id = unsafe { STATE.get_new_trade_id() };
                let trade = Trade::new(
                    trace_id,
                    a_order.id,
                    b_order.id,
                    params.a_actual_amount,
                    params.b_actual_amount,
                );
                trade.store();
                0
            }
            _ => {
                zkwasm_rust_sdk::dbg!("unknown command\n");
                0xffffffff
            }
        }
    }

    pub fn add_limit_order(pid: &[u64; 2], params: &AddLimitOrderParams) -> Result<u32, u32> {
        let player = HelloWorldPlayer::get_from_pid(pid);
        if player.is_none() {
            zkwasm_rust_sdk::dbg!("add limit order, player is none\n");
            return Err(ERROR_PLAYER_NOT_EXIST);
        }
        let market = Market::load(params.market_id);
        if market.is_none() {
            zkwasm_rust_sdk::dbg!("add limit order, market is none\n");
            return Err(ERROR_MARKET_NOT_EXIST);
        }

        if market.clone().unwrap().is_close() {
            zkwasm_rust_sdk::dbg!("add limit order, market is closed\n");
            return Err(ERROR_MARKET_NOT_EXIST);
        }

        let token_idx: u32;
        let cost: u64;
        if params.flag == Order::FLAG_BUY as u64 {
            token_idx = market.unwrap().token_a;
            cost = params.amount * params.limit_price;
        } else {
            token_idx = market.unwrap().token_b;
            cost = params.amount;
        };

        let mut position = player.unwrap().data.load_position(token_idx, pid);
        // todo check overflow
        if position.balance < cost {
            zkwasm_rust_sdk::dbg!("add limit order, balance is not enough\n");
            return Err(ERROR_BALANCE_NOT_ENOUGH);
        }

        position.dec_balance(cost);
        position.inc_lock_balance(cost);

        let order_id = unsafe { STATE.get_new_order_id() };
        let order = Order::new(
            order_id,
            Order::TYPE_LIMIT,
            Order::STATUS_LIVE,
            *pid,
            params.market_id,
            params.flag as u8,
            0,
            params.limit_price,
            params.amount,
            0,
        );
        position.store(token_idx, pid);
        order.store();
        Ok(0)
    }

    pub fn add_market_order(pid: &[u64; 2], params: &AddMarketOrderParams) -> Result<u32, u32> {
        let player = HelloWorldPlayer::get_from_pid(pid);
        if player.is_none() {
            zkwasm_rust_sdk::dbg!("add market order, player is none\n");
            return Err(ERROR_PLAYER_NOT_EXIST);
        }
        let market = Market::load(params.market_id);
        if market.is_none() {
            zkwasm_rust_sdk::dbg!("add market order, market is none\n");
            return Err(ERROR_MARKET_NOT_EXIST);
        }

        if market.clone().unwrap().is_close() {
            zkwasm_rust_sdk::dbg!("add market order, market is closed\n");
            return Err(ERROR_MARKET_NOT_EXIST);
        }

        let token_idx: u32;
        let cost: u64;
        if params.flag == Order::FLAG_BUY as u64 {
            token_idx = market.unwrap().token_a;
            cost = params.amount;
        } else {
            token_idx = market.unwrap().token_b;
            cost = params.amount;
        };

        let mut position = player.unwrap().data.load_position(token_idx, pid);
        // todo check overflow
        if position.balance < cost {
            zkwasm_rust_sdk::dbg!("add market order, balance is not enough\n");
            return Err(ERROR_BALANCE_NOT_ENOUGH);
        }

        position.dec_balance(cost);
        position.inc_lock_balance(cost);

        let order_id = unsafe { STATE.get_new_order_id() };
        let order = Order::new(
            order_id,
            Order::TYPE_LIMIT,
            Order::STATUS_LIVE,
            *pid,
            params.market_id,
            params.flag as u8,
            0,
            0,
            params.amount,
            0,
        );
        position.store(token_idx, pid);
        order.store();
        Ok(0)
    }

    pub fn cancel_order(pid: &[u64; 2], params: &CancelOrderParams) -> Result<u32, u32> {
        let order = Order::load(params.order_id);
        if order.is_none() {
            zkwasm_rust_sdk::dbg!("cancel order, order is none\n");
            return Err(ERROR_PLAYER_NOT_EXIST);
        }
        let order = order.unwrap();
        if order.pid != *pid {
            zkwasm_rust_sdk::dbg!("cancel order, order is not owned by this player\n");
            return Err(ERROR_PLAYER_ORDER_NOT_MATCH);
        }
        if !order.is_live() {
            zkwasm_rust_sdk::dbg!("cancel order, order is not live\n");
            return Err(ERROR_ORDER_NOT_LIVE);
        }
        let market = Market::load(order.market_id);
        if market.is_none() {
            zkwasm_rust_sdk::dbg!("cancel order, market is none\n");
            return Err(ERROR_MARKET_NOT_EXIST);
        }
        let token_idx: u32;
        let lock_balance = order.lock_balance;
        if order.flag == Order::FLAG_BUY as u8 {
            token_idx = market.unwrap().token_a;
        } else {
            token_idx = market.unwrap().token_b;
        };

        let mut position = HelloWorldPlayer::get_from_pid(pid)
            .unwrap()
            .data
            .load_position(token_idx, pid);
        position.inc_balance(lock_balance);
        position.dec_lock_balance(lock_balance);

        let mut order = order;
        order.status = Order::STATUS_CANCEL;
        order.store();
        Ok(0)
    }
}

#[derive(Debug, Clone)]
pub struct AddMarketParams {
    pub token_a: u32,
    pub token_b: u32,
}

#[derive(Debug, Clone)]
pub struct CloseMarketParams {
    pub market_id: u64,
}

#[derive(Debug, Clone)]
pub struct CancelOrderParams {
    pub order_id: u64,
}

#[derive(Debug, Clone)]
pub struct WithdrawParams {
    pub token_idx: u32,
    pub to_address: [u8; 20],
    pub amount: u64,
}

#[derive(Debug, Clone)]
pub struct AddLimitOrderParams {
    pub market_id: u64,
    pub flag: u64,
    pub limit_price: u64,
    pub amount: u64,
}

#[derive(Debug, Clone)]
pub struct AddMarketOrderParams {
    pub market_id: u64,
    pub flag: u64,
    pub amount: u64,
}

#[derive(Debug, Clone)]
pub struct AddTradeParams {
    pub a_order_id: u64,
    pub b_order_id: u64,
    pub a_actual_amount: u64,
    pub b_actual_amount: u64,
}

#[derive(Debug, Clone)]
pub struct TransferParams {
    pub pid_1: u64,
    pub pid_2: u64,
    pub token_idx: u32,
    pub amount: u64,
}

type DepositParams = TransferParams;

#[derive(Debug, Clone)]
pub struct AddTokenParams {
    pub token_idx: u32,
    pub address: [u8; 20],
}

#[derive(Debug, Clone)]
pub enum Data {
    AddMarket(AddMarketParams),
    CloseMarket(CloseMarketParams),
    AddToken(AddTokenParams),
    RegisterPlayer,
    AddLimitOrder(AddLimitOrderParams),
    AddMarketOrder(AddMarketOrderParams),
    CancelOrder(CancelOrderParams),
    AddTrade(AddTradeParams),
    Transfer(TransferParams),
    Deposit(DepositParams),
    Withdraw(WithdrawParams),
}

#[derive(Debug, Clone)]
pub struct Market {
    /// market id 对应交易对
    pub market_id: u64,
    /// open / close
    pub status: u64,
    /// A token的 token idx 比如是usdt
    pub token_a: u32,
    /// B token 的token idx 比如是eth
    pub token_b: u32,
    // todo add market price
}

impl Market {
    pub fn new(market_id: u64, token_a: u32, token_b: u32) -> Self {
        Self {
            market_id,
            status: 1, // 默认为open状态
            token_a,
            token_b,
        }
    }

    pub fn get_key(market_id: u64) -> [u64; 4] {
        [COMMON_PREFIX, MARKET_STORE_PREFIX, 0, market_id]
    }

    pub fn store(&self) {
        zkwasm_rust_sdk::dbg!("store market\n");
        let mut data = Vec::new();
        self.to_data(&mut data);
        let kvpair = unsafe { &mut MERKLE_MAP };
        kvpair.set(&Self::get_key(self.market_id), data.as_slice());
        zkwasm_rust_sdk::dbg!("end store token\n");
    }

    pub fn load(market_id: u64) -> Option<Self> {
        let kvpair = unsafe { &mut MERKLE_MAP };
        let mut data = kvpair.get(&Self::get_key(market_id));
        if data.is_empty() {
            return None;
        }
        let mut u64data = data.iter_mut();
        Some(Self::from_data(&mut u64data))
    }

    pub fn is_close(&self) -> bool {
        self.status == MARKET_STATUS_CLOSE
    }
}

// 可以为status定义常量
pub const MARKET_STATUS_OPEN: u64 = 1;
pub const MARKET_STATUS_CLOSE: u64 = 0;

impl StorageData for Market {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let market_id = *u64data.next().unwrap();
        let status = *u64data.next().unwrap();
        let token_a = *u64data.next().unwrap() as u32;
        let token_b = *u64data.next().unwrap() as u32;
        Market {
            market_id,
            status,
            token_a,
            token_b,
        }
    }

    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.market_id);
        data.push(self.status);
        data.push(self.token_a as u64);
        data.push(self.token_b as u64);
    }
}

#[derive(Debug, Clone)]
pub struct Token {
    /// token idx
    pub token_idx: u32,
    pub address: [u8; 20], // 20
}

impl Token {
    pub fn new(token_idx: u32, address: [u8; 20]) -> Self {
        Self { token_idx, address }
    }

    pub fn get_key(token_idx: u32) -> [u64; 4] {
        [COMMON_PREFIX, TOKEN_STORE_PREFIX, 0, token_idx as u64]
    }

    pub fn store(&self) {
        zkwasm_rust_sdk::dbg!("store token\n");
        let mut data = Vec::new();
        self.to_data(&mut data);
        let kvpair = unsafe { &mut MERKLE_MAP };
        kvpair.set(&Self::get_key(self.token_idx), data.as_slice());
        zkwasm_rust_sdk::dbg!("end store token\n");
    }

    pub fn load(token_idx: u32) -> Option<Self> {
        zkwasm_rust_sdk::dbg!("load token\n");
        let kvpair = unsafe { &mut MERKLE_MAP };
        let mut data = kvpair.get(&Self::get_key(token_idx));
        if data.is_empty() {
            return None;
        }
        let mut u64data = data.iter_mut();
        zkwasm_rust_sdk::dbg!("end token\n");
        Some(Self::from_data(&mut u64data))
    }
}

impl StorageData for Token {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let token_idx = *u64data.next().unwrap() as u32;
        let mut address = [0u8; 20];
        let data = &[
            *u64data.next().unwrap(),
            *u64data.next().unwrap(),
            *u64data.next().unwrap(),
        ];
        for i in 0..20 {
            address[i] = (data[i / 8] >> (i % 8)) as u8;
        }
        Token { token_idx, address }
    }

    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.token_idx as u64);
        let mut address = [0u64; 3];
        for i in 0..20 {
            address[i / 8] |= (self.address[i] as u64) << (i % 8);
        }
        data.push(address[0]);
        data.push(address[1]);
        data.push(address[2]);
    }
}

#[derive(Debug, Clone)]
pub struct Order {
    /// 唯一id
    pub id: u64,

    /// order类型 (limit or market order)
    pub type_: u8,

    /// order状态 (live/match/partial_match/partial_cancel/cancel)
    pub status: u8,

    /// player id
    pub pid: [u64; 2],

    /// 表示是哪个交易对的order
    pub market_id: u64,

    /// 第0bit表示buy/sell
    pub flag: u8,

    /// 锁定的balance
    pub lock_balance: u64,

    /// limit order 的限价
    /// 买的时候，是买一个b token的价格
    /// 卖的时候，是卖一个 b token的价格
    pub price: u64,

    /// 数量
    /// for limit order buy: number of b token
    /// for market order buy: limit of a token
    /// for limit order sell: number of b token
    /// for market order buy: limit of b token
    pub amount: u64,

    /// 部分成交的数量
    /// 限价买单: 已经买了多少b token
    /// 市价买单: 已经花了多少a token
    /// 限价卖单: 已经卖了多少b token
    /// 市价卖单: 已经卖多少b token
    pub already_deal_amount: u64,
}

impl Order {
    // Order types
    pub const TYPE_LIMIT: u8 = 0;
    pub const TYPE_MARKET: u8 = 1;

    // Order status
    pub const STATUS_LIVE: u8 = 0;
    pub const STATUS_MATCH: u8 = 1;
    pub const STATUS_PARTIAL_MATCH: u8 = 2;
    pub const STATUS_PARTIAL_CANCEL: u8 = 3;
    pub const STATUS_CANCEL: u8 = 4;

    // Order flags
    pub const FLAG_SELL: u8 = 0;
    pub const FLAG_BUY: u8 = 1;

    pub fn new(
        id: u64,
        type_: u8,
        status: u8,
        pid: [u64; 2],
        market_id: u64,
        flag: u8,
        lock_balance: u64,
        price: u64,
        amount: u64,
        already_deal_amount: u64,
    ) -> Self {
        Self {
            id,
            type_,
            status,
            pid,
            market_id,
            flag,
            lock_balance,
            price,
            amount,
            already_deal_amount,
        }
    }

    pub fn get_key(id: u64) -> [u64; 4] {
        [ORDER_PREFIX, 2, 0, id]
    }

    pub fn is_live(&self) -> bool {
        self.status == Order::STATUS_LIVE || self.status == Order::STATUS_PARTIAL_MATCH
    }

    pub fn is_limit_order(&self) -> bool {
        self.type_ == Order::TYPE_LIMIT
    }

    pub fn is_market_order(&self) -> bool {
        self.type_ == Order::TYPE_MARKET
    }

    pub fn is_buy(&self) -> bool {
        self.flag == Order::FLAG_BUY
    }

    pub fn is_sell(&self) -> bool {
        self.flag == Order::FLAG_SELL
    }

    pub fn update_status(&mut self) {
        if self.status == Order::STATUS_CANCEL || self.status == Order::STATUS_PARTIAL_CANCEL {
            return;
        }
        if self.amount == self.already_deal_amount {
            self.status = Order::STATUS_MATCH;
        } else {
            self.status = Order::STATUS_PARTIAL_MATCH;
        }
    }

    pub fn store(&self) {
        zkwasm_rust_sdk::dbg!("store order\n");
        let mut data = Vec::new();
        self.to_data(&mut data);
        let kvpair = unsafe { &mut MERKLE_MAP };
        kvpair.set(&Self::get_key(self.id), data.as_slice());
        zkwasm_rust_sdk::dbg!("end store order\n");
    }

    pub fn load(id: u64) -> Option<Self> {
        zkwasm_rust_sdk::dbg!("load order\n");
        let kvpair = unsafe { &mut MERKLE_MAP };
        let mut data = kvpair.get(&Self::get_key(id));
        if data.is_empty() {
            return None;
        }
        let mut u64data = data.iter_mut();
        Some(Self::from_data(&mut u64data))
    }
}

impl StorageData for Order {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let id = *u64data.next().unwrap();
        let type_ = *u64data.next().unwrap() as u8;
        let status = *u64data.next().unwrap() as u8;
        let pid = [*u64data.next().unwrap(), *u64data.next().unwrap()];
        let market_id = *u64data.next().unwrap();
        let flag = *u64data.next().unwrap() as u8;
        let lock_balance = *u64data.next().unwrap();
        let price = *u64data.next().unwrap();
        let amount = *u64data.next().unwrap();
        let already_deal_amount = *u64data.next().unwrap();
        Order {
            id,
            type_,
            status,
            pid,
            market_id,
            flag,
            lock_balance,
            price,
            amount,
            already_deal_amount,
        }
    }

    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.id);
        data.push(self.type_ as u64);
        data.push(self.status as u64);
        data.push(self.pid[0]);
        data.push(self.pid[1]);
        data.push(self.market_id);
        data.push(self.flag as u64);
        data.push(self.lock_balance);
        data.push(self.price);
        data.push(self.amount);
        data.push(self.already_deal_amount);
    }
}

#[derive(Debug, Clone)]
pub struct Trade {
    /// 唯一id
    pub trade_id: u64,

    /// 买的order id
    pub a_order_id: u64,

    /// 卖的order id
    pub b_order_id: u64,

    /// a的实际数量
    pub a_actual_amount: u64,

    /// b的实际数量
    pub b_actual_amount: u64,
}

impl Trade {
    pub fn new(
        trade_id: u64,
        a_order_id: u64,
        b_order_id: u64,
        a_actual_amount: u64,
        b_actual_amount: u64,
    ) -> Self {
        Self {
            trade_id,
            a_order_id,
            b_order_id,
            a_actual_amount,
            b_actual_amount,
        }
    }

    pub fn get_key(trade_id: u64) -> [u64; 4] {
        [TRADE_PREFIX, 0, 0, trade_id]
    }

    pub fn store(&self) {
        zkwasm_rust_sdk::dbg!("store trade\n");
        let mut data = Vec::new();
        self.to_data(&mut data);
        let kvpair = unsafe { &mut MERKLE_MAP };
        kvpair.set(&Self::get_key(self.trade_id), data.as_slice());
        zkwasm_rust_sdk::dbg!("end store trade\n");
    }

    pub fn load(trade_id: u64) -> Option<Self> {
        zkwasm_rust_sdk::dbg!("load trade\n");
        let kvpair = unsafe { &mut MERKLE_MAP };
        let mut data = kvpair.get(&Self::get_key(trade_id));
        if data.is_empty() {
            return None;
        }
        let mut u64data = data.iter_mut();
        Some(Self::from_data(&mut u64data))
    }
}

impl StorageData for Trade {
    fn from_data(u64data: &mut IterMut<u64>) -> Self {
        let trade_id = *u64data.next().unwrap();
        let a_order_id = *u64data.next().unwrap();
        let b_order_id = *u64data.next().unwrap();
        let a_actual_amount = *u64data.next().unwrap();
        let b_actual_amount = *u64data.next().unwrap();
        Trade {
            trade_id,
            a_order_id,
            b_order_id,
            a_actual_amount,
            b_actual_amount,
        }
    }

    fn to_data(&self, data: &mut Vec<u64>) {
        data.push(self.trade_id);
        data.push(self.a_order_id);
        data.push(self.b_order_id);
        data.push(self.a_actual_amount);
        data.push(self.b_actual_amount);
    }
}

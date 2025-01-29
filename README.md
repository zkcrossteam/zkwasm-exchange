
# 1. 概述
服务端分为两个部分：
1. on chain rollup 部分
2. query service + 撮合

# 2. on chain 部分设计

## 2.1 主要数据结构

### Player 数据结构
| 字段 | 类型 | 描述 |
|------|------|------|
| pid_1 | uint64 | 在第一次出现的时候生成一个 |
| pid_2 | positions | map[uint32(asset id)] uint64用户资产 |

### Market 数据结构
| 字段 | 类型 | 描述 |
|------|------|------|
| market_id | uint64 | market id 对应交易对 |
| status | uint8 | open / close |
| token_a | uint32 | A token的 token idx 比如是usdt |
| token_b | uint32 | B token 的token idx 比如是eth |
|last_deal_price| u64| 最新成交价格 |

### Order 数据结构
| 字段 | 类型 | 描述 |
|------|------|------|
| order_id | uint64 | order 唯一id |
| type | uint8 | order 的类型，limit or market order |
| status | uint8 | live/match/partial_match/partial_cancel/cancel |
| pid | uint64[2] | player id |
| market_id | uint64 | 表示是哪个交易对的order |
| flag | uint8 | 第0bit表示buy/seller |
| lock_balance | uint64 | 锁定的balance(limit buy order a_token/limit sell order b_token/market buy order a token/market sell order b token) |
| price | uint64 | limit order 的限价(买的时候，是买一个b token的价格。卖的时候，是卖一个 b token的价格) |
| b_token_amount | uint64 | 数量 |
| a_token_amount | uint64 | 数量 |
| already_deal_amount | uint64 | 部分成交的数量(限价买单是已经买了多少b token/市价买单是已经花了多少a token/限价卖单是已经卖了多少b token/市价卖单是已经卖多少 b token) |

### Trade 数据结构
| 字段 | 类型 | 描述 |
|------|------|------|
| trade_id | uint64 | id唯一 |
| a_order_id | uint64 | 买的order id |
| b_order_id | uint64 | 卖的order id |
| a_actual_amount | uint64 | a的实际数量 |
| b_atual_amount | uint64 | b的实际数量 |

## 2.2 主要command

### add_market (仅管理员)
参数：
- token_a: uint32
- token_b: uint32
- last_deal_price: u64
### close_market (仅管理员)
参数：
- market_id: uint64

### add_token (仅管理员)
参数：
- token_idx: uint32
- address: (20byte)

### register_player
参数：无

### add_limit_order
参数：
- market_id: uint64
- flag: uint64
- limit price: uint64
- amount: uint64

### add_market_order
参数：
- market_id: uint64
- flag: uint64
- b_token_amount: uint64
- a_token_amount: uint64

### cancel_order
参数：
- order_id: uint64

### add trade
参数：
- a_order_id: uint64
- b_order_id: uint64
- a_actual_amount: uint64
- b_actual_amount: uint64

### transfer (转账)
参数：
- pid_1: uint64
- pid_2: uint64
- token_idx: uint32
- amount: uint64

### deposit (仅管理员)
参数：
- pid_1: uint64
- pid_2: uint64
- token_idx: uint32
- amount: uint64

### withdraw
参数：
- token_idx: uint32
- to_address: 20byte
- amount: uint64
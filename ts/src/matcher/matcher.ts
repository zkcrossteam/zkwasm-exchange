import mongoose from 'mongoose';
// Order class (unchanged from the previous example)
export class Order {
    static TYPE_LIMIT = 0;
    static TYPE_MARKET = 1;
    static STATUS_LIVE = 0;
    static STATUS_MATCH = 1;
    static STATUS_PARTIAL_MATCH = 2;
    static STATUS_PARTIAL_CANCEL = 3;
    static STATUS_CANCEL = 4;
    static FLAG_SELL = 0;
    static FLAG_BUY = 1;

    id: bigint;
    type_: number;
    status: number;
    pid: [bigint, bigint];
    market_id: bigint;
    flag: number;
    lock_balance: bigint;
    lock_fee: bigint;
    price: bigint;
    b_token_amount: bigint;
    a_token_amount: bigint;
    already_deal_amount: bigint;

    // not on chain shadow
    shadow_already_deal_amount: bigint;

    constructor(
        id: bigint,
        type_: number,
        status: number,
        pid: [bigint, bigint],
        market_id: bigint,
        flag: number,
        lock_balance: bigint,
        lock_fee: bigint,
        price: bigint,
        b_token_amount: bigint,
        a_token_amount: bigint,
        already_deal_amount: bigint
    ) {
        this.id = id;
        this.type_ = type_;
        this.status = status;
        this.pid = pid;
        this.market_id = market_id;
        this.flag = flag;
        this.lock_balance = lock_balance;
        this.lock_fee = lock_fee;
        this.price = price;
        this.b_token_amount = b_token_amount;
        this.a_token_amount = a_token_amount;
        this.already_deal_amount = already_deal_amount;
        this.shadow_already_deal_amount = already_deal_amount;
    }

    static fromMongooseDoc(doc: mongoose.Document): Order {
        const obj = doc.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            }
        });
        return new Order(
            obj.id,
            obj.type_,
            obj.status,
            obj.pid,
            obj.market_id,
            obj.flag,
            obj.lock_balance,
            obj.lock_fee,
            obj.price,
            obj.b_token_amount,
            obj.a_token_amount,
            obj.already_deal_amount
        );
    }

    toMongooseDoc(): mongoose.Document {
        return new OrderModel({
            id: this.id,
            type_: this.type_,
            status: this.status,
            pid: this.pid,
            market_id: this.market_id,
            flag: this.flag,
            lock_balance: this.lock_balance,
            lock_fee: this.lock_fee,
            price: this.price,
            b_token_amount: this.b_token_amount,
            a_token_amount: this.a_token_amount,
            already_deal_amount: this.already_deal_amount
        });
    }

    toObject(): { id: bigint, type_: number, status: number, pid: [bigint, bigint], market_id: bigint, flag: number, lock_balance: bigint, lock_fee: bigint, price: bigint, b_token_amount: bigint, a_token_amount: bigint, already_deal_amount: bigint } {
        return {
            id: this.id,
            type_: this.type_,
            status: this.status,
            pid: this.pid,
            market_id: this.market_id,
            flag: this.flag,
            lock_balance: this.lock_balance,
            lock_fee: this.lock_fee,
            price: this.price,
            b_token_amount: this.b_token_amount,
            a_token_amount: this.a_token_amount,
            already_deal_amount: this.already_deal_amount
        };
    }

    static fromObject(obj: { id: bigint, type_: number, status: number, pid: [bigint, bigint], market_id: bigint, flag: number, lock_balance: bigint, lock_fee: bigint, price: bigint, b_token_amount: bigint, a_token_amount: bigint, already_deal_amount: bigint }): Order {
        return new Order(obj.id, obj.type_, obj.status, obj.pid, obj.market_id, obj.flag, obj.lock_balance, obj.lock_fee, obj.price, obj.b_token_amount, obj.a_token_amount, obj.already_deal_amount);
    }

    toJSON() {
        return {
            id: this.id.toString(),
            type_: this.type_.toString(),
            status: this.status.toString(),
            pid: this.pid.map((v) => v.toString()),
            market_id: this.market_id.toString(),
            flag: this.flag.toString(),
            lock_balance: this.lock_balance.toString(),
            lock_fee: this.lock_fee.toString(),
            price: this.price.toString(),
            b_token_amount: this.b_token_amount.toString(),
            a_token_amount: this.a_token_amount.toString(),
            already_deal_amount: this.already_deal_amount.toString()
        };
    }

    static fromJSON(obj: { id: string, type_: string, status: string, pid: string[], market_id: string, flag: string, lock_balance: string, lock_fee: string, price: string, b_token_amount: string, a_token_amount: string, already_deal_amount: string }): Order {
        return new Order(
            BigInt(obj.id),
            Number(obj.type_),
            Number(obj.status),
            obj.pid.map((v) => BigInt(v)) as [bigint, bigint],
            BigInt(obj.market_id),
            Number(obj.flag),
            BigInt(obj.lock_balance),
            BigInt(obj.lock_fee),
            BigInt(obj.price),
            BigInt(obj.b_token_amount),
            BigInt(obj.a_token_amount),
            BigInt(obj.already_deal_amount)
        );
    }

    static fromEvent(data: BigUint64Array): Order {
        return new Order(
            data[0],
            Number(data[1]),
            Number(data[2]),
            [data[3], data[4]],
            data[5],
            Number(data[6]),
            data[7],
            data[8],
            data[9],
            data[10],
            data[11],
            data[12]
        );
    }

    public resetShadow(): void {
        this.shadow_already_deal_amount = this.already_deal_amount;
    }

    public isLive(): boolean {
       let r = this.shadow_already_deal_amount != this.get_amount() && !this.isCancel();
       console.log("isLive", r, this.shadow_already_deal_amount, this.get_amount(), this.isCancel());
       return r;
    }

    public get_amount(): bigint {
        let amount : bigint = this.b_token_amount;
        if(this.isMarketOrder()) {
            amount = this.a_token_amount == 0n ? this.b_token_amount : this.a_token_amount;
        }
        return amount;
    }

    public isCancel(): boolean {
        return this.status == Order.STATUS_CANCEL || this.status == Order.STATUS_PARTIAL_CANCEL;
    }

    public isMarketOrder(): boolean {
        return this.type_ === Order.TYPE_MARKET;
    }

    public isLimitOrder(): boolean {
        return this.type_ == Order.TYPE_LIMIT;
    }
}

export const PRICISION = BigInt(1e9);

// Trade class
export class Trade {
    trade_id: bigint;
    market_id: bigint;
    a_order_id: bigint;
    b_order_id: bigint;
    a_actual_amount: bigint;
    b_actual_amount: bigint;

    constructor(trade_id: bigint, market_id: bigint, a_order_id: bigint, b_order_id: bigint, a_actual_amount: bigint, b_actual_amount: bigint) {
        this.trade_id = trade_id;
        this.market_id = market_id;
        this.a_order_id = a_order_id;
        this.b_order_id = b_order_id;
        this.a_actual_amount = a_actual_amount;
        this.b_actual_amount = b_actual_amount;
    }

    static fromMongooseDoc(doc: mongoose.Document): Trade {
        const obj = doc.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            }
        });
        return new Trade(
            obj.trade_id,
            obj.market_id,
            obj.a_order_id,
            obj.b_order_id,
            obj.a_actual_amount,
            obj.b_actual_amount
        );
    }

    toMongooseDoc(): mongoose.Document {
        return new TradeModel({
            trade_id: this.trade_id,
            market_id: this.market_id,
            a_order_id: this.a_order_id,
            b_order_id: this.b_order_id,
            a_actual_amount: this.a_actual_amount,
            b_actual_amount: this.b_actual_amount
        });
    }

    toObject(): { trade_id: bigint, market_id: bigint, a_order_id: bigint, b_order_id: bigint, a_actual_amount: bigint, b_actual_amount: bigint } {
        return {
            trade_id: this.trade_id,
            market_id: this.market_id,
            a_order_id: this.a_order_id,
            b_order_id: this.b_order_id,
            a_actual_amount: this.a_actual_amount,
            b_actual_amount: this.b_actual_amount
        };
    }

    static fromObject(obj: { trade_id: bigint, market_id: bigint, a_order_id: bigint, b_order_id: bigint, a_actual_amount: bigint, b_actual_amount: bigint }): Trade {
        return new Trade(obj.trade_id, obj.market_id, obj.a_order_id, obj.b_order_id, obj.a_actual_amount, obj.b_actual_amount);
    }

    toJSON() {
        return {
            trade_id: this.trade_id.toString(),
            market_id: this.market_id.toString(),
            a_order_id: this.a_order_id.toString(),
            b_order_id: this.b_order_id.toString(),
            a_actual_amount: this.a_actual_amount.toString(),
            b_actual_amount: this.b_actual_amount.toString()
        };
    }

    static fromJSON(obj: { trade_id: string, market_id: string, a_order_id: string, b_order_id: string, a_actual_amount: string, b_actual_amount: string }): Trade {
        return new Trade(
            BigInt(obj.trade_id),
            BigInt(obj.market_id),
            BigInt(obj.a_order_id),
            BigInt(obj.b_order_id),
            BigInt(obj.a_actual_amount),
            BigInt(obj.b_actual_amount)
        );
    }

    static fromEvent(data: BigUint64Array): Trade {
        return new Trade(
            data[0],
            data[1],
            data[2],
            data[3],
            data[4],
            data[5]
        );
    }
}


// Matching system
export class MatchingSystem {
    private marketId: bigint;
    private bids: Order[];
    private asks: Order[];
    private market_bids: Order[];
    private market_asks: Order[];

    constructor(marketId: bigint) {
        this.marketId = marketId;
        this.bids = [];
        this.asks = [];
        this.market_bids = [];
        this.market_asks = [];
    }

    removeMatchOrder(): void {
        this.bids = this.bids.filter((order) => order.isLive());
        this.asks = this.asks.filter((order) => order.isLive());
        this.market_bids = this.market_bids.filter((order) => order.isLive());
        this.market_asks = this.market_asks.filter((order) => order.isLive());
    }

    // Add a new order to the system
    upsertOrder(order: Order): void {
        if(order.isLimitOrder()) {
            if (order.flag === Order.FLAG_BUY) {
                let findIdx = this.bids.findIndex((o) => o.id === order.id);
                if (findIdx == -1) {
                    this.bids.push(order);
                } else {
                    this.bids[findIdx] = order;
                }
                this.bids.sort((a, b) => {
                    if (a.price === b.price) {
                        return Number(a.id - b.id); // Sort by order id if prices are equal
                    }
                    return Number(b.price - a.price); // Sort by price in descending order
                });
            } else if (order.flag === Order.FLAG_SELL) {
                let findIdx = this.asks.findIndex((o) => o.id === order.id);
                if (findIdx == -1) {
                    this.asks.push(order);
                } else {
                    this.asks[findIdx] = order;
                }
                this.asks.sort((a, b) => {
                    if (a.price === b.price) {
                        return Number(a.id - b.id); // Sort by order id if prices are equal
                    }
                    return Number(a.price - b.price); // Sort by price in ascending order
                });
            }
        }  else if (order.isMarketOrder()) {
            if (order.flag === Order.FLAG_BUY) {
                let findIdx = this.market_bids.findIndex((o) => o.id === order.id);
                if (findIdx == -1) {
                    this.market_bids.push(order);
                } else {
                    this.market_bids[findIdx] = order;
                }
            } else if (order.flag == Order.FLAG_SELL) {
                let findIdx = this.market_asks.findIndex((o) => o.id === order.id);
                if (findIdx == -1) {
                    this.market_asks.push(order);
                } else {
                    this.market_asks[findIdx] = order;
                }
            }
        }
    }

    public tryMatchOrder(): Trade[] {
        this.resetShadow();
        //remove order that status is match and close
        this.removeMatchOrder();
        let trades = this.matchOrders();
        if (trades.length > 0) {
            return trades;
        }

        for (let j = 0; j < this.market_bids.length; j++) {
            let order = this.market_bids[j];
            for (let i = 0; i < this.asks.length; i++) {
                let askOrder = this.asks[i];
                let match = this.canMatch(order, askOrder);
                console.log("match ", match, order, askOrder);
                if (match) {
                    let trade = this.processMatch(order, askOrder);
                    if (trade) {
                        return [trade];
                    }
                }
            }
        }

        for (let j = 0; j < this.market_asks.length; j++) {
            let order = this.market_asks[j];
            for (let i = 0; i < this.bids.length; i++) {
                let bidOrder = this.bids[i];
                if (this.canMatch(order, bidOrder)) {
                    let trade = this.processMatch(order, bidOrder);
                    if (trade) {
                        return [trade];
                    }
                }
            }
        }
        return [];
    }

    resetShadow(): void {
        this.bids.forEach((order) => {
            order.resetShadow();
        });
        this.asks.forEach((order) => {
            order.resetShadow();
        });

        this.market_bids.forEach((order) => {
            order.resetShadow();
        });
        this.market_asks.forEach((order) => {
            order.resetShadow();
        });
    }

    // Match orders
    matchOrders(): Trade[] {
        let i = 0;
        let j = 0;
        let trades: Trade[] = [];

        while (i < this.bids.length && j < this.asks.length) {
            const bid = this.bids[i];
            const ask = this.asks[j];
            let match = this.canMatch(bid, ask);
            console.log("bid ", bid, "ask ", ask, match);
            if (match) {
                const trade = this.processMatch(bid, ask);
                trades.push(trade);
                if (trades.length > 0) {
                    return trades;
                }

                // If either order is fully matched, move to the next order
                if (bid.shadow_already_deal_amount == bid.get_amount()) i++;
                if (ask.shadow_already_deal_amount == ask.get_amount()) j++;
            } else if (bid.price < ask.price) {
                // If the best bid is lower than the best ask, no more matches are possible
                break;
            } else {
                // Move to the next ask if the current ask price is too high
                j++;
            }
        }
        return trades;
    }

    // Check if two orders can be matched
    private canMatch(order1: Order, order2: Order): boolean {
        // console.log("aaaa", order1.shadow_already_deal_amount == order1.amount);
        // Check if either order is already fully matched
        if (order1.shadow_already_deal_amount == order1.get_amount() || order2.shadow_already_deal_amount == order2.get_amount()) {
            return false;
        }

        // console.log("bbbb");
        // Check if orders are for the same market
        if (order1.market_id != order2.market_id) return false;

        // Check if one is a buy and the other is a sell
        if (order1.flag == order2.flag) return false;
        if (order1.flag == Order.FLAG_SELL) {
            let temp = order1;
            order1 = order2;
            order2 = temp;
        }
        console.log("come to here");
        // Check if orders are from different players
        if (order1.pid[0] == order2.pid[0] && order1.pid[1] === order2.pid[1]) return false;
        // Check if orders can be matched based on type and price
        console.log("come to here 2");
        if (order1.type_ == Order.TYPE_LIMIT && order2.type_ == Order.TYPE_LIMIT) {
            // console.log("compare price ", order1.price, order2.price);
            return order1.price >= order2.price;
        } else if (order1.type_ == Order.TYPE_MARKET && order2.type_ == Order.TYPE_MARKET) {
            return false; // Market orders can match with any opposite order
        }

        console.log("can match return true");
        return true;
    }

    // Process the match between two orders
    private processMatch(order1: Order, order2: Order): Trade {
        const buyOrder = order1.flag === Order.FLAG_BUY ? order1 : order2;
        const sellOrder = order1.flag === Order.FLAG_SELL ? order1 : order2;
        if(buyOrder.isLimitOrder() && sellOrder.isLimitOrder()) {
            let price = sellOrder.price;
            const sellLeft = sellOrder.get_amount() - sellOrder.shadow_already_deal_amount;
            const buyLeft = buyOrder.get_amount() - buyOrder.shadow_already_deal_amount;
            const bActualAmount: bigint = buyLeft > sellLeft ? sellLeft : buyLeft; // min
            const aActualAmount = bActualAmount * price/PRICISION;

            // Create and return a Trade
            const trade = new Trade(
                0n,
                buyOrder.market_id,
                buyOrder.id,
                sellOrder.id,
                aActualAmount,
                bActualAmount
            );
            buyOrder.shadow_already_deal_amount += bActualAmount;
            sellOrder.shadow_already_deal_amount += bActualAmount;

            // Log the match
            console.log(`Matched orders: ${buyOrder.id} and ${sellOrder.id} for a: ${aActualAmount} b: ${bActualAmount}`);
            return trade;
        } else if (buyOrder.isMarketOrder() && sellOrder.isLimitOrder()) {
            let price = sellOrder.price;
            const buyLeftToken = buyOrder.get_amount() - buyOrder.shadow_already_deal_amount; // a or b token
            let  buyLeftBToken: bigint;
            if(buyOrder.a_token_amount != 0n) {
                buyLeftBToken = buyLeftToken * PRICISION / price;
            } else {
                buyLeftBToken = buyLeftToken;
            }
            const sellLeftBtoken  = sellOrder.get_amount() - sellOrder.shadow_already_deal_amount;
            const bActualAmount = buyLeftBToken >  sellLeftBtoken ? sellLeftBtoken : buyLeftBToken; // min
            const aActualAmount = bActualAmount * price/PRICISION;

            // Create and return a Trade
            const trade = new Trade(
                0n,
                buyOrder.market_id,
                buyOrder.id,
                sellOrder.id,
                aActualAmount,
                bActualAmount
            );
            buyOrder.shadow_already_deal_amount += bActualAmount;
            sellOrder.shadow_already_deal_amount += bActualAmount;

            // Log the match
            console.log(`Matched orders: ${buyOrder.id} and ${sellOrder.id} for a: ${aActualAmount} b: ${bActualAmount}`);
            return trade;
        } else if (buyOrder.isLimitOrder() && sellOrder.isMarketOrder()) {
            let price = buyOrder.price;
            const buyLeftBToken = buyOrder.get_amount() - buyOrder.shadow_already_deal_amount;
            const sellLefttoken  = sellOrder.get_amount() - sellOrder.shadow_already_deal_amount;
            let sellLeftBtoken: bigint;
            if(sellOrder.a_token_amount != 0n) {
                sellLeftBtoken = sellLefttoken * PRICISION / price;
            } else {
                sellLeftBtoken = sellLefttoken;
            }
            const bActualAmount = buyLeftBToken >  sellLeftBtoken ? sellLeftBtoken : buyLeftBToken; // min
            const aActualAmount = bActualAmount * price/PRICISION;

            // Create and return a Trade
            const trade = new Trade(
                0n,
                buyOrder.market_id,
                buyOrder.id,
                sellOrder.id,
                aActualAmount,
                bActualAmount
            );
            buyOrder.shadow_already_deal_amount += bActualAmount;
            sellOrder.shadow_already_deal_amount += bActualAmount;

            // Log the match
            console.log(`Matched orders: ${buyOrder.id} and ${sellOrder.id} for a: ${aActualAmount} b: ${bActualAmount}`);
            return trade;
        } else {
            throw new Error("both buy and seller is market order, can't match");
        }
    }
}

// Define the schema for the Order model
const orderSchema = new mongoose.Schema({
    id: { type: BigInt, required: true, unique: true },
    type_: { type: Number, required: true, enum: [0, 1] }, // 0: TYPE_LIMIT, 1: TYPE_MARKET
    status: { type: Number, required: true, enum: [0, 1, 2, 3, 4] }, // 0: STATUS_LIVE, 1: STATUS_MATCH, 2: STATUS_PARTIAL_MATCH, 3: STATUS_PARTIAL_CANCEL, 4: STATUS_CANCEL
    pid: { type: [BigInt], required: true, validate: [(v:BigInt[]) => v.length === 2, 'pid must contain exactly two BigInt values'] },
    market_id: { type: BigInt, required: true },
    flag: { type: Number, required: true, enum: [0, 1] }, // 0: FLAG_SELL, 1: FLAG_BUY
    lock_balance: { type: BigInt, required: true },
    lock_fee: { type: BigInt, required: true },
    price: { type: BigInt, required: true },
    b_token_amount: { type: BigInt, required: true },
    a_token_amount: { type: BigInt, required: true },
    already_deal_amount: { type: BigInt, required: true },
});

// Create the Order model
export const OrderModel = mongoose.model('Order', orderSchema);

// Define the schema for the Trade model
const tradeSchema = new mongoose.Schema({
    trade_id: { type: BigInt, required: true, unique: true },
    market_id: { type: BigInt, required: true },
    a_order_id: { type: BigInt, required: true },
    b_order_id: { type: BigInt, required: true },
    a_actual_amount: { type: BigInt, required: true },
    b_actual_amount: { type: BigInt, required: true },
});

// Create the Trade model
export const TradeModel = mongoose.model('Trade', tradeSchema);



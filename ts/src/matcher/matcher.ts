// Order class (unchanged from the previous example)
class Order {
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
    amount: bigint;
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
        amount: bigint,
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
        this.amount = amount;
        this.already_deal_amount = already_deal_amount;
        this.shadow_already_deal_amount = already_deal_amount;
    }

    public resetShadow(): void {
        this.shadow_already_deal_amount = this.already_deal_amount;
    }

    public isLive(): boolean {
        return this.shadow_already_deal_amount != this.amount && !this.isCancel();
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

const PRICISION = BigInt(1e9);

// Trade class
class Trade {
    trade_id: number;
    a_order_id: number;
    b_order_id: number;
    a_actual_amount: number;
    b_actual_amount: number;

    constructor(a_order_id: number, b_order_id: number, a_actual_amount: number, b_actual_amount: number) {
        this.trade_id = 0;
        this.a_order_id = a_order_id;
        this.b_order_id = b_order_id;
        this.a_actual_amount = a_actual_amount;
        this.b_actual_amount = b_actual_amount;
    }
}


// Matching system
class MatchingSystem {
    private marketId: bigint;
    private bids: Order[];
    private asks: Order[];
    private market_bids: Order[];
    private market_asks: Order[];

    constructor() {
        this.marketId = 1n;
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
    upsertOrder(order: Order): Trade[] {
        this.resetShadow();
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
        //remove order that status is match and close
        this.removeMatchOrder();
        let trades = this.matchOrders();
        if(trades.length > 0) {
            return trades;
        }
        for(let i = 0; i < this.asks.length; i++) {
            let askOrder = this.asks[i];
            if(this.canMatch(order, askOrder)) {
                let trade = this.processMatch(order, askOrder);
                if(trade) {
                    return [trade];
                }
            }
        }

        for(let i = 0; i < this.asks.length; i++) {
            let askOrder = this.asks[i];
            if(this.canMatch(order, askOrder)) {
                let trade = this.processMatch(order, askOrder);
                if(trade) {
                    return [trade];
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
            if (this.canMatch(bid, ask)) {
                const trade = this.processMatch(bid, ask);
                trades.push(trade);
                if (trades.length > 0) {
                    return trades;
                }

                // If either order is fully matched, move to the next order
                if (bid.shadow_already_deal_amount == bid.amount) i++;
                if (ask.shadow_already_deal_amount == ask.amount) j++;
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

        if (order1.shadow_already_deal_amount == order1.amount || order2.shadow_already_deal_amount == order2.shadow_already_deal_amount) {
            return false;
        }

        // Check if orders are for the same market
        if (order1.market_id !== order2.market_id) return false;

        // Check if one is a buy and the other is a sell
        if (order1.flag === order2.flag) return false;

        // Check if orders are from different players
        if (order1.pid[0] === order2.pid[0] || order1.pid[0] === order2.pid[1]) return false;

        // Check if orders can be matched based on type and price
        if (order1.type_ === Order.TYPE_LIMIT && order2.type_ === Order.TYPE_LIMIT) {
            return order1.price >= order2.price;
        } else if (order1.type_ === Order.TYPE_MARKET || order2.type_ === Order.TYPE_MARKET) {
            return false; // Market orders can match with any opposite order
        }


        return true;
    }

    // Process the match between two orders
    private processMatch(order1: Order, order2: Order): Trade {
        const buyOrder = order1.flag === Order.FLAG_BUY ? order1 : order2;
        const sellOrder = order1.flag === Order.FLAG_SELL ? order1 : order2;
        if(buyOrder.isLimitOrder() && sellOrder.isLimitOrder()) {
            let price = sellOrder.price;
            const sellLeft = sellOrder.amount - sellOrder.shadow_already_deal_amount;
            const buyLeft = buyOrder.amount - buyOrder.shadow_already_deal_amount;
            const bActualAmount: bigint = buyLeft > sellLeft ? sellLeft : buyLeft; // min
            const aActualAmount = bActualAmount * price;

            // Create and return a Trade
            const trade = new Trade(
                Number(buyOrder.id),
                Number(sellOrder.id),
                Number(aActualAmount),
                Number(bActualAmount)
            );
            buyOrder.shadow_already_deal_amount += bActualAmount;
            sellOrder.shadow_already_deal_amount += bActualAmount;

            // Log the match
            console.log(`Matched orders: ${buyOrder.id} and ${sellOrder.id} for a: ${aActualAmount} b: ${bActualAmount}`);
            return trade;
        } else if (buyOrder.isMarketOrder() && sellOrder.isLimitOrder()) {
            let price = sellOrder.price;
            const buyLeftAToken = buyOrder.amount - buyOrder.shadow_already_deal_amount; // atoken
            const buyLeftBToken = buyLeftAToken*PRICISION/ price;
            const sellLeftBtoken  = sellOrder.amount - sellOrder.shadow_already_deal_amount;
            const bActualAmount = buyLeftBToken >  sellLeftBtoken ? sellLeftBtoken : buyLeftBToken; // min
            const aActualAmount = bActualAmount * price;

            // Create and return a Trade
            const trade = new Trade(
                Number(buyOrder.id),
                Number(sellOrder.id),
                Number(aActualAmount),
                Number(bActualAmount)
            );
            buyOrder.shadow_already_deal_amount += bActualAmount;
            sellOrder.shadow_already_deal_amount += bActualAmount;

            // Log the match
            console.log(`Matched orders: ${buyOrder.id} and ${sellOrder.id} for a: ${aActualAmount} b: ${bActualAmount}`);
            return trade;
        } else if (buyOrder.isLimitOrder() && sellOrder.isMarketOrder()) {
            let price = buyOrder.price;
            const buyLeftBToken = buyOrder.amount - buyOrder.shadow_already_deal_amount;
            const sellLeftBtoken  = sellOrder.amount - sellOrder.shadow_already_deal_amount;
            const bActualAmount = buyLeftBToken >  sellLeftBtoken ? sellLeftBtoken : buyLeftBToken; // min
            const aActualAmount = bActualAmount * price;

            // Create and return a Trade
            const trade = new Trade(
                Number(buyOrder.id),
                Number(sellOrder.id),
                Number(aActualAmount),
                Number(bActualAmount)
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

// Example usage
const matchingSystem = new MatchingSystem();

// Add some sample orders
const order1 = new Order(
    BigInt(1),
    Order.TYPE_LIMIT,
    Order.STATUS_LIVE,
    [BigInt(1), BigInt(2)],
    BigInt(1),
    Order.FLAG_BUY,
    BigInt(1000),
    BigInt(10),
    BigInt(100),
    BigInt(10),
    BigInt(0)
);

const order2 = new Order(
    BigInt(2),
    Order.TYPE_LIMIT,
    Order.STATUS_LIVE,
    [BigInt(3), BigInt(4)],
    BigInt(1),
    Order.FLAG_SELL,
    BigInt(1000),
    BigInt(10),
    BigInt(95),
    BigInt(15),
    BigInt(0)
);

let u1 =matchingSystem.upsertOrder(order1);
let u2 = matchingSystem.upsertOrder(order2);
console.log(JSON.stringify(u1, null, 2));
console.log(JSON.stringify(u2, null, 2));

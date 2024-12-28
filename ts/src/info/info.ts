import mongoose from 'mongoose';

export class Token {
    // token idx
    tokenIdx: number;
    // 40-character hexadecimal Ethereum address
    address: string;

    constructor(tokenIdx: number, address: string) {
        this.tokenIdx = tokenIdx;
        this.address = address;
    }

    static fromMongooseDoc(doc: mongoose.Document): Token {
        const obj = doc.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            }
        });
        return new Token(obj.tokenIdx, obj.address);
    }

    toMongooseDoc(): mongoose.Document {
        return new TokenModel({
            tokenIdx: this.tokenIdx,
            address: this.address,
        });
    }

    toObject(): { tokenIdx: number, address: string } {
        return {
            tokenIdx: this.tokenIdx,
            address: this.address,
        };
    }

    static fromObject(obj: { tokenIdx: number, address: string }): Token {
        return new Token(obj.tokenIdx, obj.address);
    }
}

// Define the schema for the Token model
const tokenSchema = new mongoose.Schema({
    tokenIdx: { type: Number, required: true, unique: true},
    address: {
        type: String,
        required: true,
        validate: {
            validator: function(v: string) {
                return /^[0-9A-Fa-f]{40}$/.test(v);
            },
            message: (props: { value: any; }) => `${props.value} is not a valid 40-character hexadecimal Ethereum address!`
        }
    },
});

// Create the Token model
export const TokenModel = mongoose.model('Token', tokenSchema);

export class Market {
    // market id corresponding to the trading pair
    marketId: number;
    // open / close
    status: number;
    // A token's token idx, e.g., USDT
    tokenA: number;
    // B token's token idx, e.g., ETH
    tokenB: number;

    constructor(marketId: number, status: number, tokenA: number, tokenB: number) {
        this.marketId = marketId;
        this.status = status;
        this.tokenA = tokenA;
        this.tokenB = tokenB;
    }

    static fromMongooseDoc(doc: mongoose.Document): Market {
        const obj = doc.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            }
        });
        return new Market(obj.marketId, obj.status, obj.tokenA, obj.tokenB);
    }

    toMongooseDoc(): mongoose.Document {
        return new MarketModel({
            marketId: this.marketId,
            status: this.status,
            tokenA: this.tokenA,
            tokenB: this.tokenB,
        });
    }

    toObject(): { marketId: number, status: number, tokenA: number, tokenB: number } {
        return {
            marketId: this.marketId,
            status: this.status,
            tokenA: this.tokenA,
            tokenB: this.tokenB,
        };
    }

    static fromObject(obj: { marketId: number, status: number, tokenA: number, tokenB: number }): Market {
        return new Market(obj.marketId, obj.status, obj.tokenA, obj.tokenB);
    }
}

// Constants for status
export const MARKET_STATUS_OPEN: number = 1;
export const MARKET_STATUS_CLOSE: number = 0;

// Define the schema for the Market model
const marketSchema = new mongoose.Schema({
    marketId: { type: Number, required: true, unique: true },
    status: {
        type: Number,
        required: true,
        enum: [0, 1], // 0: MARKET_STATUS_CLOSE, 1: MARKET_STATUS_OPEN
        default: 1 // Default to open
    },
    tokenA: { type: Number, required: true },
    tokenB: { type: Number, required: true },
});

// Create the Market model
export const MarketModel = mongoose.model('Market', marketSchema);


export class Position {
    pid_1: bigint;
    pid_2: bigint;
    token_idx: bigint;
    balance: bigint;
    lock_balance: bigint;
    constructor(pid_1: bigint, pid_2: bigint, token_idx: bigint, balance: bigint, lock_balance: bigint) {
        this.pid_1 = pid_1;
        this.pid_2 = pid_2;
        this.token_idx = token_idx;
        this.balance = balance;
        this.lock_balance = lock_balance;
    }

    static fromMongooseDoc(doc: mongoose.Document): Position {
        const obj = doc.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                return ret;
            }
        });
        return new Position(obj.pid_1, obj.pid_2, obj.token_idx, obj.balance, obj.lock_balance);
    }

    toMongooseDoc(): mongoose.Document {
        return new PositionModel({
            pid_1: this.pid_1,
            pid_2: this.pid_2,
            token_idx: this.token_idx,
            balance: this.balance,
            lock_balance: this.lock_balance
        });
    }

    toObject(): { pid_1: bigint, pid_2: bigint, token_idx: bigint, balance: bigint, lock_balance: bigint } {
        return {
            pid_1: this.pid_1,
            pid_2: this.pid_2,
            token_idx: this.token_idx,
            balance: this.balance,
            lock_balance: this.lock_balance
        };
    }

    static fromObject(obj: { pid_1: bigint, pid_2: bigint, token_idx: bigint, balance: bigint, lock_balance: bigint }): Position {
        return new Position(obj.pid_1, obj.pid_2, obj.token_idx, obj.balance, obj.lock_balance);
    }
}

// 创建 Schema
const PositionSchema = new mongoose.Schema({
    pid_1: {
        type: String,
        required: true
    },
    pid_2: {
        type: String,
        required: true
    },
    token_idx: {
        type: String,
        required: true
    },
    balance: {
        type: String,
        required: true
    },
    lock_balance: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// 添加复合唯一索引
PositionSchema.index(
    { pid_1: 1, pid_2: 1, token_idx: 1 },
    { unique: true }
);

// 创建并导出 Model
export const PositionModel = mongoose.model('Position', PositionSchema);


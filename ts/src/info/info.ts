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

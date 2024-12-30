import { MatchingSystem, Order,PRICISION } from './matcher.js';

{
    console.log("Matcher test(limit order and limit order)");
// Example usage
    const matchingSystem = new MatchingSystem(1n);

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
        PRICISION*BigInt(2),
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
        PRICISION*BigInt(1),
        BigInt(15),
        BigInt(0)
    );

    matchingSystem.upsertOrder(order1);
    matchingSystem.upsertOrder(order2);
    let trades = matchingSystem.tryMatchOrder();
    console.log(JSON.stringify(trades, null, 2));
}

{
    console.log("Matcher test(buy market order and limit order)");
// Example usage
    const matchingSystem = new MatchingSystem(1n);

// Add some sample orders
    const order1 = new Order(
        BigInt(1),
        Order.TYPE_MARKET,
        Order.STATUS_LIVE,
        [BigInt(1), BigInt(2)],
        BigInt(1),
        Order.FLAG_BUY,
        BigInt(1000),
        BigInt(10),
        0n,
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
        PRICISION*BigInt(1),
        BigInt(15),
        BigInt(0)
    );

    matchingSystem.upsertOrder(order1);
    matchingSystem.upsertOrder(order2);
    let trades = matchingSystem.tryMatchOrder();
    console.log(JSON.stringify(trades, null, 2));
}

{
    console.log("Matcher test(buy limit order and sell market order)");
// Example usage
    const matchingSystem = new MatchingSystem(1n);

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
        PRICISION*BigInt(1),
        BigInt(10),
        BigInt(0)
    );

    const order2 = new Order(
        BigInt(2),
        Order.TYPE_MARKET,
        Order.STATUS_LIVE,
        [BigInt(3), BigInt(4)],
        BigInt(1),
        Order.FLAG_SELL,
        BigInt(1000),
        BigInt(10),
        0n,
        BigInt(15),
        BigInt(0)
    );

    matchingSystem.upsertOrder(order1);
    matchingSystem.upsertOrder(order2);
    let trades = matchingSystem.tryMatchOrder();
    console.log(JSON.stringify(trades, null, 2));
}
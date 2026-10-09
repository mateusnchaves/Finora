export type Trade = {
  id: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
  date: string;
  createdAt?: string;
};

export type Position = {
  quantity: number;
  /** Average cost per unit, fees included (Brazilian "preço médio"). */
  averagePrice: number;
  /** Cost of the units still held: quantity × average price. */
  invested: number;
  /** Profit or loss already locked in by sales, net of fees. */
  realized: number;
};

const EPSILON = 1e-9;

function byDate(a: Trade, b: Trade) {
  return a.date.localeCompare(b.date) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

/**
 * Average-cost position, the method the Receita Federal uses for stocks:
 * buys raise the average (fees included); sells keep it and realize
 * (sale price − average) × quantity − sale fees.
 * Throws when a sale exceeds the quantity held at that date.
 */
export function computePosition(trades: Trade[]): Position {
  let quantity = 0;
  let cost = 0;
  let realized = 0;

  for (const trade of [...trades].sort(byDate)) {
    if (trade.type === "buy") {
      quantity += trade.quantity;
      cost += trade.quantity * trade.price + trade.fees;
    } else {
      if (trade.quantity > quantity + EPSILON) {
        throw new OversellError(trade.date, quantity);
      }
      const average = quantity > 0 ? cost / quantity : 0;
      realized += (trade.price - average) * trade.quantity - trade.fees;
      quantity -= trade.quantity;
      cost -= average * trade.quantity;
      if (quantity < EPSILON) {
        quantity = 0;
        cost = 0;
      }
    }
  }

  return {
    quantity,
    averagePrice: quantity > 0 ? cost / quantity : 0,
    invested: cost,
    realized,
  };
}

export class OversellError extends Error {
  constructor(
    public date: string,
    public available: number,
  ) {
    super(`Sale on ${date} exceeds the ${available} units held`);
  }
}

import type {
  Partner,
  CombinedOrder,
  SettlementSummary,
  RefundAdjustment,
  FinalizedOrder,
  ParsedOrder,
  ParsedEarning,
  ParsedCost,
} from "@/types";

export function matchPartner(
  sku: string,
  partners: Partner[]
): Partner | null {
  for (const partner of partners) {
    if (partner.skuSnippet && sku.toLowerCase().includes(partner.skuSnippet.toLowerCase())) {
      return partner;
    }
  }
  return null;
}

export function combineData(
  orders: ParsedOrder[],
  earnings: ParsedEarning[],
  costs: ParsedCost[],
  partners: Partner[],
  channel: string,
  previousOrders: FinalizedOrder[]
): CombinedOrder[] {
  const earningsMap = new Map(earnings.map((e) => [e.orderNumber, e]));
  const costMap = new Map(costs.map((c) => [c.orderNumber, c]));
  const prevMap = new Map(previousOrders.map((p) => [p.orderNumber, p]));

  const seen = new Set<string>();
  const result: CombinedOrder[] = [];

  for (const order of orders) {
    if (seen.has(order.orderNumber)) continue;
    seen.add(order.orderNumber);

    const earning = earningsMap.get(order.orderNumber);
    const cost = costMap.get(order.orderNumber);
    const prev = prevMap.get(order.orderNumber);

    const partner = matchPartner(order.sku, partners);
    const orderEarnings = earning ? earning.orderEarnings : 0;
    const orderCost = cost ? cost.cost : 0;
    const profit = orderEarnings - orderCost;
    const refundFromEarnings = earning ? Math.abs(earning.refunds) : 0;

    const hasEarnings = earning !== undefined;
    const hasCost = cost !== undefined;

    const isFixedFee = partner?.paymentType === "fixed_fee";
    const isComplete = isFixedFee ? hasEarnings : hasEarnings && hasCost;

    let status: CombinedOrder["status"] = "unmatched";
    let refundAmount = 0;
    let previousSettlementMonth: string | null = null;

    if (prev) {
      previousSettlementMonth = prev.settlementMonth;
      const prevRefund = prev.refundAmount ?? 0;
      const currentRefund = earning ? Math.abs(earning.refunds) : 0;

      if (prev.status === "refunded") {
        status = "refunded";
        refundAmount = 0;
      } else if (currentRefund > prevRefund) {
        status = "refunded";
        refundAmount = currentRefund - prevRefund;
      } else {
        status = "paid";
      }
    } else if (partner && isComplete) {
      status = "new";
    } else if (partner && !isComplete) {
      status = "incomplete";
    } else if (!partner && !isComplete) {
      status = "unmatched";
    }

    result.push({
      id: order.orderNumber,
      orderNumber: order.orderNumber,
      sku: order.sku,
      originalSku: order.sku,
      itemTitle: order.itemTitle,
      quantity: order.quantity,
      soldFor: order.soldFor,
      saleDate: order.saleDate,
      earnings: orderEarnings,
      cost: orderCost,
      profit,
      refundFromEarnings,
      hasEarnings,
      hasCost,
      partnerId: partner?.id ?? null,
      partnerName: partner?.name ?? null,
      channel,
      status,
      refundAmount,
      previousSettlementMonth,
      includedInSettlement: status === "new",
    });
  }

  return result;
}

export function recalculateOrder(
  order: CombinedOrder,
  partners: Partner[]
): CombinedOrder {
  const partner = matchPartner(order.sku, partners);
  const profit = (order.earnings ?? 0) - (order.cost ?? 0);

  const isFixedFee = partner?.paymentType === "fixed_fee";
  const isComplete = isFixedFee
    ? order.hasEarnings
    : order.hasEarnings && order.hasCost;

  let status: CombinedOrder["status"] = "unmatched";
  if (order.status === "paid" || order.status === "refunded") {
    status = order.status;
  } else if (partner && isComplete) {
    status = "new";
  } else if (partner && !isComplete) {
    status = "incomplete";
  }

  return {
    ...order,
    partnerId: partner?.id ?? null,
    partnerName: partner?.name ?? null,
    profit,
    status,
  };
}

export function calculateSettlement(
  orders: CombinedOrder[],
  partners: Partner[],
  settlementMonth: string,
  channel: string,
  refundAdjustments: RefundAdjustment[]
): SettlementSummary[] {
  const summaries: SettlementSummary[] = [];

  for (const partner of partners) {
    if (partner.channel !== channel) continue;

    const partnerOrders = orders.filter(
      (o) =>
        o.partnerId === partner.id &&
        o.status === "new" &&
        o.includedInSettlement
    );

    if (partnerOrders.length === 0) continue;

    const totalQuantity = partnerOrders.reduce(
      (sum, o) => sum + o.quantity,
      0
    );
    const totalEarnings = partnerOrders.reduce(
      (sum, o) => sum + o.earnings,
      0
    );
    const totalCost = partnerOrders.reduce(
      (sum, o) => sum + o.cost,
      0
    );
    const totalProfit = totalEarnings - totalCost;

    let grossPayment: number;
    const rate =
      partner.paymentType === "profit_share"
        ? partner.profitPercentage
        : partner.fixedFeePerItem;

    if (partner.paymentType === "profit_share") {
      grossPayment = totalProfit * (partner.profitPercentage / 100);
    } else {
      grossPayment = totalQuantity * partner.fixedFeePerItem;
    }

    const pendingRefunds = refundAdjustments.filter(
      (r) =>
        r.partnerId === partner.id &&
        r.channel === channel &&
        r.appliedToSettlement === null
    );
    const refundDeductions = pendingRefunds.reduce(
      (sum, r) => sum + r.partnerDeduction,
      0
    );

    summaries.push({
      partnerId: partner.id,
      partnerName: partner.name,
      channel,
      settlementMonth,
      totalQuantity,
      totalEarnings,
      totalCost,
      totalProfit,
      paymentType: partner.paymentType,
      rate,
      grossPayment,
      refundDeductions,
      netPayment: grossPayment - refundDeductions,
    });
  }

  return summaries;
}

export function detectRefunds(
  orders: CombinedOrder[],
  partners: Partner[],
  existingRefundOrderNumbers: Set<string>
): RefundAdjustment[] {
  const adjustments: RefundAdjustment[] = [];

  for (const order of orders) {
    if (order.status !== "refunded") continue;
    if (order.refundAmount <= 0) continue;
    if (!order.partnerId) continue;
    if (existingRefundOrderNumbers.has(order.orderNumber)) continue;

    const partner = partners.find((p) => p.id === order.partnerId);
    if (!partner) continue;

    let deduction: number;
    if (partner.paymentType === "profit_share") {
      deduction = order.refundAmount * (partner.profitPercentage / 100);
    } else {
      deduction = order.quantity * partner.fixedFeePerItem;
    }

    adjustments.push({
      orderNumber: order.orderNumber,
      partnerId: partner.id,
      partnerName: partner.name,
      channel: order.channel,
      originalSettlementMonth: order.previousSettlementMonth ?? "",
      refundAmount: order.refundAmount,
      partnerDeduction: deduction,
      dateDetected: new Date().toISOString().split("T")[0],
      appliedToSettlement: null,
    });
  }

  return adjustments;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr;
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

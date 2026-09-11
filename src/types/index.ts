export type PaymentType = "profit_share" | "fixed_fee";

export interface Partner {
  id: string;
  name: string;
  skuSnippet: string;
  paymentType: PaymentType;
  profitPercentage: number;
  fixedFeePerItem: number;
  channel: string;
}

export interface Channel {
  id: string;
  name: string;
}

export interface ParsedOrder {
  orderNumber: string;
  sku: string;
  itemTitle: string;
  quantity: number;
  soldFor: number;
  saleDate: string;
}

export interface ParsedEarning {
  orderNumber: string;
  orderEarnings: number;
  refunds: number;
  grossAmount: number;
}

export interface ParsedCost {
  orderNumber: string;
  cost: number;
}

export type OrderStatus = "new" | "paid" | "refunded" | "unmatched" | "incomplete";

export interface CombinedOrder {
  id: string;
  orderNumber: string;
  sku: string;
  originalSku: string;
  itemTitle: string;
  quantity: number;
  soldFor: number;
  saleDate: string;
  earnings: number;
  cost: number;
  profit: number;
  refundFromEarnings: number;
  hasEarnings: boolean;
  hasCost: boolean;
  partnerId: string | null;
  partnerName: string | null;
  channel: string;
  status: OrderStatus;
  refundAmount: number;
  previousSettlementMonth: string | null;
  includedInSettlement: boolean;
}

export interface SettlementSummary {
  partnerId: string;
  partnerName: string;
  channel: string;
  settlementMonth: string;
  totalQuantity: number;
  totalEarnings: number;
  totalCost: number;
  totalProfit: number;
  paymentType: PaymentType;
  rate: number;
  grossPayment: number;
  refundDeductions: number;
  netPayment: number;
}

export interface RefundAdjustment {
  orderNumber: string;
  partnerId: string;
  partnerName: string;
  channel: string;
  originalSettlementMonth: string;
  refundAmount: number;
  partnerDeduction: number;
  dateDetected: string;
  appliedToSettlement: string | null;
}

export interface FinalizedOrder {
  settlementDate: string;
  channel: string;
  settlementMonth: string;
  orderNumber: string;
  sku: string;
  partnerName: string;
  quantity: number;
  soldFor: number;
  earnings: number;
  cost: number;
  profit: number;
  saleDate: string;
  status: "paid" | "refunded";
}

export interface SheetConfig {
  scriptUrl: string;
  sheetId: string;
  connected: boolean;
}

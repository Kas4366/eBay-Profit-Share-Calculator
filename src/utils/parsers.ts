import {
  parseCSV,
  findColumnIndex,
  parseCurrency,
  parseIntSafe,
  cleanBOM,
} from "./csv";
import type { ParsedOrder, ParsedEarning, ParsedCost } from "@/types";

export function parseOrdersReport(csvText: string): ParsedOrder[] {
  const text = cleanBOM(csvText);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const orderNumIdx = findColumnIndex(headers, ["Order number"]);
  const skuIdx = findColumnIndex(headers, ["Custom label"]);
  const titleIdx = findColumnIndex(headers, ["Item title"]);
  const qtyIdx = findColumnIndex(headers, ["Quantity"]);
  const soldForIdx = findColumnIndex(headers, ["Sold for"]);
  const saleDateIdx = findColumnIndex(headers, ["Sale date"]);

  if (orderNumIdx === -1) {
    throw new Error("Could not find 'Order number' column in the orders report.");
  }

  const orders: ParsedOrder[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c.trim() === "")) continue;
    const orderNumber = row[orderNumIdx]?.trim() ?? "";
    if (!orderNumber) continue;

    orders.push({
      orderNumber,
      sku: skuIdx !== -1 ? (row[skuIdx]?.trim() ?? "") : "",
      itemTitle: titleIdx !== -1 ? (row[titleIdx]?.trim() ?? "") : "",
      quantity: qtyIdx !== -1 ? parseIntSafe(row[qtyIdx] ?? "0") : 1,
      soldFor: soldForIdx !== -1 ? parseCurrency(row[soldForIdx] ?? "0") : 0,
      saleDate: saleDateIdx !== -1 ? (row[saleDateIdx]?.trim() ?? "") : "",
    });
  }
  return orders;
}

export function parseEarningsReport(csvText: string): ParsedEarning[] {
  const text = cleanBOM(csvText);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const orderNumIdx = findColumnIndex(headers, ["Order number"]);
  const earningsIdx = findColumnIndex(headers, ["Order earnings"]);
  const refundsIdx = findColumnIndex(headers, ["Refunds"]);
  const grossIdx = findColumnIndex(headers, ["Gross amount"]);

  if (orderNumIdx === -1) {
    throw new Error(
      "Could not find 'Order number' column in the earnings report."
    );
  }

  const earnings: ParsedEarning[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c.trim() === "")) continue;
    const orderNumber = row[orderNumIdx]?.trim() ?? "";
    if (!orderNumber) continue;

    earnings.push({
      orderNumber,
      orderEarnings:
        earningsIdx !== -1 ? parseCurrency(row[earningsIdx] ?? "0") : 0,
      refunds: refundsIdx !== -1 ? parseCurrency(row[refundsIdx] ?? "0") : 0,
      grossAmount: grossIdx !== -1 ? parseCurrency(row[grossIdx] ?? "0") : 0,
    });
  }
  return earnings;
}

export function parseCostReport(csvText: string): ParsedCost[] {
  const text = cleanBOM(csvText);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const orderNumIdx = findColumnIndex(headers, [
    "Channel Order ID",
    "Order ID",
    "Order number",
  ]);
  const costIdx = findColumnIndex(headers, ["Cost"]);

  if (orderNumIdx === -1) {
    throw new Error(
      "Could not find 'Channel Order ID' column in the cost sheet."
    );
  }

  const costs: ParsedCost[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c.trim() === "")) continue;
    const orderNumber = row[orderNumIdx]?.trim() ?? "";
    if (!orderNumber) continue;

    costs.push({
      orderNumber,
      cost: costIdx !== -1 ? parseCurrency(row[costIdx] ?? "0") : 0,
    });
  }
  return costs;
}

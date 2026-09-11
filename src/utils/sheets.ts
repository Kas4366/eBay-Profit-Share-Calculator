import type {
  SheetConfig,
  Partner,
  Channel,
  FinalizedOrder,
  SettlementSummary,
  RefundAdjustment,
} from "@/types";

const CONFIG_KEY = "ebay_profit_sheet_config";
const PARTNERS_KEY = "ebay_profit_partners";
const CHANNELS_KEY = "ebay_profit_channels";

export function getSheetConfig(): SheetConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { scriptUrl: "", sheetId: "", connected: false };
}

export function saveSheetConfig(config: SheetConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getPartners(): Partner[] {
  try {
    const raw = localStorage.getItem(PARTNERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function savePartners(partners: Partner[]): void {
  localStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
}

export function getChannels(): Channel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [{ id: "default", name: "CC eBay" }];
}

export function saveChannels(channels: Channel[]): void {
  localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
}

export async function testSheetConnection(
  scriptUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "test" }),
    });
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` };
    }
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.status === "ok") {
        return { success: true, message: "Connected successfully." };
      }
      return { success: false, message: data.message || "Unknown response." };
    } catch {
      return { success: false, message: "Invalid response from script." };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed.",
    };
  }
}

export async function syncPartnersToSheet(
  config: SheetConfig,
  partners: Partner[]
): Promise<void> {
  if (!config.connected || !config.scriptUrl) return;
  await fetch(config.scriptUrl, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "syncPartners", partners }),
  });
}

export async function syncChannelsToSheet(
  config: SheetConfig,
  channels: Channel[]
): Promise<void> {
  if (!config.connected || !config.scriptUrl) return;
  await fetch(config.scriptUrl, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "syncChannels", channels }),
  });
}

export async function finalizeToSheet(
  config: SheetConfig,
  orders: FinalizedOrder[],
  summaries: SettlementSummary[],
  refundAdjustments: RefundAdjustment[]
): Promise<{ success: boolean; message: string }> {
  if (!config.connected || !config.scriptUrl) {
    return { success: false, message: "Google Sheet not connected." };
  }
  try {
    const response = await fetch(config.scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "finalize",
        orders,
        summaries,
        refundAdjustments,
      }),
    });
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` };
    }
    const text = await response.text();
    const data = JSON.parse(text);
    if (data.status === "ok") {
      return { success: true, message: "Finalized successfully." };
    }
    return { success: false, message: data.message || "Unknown error." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Finalize failed.",
    };
  }
}

export async function fetchPreviousOrders(
  config: SheetConfig
): Promise<FinalizedOrder[]> {
  if (!config.connected || !config.scriptUrl) return [];
  try {
    const response = await fetch(config.scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getOrders" }),
    });
    if (!response.ok) return [];
    const text = await response.text();
    const data = JSON.parse(text);
    if (data.status === "ok" && Array.isArray(data.orders)) {
      return data.orders as FinalizedOrder[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchHistory(
  config: SheetConfig
): Promise<{ summaries: SettlementSummary[]; refunds: RefundAdjustment[] }> {
  if (!config.connected || !config.scriptUrl) {
    return { summaries: [], refunds: [] };
  }
  try {
    const response = await fetch(config.scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getHistory" }),
    });
    if (!response.ok) return { summaries: [], refunds: [] };
    const text = await response.text();
    const data = JSON.parse(text);
    return {
      summaries: data.status === "ok" ? (data.summaries ?? []) : [],
      refunds: data.status === "ok" ? (data.refunds ?? []) : [],
    };
  } catch {
    return { summaries: [], refunds: [] };
  }
}

export const APPS_SCRIPT_CODE = `/**
 * eBay Profit Sharing - Google Apps Script
 * Paste this code into Extensions > Apps Script in your Google Sheet.
 * Then Deploy > New deployment > Web app.
 * Set "Who has access" to "Anyone".
 * Copy the deployment URL and paste it into the app's Settings page.
 */

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (body.action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'syncPartners') {
    syncPartners(ss, body.partners);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'syncChannels') {
    syncChannels(ss, body.channels);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'finalize') {
    writeOrders(ss, body.orders);
    writeSummaries(ss, body.summaries);
    writeRefundAdjustments(ss, body.refundAdjustments);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'getOrders') {
    var orders = readOrders(ss);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', orders: orders }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'getHistory') {
    var summaries = readSummaries(ss);
    var refunds = readRefunds(ss);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', summaries: summaries, refunds: refunds }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function syncPartners(ss, partners) {
  var headers = ['Partner ID', 'Name', 'SKU Snippet', 'Payment Type', 'Profit Percentage', 'Fixed Fee Per Item', 'Channel'];
  var sheet = getOrCreateSheet(ss, 'Settings', headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  var data = partners.map(function(p) {
    return [p.id, p.name, p.skuSnippet, p.paymentType, p.profitPercentage, p.fixedFeePerItem, p.channel];
  });
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
}

function syncChannels(ss, channels) {
  var headers = ['Channel ID', 'Channel Name'];
  var sheet = getOrCreateSheet(ss, 'Channels', headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  var data = channels.map(function(c) {
    return [c.id, c.name];
  });
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
}

function writeOrders(ss, orders) {
  var headers = ['Settlement Date', 'Channel', 'Settlement Month', 'Order Number', 'SKU', 'Partner Name', 'Quantity', 'Sold For', 'Earnings', 'Cost', 'Profit', 'Sale Date', 'Status'];
  var sheet = getOrCreateSheet(ss, 'Orders', headers);
  var data = orders.map(function(o) {
    return [o.settlementDate, o.channel, o.settlementMonth, o.orderNumber, o.sku, o.partnerName, o.quantity, o.soldFor, o.earnings, o.cost, o.profit, o.saleDate, o.status];
  });
  if (data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
  }
}

function writeSummaries(ss, summaries) {
  var headers = ['Settlement Date', 'Channel', 'Settlement Month', 'Partner Name', 'Payment Type', 'Total Quantity', 'Total Earnings', 'Total Cost', 'Total Profit', 'Rate', 'Gross Payment', 'Refund Deductions', 'Net Payment'];
  var sheet = getOrCreateSheet(ss, 'Payment Summary', headers);
  var data = summaries.map(function(s) {
    return [new Date().toISOString().split('T')[0], s.channel, s.settlementMonth, s.partnerName, s.paymentType, s.totalQuantity, s.totalEarnings, s.totalCost, s.totalProfit, s.rate, s.grossPayment, s.refundDeductions, s.netPayment];
  });
  if (data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
  }
}

function writeRefundAdjustments(ss, refunds) {
  var headers = ['Date Detected', 'Channel', 'Order Number', 'Partner Name', 'Original Settlement Month', 'Refund Amount', 'Partner Deduction', 'Applied to Settlement'];
  var sheet = getOrCreateSheet(ss, 'Refund Adjustments', headers);
  if (refunds.length === 0) return;
  var data = refunds.map(function(r) {
    return [r.dateDetected, r.channel, r.orderNumber, r.partnerName, r.originalSettlementMonth, r.refundAmount, r.partnerDeduction, r.appliedToSettlement || ''];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
}

function readOrders(ss) {
  var sheet = ss.getSheetByName('Orders');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  return values.filter(function(row) { return row[3]; }).map(function(row) {
    return {
      settlementDate: row[0],
      channel: row[1],
      settlementMonth: row[2],
      orderNumber: row[3],
      sku: row[4],
      partnerName: row[5],
      quantity: row[6],
      soldFor: row[7],
      earnings: row[8],
      cost: row[9],
      profit: row[10],
      saleDate: row[11],
      status: row[12]
    };
  });
}

function readSummaries(ss) {
  var sheet = ss.getSheetByName('Payment Summary');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  return values.filter(function(row) { return row[3]; }).map(function(row) {
    return {
      partnerId: '',
      partnerName: row[3],
      channel: row[1],
      settlementMonth: row[2],
      totalQuantity: row[5],
      totalEarnings: row[6],
      totalCost: row[7],
      totalProfit: row[8],
      paymentType: row[4],
      rate: row[9],
      grossPayment: row[10],
      refundDeductions: row[11],
      netPayment: row[12]
    };
  });
}

function readRefunds(ss) {
  var sheet = ss.getSheetByName('Refund Adjustments');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return values.filter(function(row) { return row[2]; }).map(function(row) {
    return {
      dateDetected: row[0],
      channel: row[1],
      orderNumber: row[2],
      partnerName: row[3],
      originalSettlementMonth: row[4],
      refundAmount: row[5],
      partnerDeduction: row[6],
      appliedToSettlement: row[7] || null
    };
  });
}`;

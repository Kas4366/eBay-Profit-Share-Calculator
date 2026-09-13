import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Button, Input, Select, Badge } from "@/components/ui";
import {
  calculateSettlement,
  formatCurrency,
} from "@/utils/calculations";
import {
  Receipt,
  CheckCircle,
  AlertTriangle,
  Lock,
  Package,
  TrendingUp,
} from "lucide-react";
import type { Page } from "@/components/Sidebar";
import type { FinalizedOrder } from "@/types";

export function SettlementPage({
  onNavigate,
}: {
  onNavigate: (p: Page) => void;
}) {
  const {
    combinedOrders,
    partners,
    channels,
    selectedChannel,
    setSelectedChannel,
    refundAdjustments,
    finalizeSettlement,
    sheetConfig,
  } = useApp();

  const [settlementMonth, setSettlementMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  });
  const [selectedPartnerId, setSelectedPartnerId] = useState("all");
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelOrders = useMemo(
    () => combinedOrders.filter((o) => o.channel === selectedChannel),
    [combinedOrders, selectedChannel]
  );

  const channelPartners = useMemo(
    () => partners.filter((p) => p.channel === selectedChannel),
    [partners, selectedChannel]
  );

  const allSummaries = useMemo(
    () =>
      calculateSettlement(
        channelOrders,
        partners,
        settlementMonth,
        selectedChannel,
        refundAdjustments
      ),
    [channelOrders, partners, settlementMonth, selectedChannel, refundAdjustments]
  );

  const summaries = useMemo(() => {
    if (selectedPartnerId === "all") return allSummaries;
    return allSummaries.filter((s) => s.partnerId === selectedPartnerId);
  }, [allSummaries, selectedPartnerId]);

  const includedOrders = channelOrders.filter(
    (o) => o.status === "new" && o.includedInSettlement && o.partnerId !== null
  );

  const incompleteOrders = channelOrders.filter(
    (o) => o.status === "incomplete"
  );

  const excludedCount = channelOrders.filter(
    (o) =>
      o.status === "new" && !o.includedInSettlement && o.partnerId !== null
  ).length;

  const pendingRefunds = refundAdjustments.filter(
    (r) =>
      r.channel === selectedChannel &&
      r.appliedToSettlement === null &&
      (selectedPartnerId === "all" || r.partnerId === selectedPartnerId)
  );

  const selectedPartner = channelPartners.find(
    (p) => p.id === selectedPartnerId
  );

  const selectedPartnerOrders = useMemo(() => {
    if (selectedPartnerId === "all") return includedOrders;
    return includedOrders.filter((o) => o.partnerId === selectedPartnerId);
  }, [includedOrders, selectedPartnerId]);

  const totals = useMemo(() => {
    const totalQty = selectedPartnerOrders.reduce((s, o) => s + o.quantity, 0);
    const totalEarnings = selectedPartnerOrders.reduce(
      (s, o) => s + o.earnings,
      0
    );
    const totalCost = selectedPartnerOrders.reduce((s, o) => s + o.cost, 0);
    const totalProfit = totalEarnings - totalCost;
    return { totalQty, totalEarnings, totalCost, totalProfit };
  }, [selectedPartnerOrders]);

  const handleFinalize = async () => {
    setFinalizing(true);
    setError(null);

    const refundedOrders = channelOrders.filter(
      (o) => o.status === "refunded" && o.refundAmount > 0 && o.partnerId
    );

    const ordersToFinalize: FinalizedOrder[] = [
      ...includedOrders.map((o) => ({
        settlementDate: new Date().toISOString().split("T")[0],
        channel: o.channel,
        settlementMonth,
        orderNumber: o.orderNumber,
        sku: o.sku,
        partnerName: o.partnerName ?? "",
        quantity: o.quantity,
        soldFor: o.soldFor,
        earnings: o.earnings,
        cost: o.cost,
        profit: o.profit,
        saleDate: o.saleDate,
        status: "paid" as const,
        refundAmount: o.refundFromEarnings,
      })),
      ...refundedOrders.map((o) => ({
        settlementDate: new Date().toISOString().split("T")[0],
        channel: o.channel,
        settlementMonth,
        orderNumber: o.orderNumber,
        sku: o.sku,
        partnerName: o.partnerName ?? "",
        quantity: o.quantity,
        soldFor: o.soldFor,
        earnings: o.earnings,
        cost: o.cost,
        profit: o.profit,
        saleDate: o.saleDate,
        status: "refunded" as const,
        refundAmount: o.refundFromEarnings,
      })),
    ];

    const refundsToApply = pendingRefunds.map((r) => ({
      ...r,
      appliedToSettlement: settlementMonth,
    }));

    const success = await finalizeSettlement(
      ordersToFinalize,
      allSummaries,
      refundsToApply
    );

    setFinalizing(false);
    if (success) {
      setFinalized(true);
    } else {
      setError("Failed to finalize. Make sure your Google Sheet is connected.");
    }
  };

  if (finalized) {
    return (
      <div className="p-8 max-w-4xl">
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Settlement Finalized
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            All orders and payment summaries have been recorded to your Google
            Sheet for {settlementMonth} ({selectedChannel}).
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => onNavigate("dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" onClick={() => onNavigate("history")}>
              View History
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (includedOrders.length === 0 && pendingRefunds.length === 0) {
    return (
      <div className="p-8">
        <Card className="p-12">
          <div className="text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders to settle
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {channelOrders.length === 0
                ? "Upload your eBay reports to calculate partner payments."
                : incompleteOrders.length > 0
                ? "Orders are loaded but none are included in the settlement. Review the incomplete orders on the Orders page and tick the checkbox to include them."
                : "Orders are loaded but none matched a partner. Check your partner SKU rules or edit orders on the Orders page."}
            </p>
            <Button onClick={() => onNavigate("upload")}>
              Upload Reports
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlement</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and finalize partner payments
          </p>
        </div>
      </div>

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Channel"
            value={selectedChannel}
            onChange={(v) => {
              setSelectedChannel(v);
              setSelectedPartnerId("all");
            }}
            options={channels.map((c) => ({
              value: c.name,
              label: c.name,
            }))}
          />
          <Select
            label="Partner"
            value={selectedPartnerId}
            onChange={setSelectedPartnerId}
            options={[
              { value: "all", label: "All Partners" },
              ...channelPartners.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
          />
          <Input
            label="Settlement Month"
            type="text"
            value={settlementMonth}
            onChange={setSettlementMonth}
            placeholder="e.g., August 2026"
          />
        </div>
      </Card>

      {!sheetConfig.connected && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Google Sheet not connected.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You can review the settlement, but finalizing requires a
                connected Google Sheet.
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("settings")}>
              Settings
            </Button>
          </div>
        </Card>
      )}

      {incompleteOrders.length > 0 && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {incompleteOrders.length} order(s) are missing earnings or cost
                data and are excluded from this settlement.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Review them on the Orders page and tick the checkbox to include
                any that should be part of this settlement.
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("orders")}>
              Review Orders
            </Button>
          </div>
        </Card>
      )}

      {excludedCount > 0 && (
        <Card className="p-3 mb-4 border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600">
            {excludedCount} order(s) with matched partners are not included in
            this settlement. Go to the Orders page to include them.
          </p>
        </Card>
      )}

      {pendingRefunds.length > 0 && (
        <Card className="p-5 mb-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">
              Pending Refund Deductions ({pendingRefunds.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingRefunds.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-700">
                    {r.orderNumber}
                  </span>
                  <span className="text-gray-600">{r.partnerName}</span>
                  <span className="text-xs text-gray-500">
                    Originally paid: {r.originalSettlementMonth}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    Refund: {formatCurrency(r.refundAmount)}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(r.partnerDeduction)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-teal-600" />
              <p className="text-xs text-gray-500">Total Qty Sold</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {totals.totalQty}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totals.totalEarnings)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-gray-500">Total Cost</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totals.totalCost)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">Total Profit</p>
            </div>
            <p className="text-xl font-bold text-teal-600">
              {formatCurrency(totals.totalProfit)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {includedOrders.length} order(s) included in settlement
            {selectedPartner && ` for ${selectedPartner.name}`}
          </p>
          {incompleteOrders.length > 0 && (
            <Badge variant="qualified">
              {incompleteOrders.length} incomplete excluded
            </Badge>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {summaries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-gray-500">
              No qualified orders found for the selected partner in this channel.
              Make sure your partners have the correct SKU snippets configured,
              or edit orders on the Orders page to assign them manually.
            </p>
          </Card>
        ) : (
          summaries.map((summary) => (
            <Card key={summary.partnerId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {summary.partnerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={
                          summary.paymentType === "profit_share"
                            ? "new"
                            : "qualified"
                        }
                      >
                        {summary.paymentType === "profit_share"
                          ? `Profit Share (${summary.rate}%)`
                          : `Fixed Fee (${formatCurrency(summary.rate)}/item)`}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Net Payment</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {formatCurrency(summary.netPayment)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Qty Sold</p>
                  <p className="text-sm font-medium text-gray-900">
                    {summary.totalQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(summary.totalEarnings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(summary.totalCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Profit</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(summary.totalProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gross Payment</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(summary.grossPayment)}
                  </p>
                </div>
              </div>

              {summary.refundDeductions > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">
                      Refund Deductions
                    </span>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(summary.refundDeductions)}
                  </span>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4" />
          {finalizing
            ? "Finalizing..."
            : !sheetConfig.connected
            ? "Connect your Google Sheet in Settings to enable finalizing."
            : allSummaries.length === 0 && pendingRefunds.length === 0
            ? "No qualifying orders or pending refunds to settle."
            : "Finalizing locks this settlement and records it to your Google Sheet."}
        </div>
        <Button
          size="lg"
          disabled={
            finalizing ||
            !sheetConfig.connected ||
            (allSummaries.length === 0 && pendingRefunds.length === 0)
          }
          onClick={handleFinalize}
        >
          {finalizing ? "Finalizing..." : "Finalize Settlement"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

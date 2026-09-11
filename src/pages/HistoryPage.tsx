import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Badge, Button, Select } from "@/components/ui";
import { formatCurrency } from "@/utils/calculations";
import { fetchHistory } from "@/utils/sheets";
import { History, RefreshCw, AlertTriangle } from "lucide-react";
import type { Page } from "@/components/Sidebar";
import type { SettlementSummary, RefundAdjustment } from "@/types";

export function HistoryPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { sheetConfig, channels } = useApp();
  const [summaries, setSummaries] = useState<SettlementSummary[]>([]);
  const [refunds, setRefunds] = useState<RefundAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    const result = await fetchHistory(sheetConfig);
    setSummaries(result.summaries);
    setRefunds(result.refunds);
    setLoading(false);
  };

  useEffect(() => {
    if (sheetConfig.connected) {
      loadData();
    }
  }, [sheetConfig.connected]);

  const filteredSummaries = useMemo(
    () =>
      channelFilter === "all"
        ? summaries
        : summaries.filter((s) => s.channel === channelFilter),
    [summaries, channelFilter]
  );

  const filteredRefunds = useMemo(
    () =>
      channelFilter === "all"
        ? refunds
        : refunds.filter((r) => r.channel === channelFilter),
    [refunds, channelFilter]
  );

  const months = useMemo(() => {
    const set = new Set(filteredSummaries.map((s) => s.settlementMonth));
    return Array.from(set).sort().reverse();
  }, [filteredSummaries]);

  if (!sheetConfig.connected) {
    return (
      <div className="p-8">
        <Card className="p-12">
          <div className="text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Google Sheet not connected
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Connect your Google Sheet in Settings to view payment history.
            </p>
            <Button onClick={() => onNavigate("settings")}>
              Go to Settings
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
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Past settlement summaries and refund adjustments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={channelFilter}
            onChange={setChannelFilter}
            options={[
              { value: "all", label: "All Channels" },
              ...channels.map((c) => ({ value: c.name, label: c.name })),
            ]}
            className="w-48"
          />
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {filteredRefunds.length > 0 && (
        <Card className="p-5 mb-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">
              Refund Adjustments ({filteredRefunds.length})
            </h3>
          </div>
          <div className="space-y-2">
            {filteredRefunds.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm border-b border-red-100 pb-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-700">
                    {r.orderNumber}
                  </span>
                  <span className="text-gray-600">{r.partnerName}</span>
                  <span className="text-xs text-gray-500">
                    {r.channel}
                  </span>
                  <span className="text-xs text-gray-500">
                    Paid: {r.originalSettlementMonth}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    Refund: {formatCurrency(r.refundAmount)}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(r.partnerDeduction)}
                  </span>
                  {r.appliedToSettlement ? (
                    <Badge variant="paid">Applied to {r.appliedToSettlement}</Badge>
                  ) : (
                    <Badge variant="new">Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {months.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No settlements recorded yet
            </h3>
            <p className="text-sm text-gray-500">
              Once you finalize a settlement, it will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map((month) => {
            const monthSummaries = filteredSummaries.filter(
              (s) => s.settlementMonth === month
            );
            return (
              <Card key={month} className="p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  {month}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          Partner
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          Channel
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          Type
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Earnings
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Cost
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Profit
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Gross
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Deductions
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                          Net Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthSummaries.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {s.partnerName}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {s.channel}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                s.paymentType === "profit_share"
                                  ? "new"
                                  : "qualified"
                              }
                            >
                              {s.paymentType === "profit_share"
                                ? `${s.rate}%`
                                : `${formatCurrency(s.rate)}/item`}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {s.totalQuantity}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrency(s.totalEarnings)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrency(s.totalCost)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrency(s.totalProfit)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrency(s.grossPayment)}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600">
                            {s.refundDeductions > 0
                              ? `-${formatCurrency(s.refundDeductions)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-teal-600">
                            {formatCurrency(s.netPayment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

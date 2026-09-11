import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/utils/calculations";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
  Upload,
  Receipt,
} from "lucide-react";
import type { Page } from "@/components/Sidebar";

export function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const {
    combinedOrders,
    partners,
    channels,
    selectedChannel,
    setSelectedChannel,
    refundAdjustments,
    sheetConfig,
  } = useApp();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");

  const channelPartners = useMemo(
    () => partners.filter((p) => p.channel === selectedChannel),
    [partners, selectedChannel]
  );

  const filteredOrders = useMemo(
    () =>
      combinedOrders.filter(
        (o) =>
          o.channel === selectedChannel &&
          (selectedPartnerId === "all" || o.partnerId === selectedPartnerId)
      ),
    [combinedOrders, selectedChannel, selectedPartnerId]
  );

  const newOrders = filteredOrders.filter((o) => o.status === "new");
  const incompleteOrders = filteredOrders.filter((o) => o.status === "incomplete");
  const paidOrders = filteredOrders.filter((o) => o.status === "paid");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const unmatchedOrders = filteredOrders.filter((o) => o.status === "unmatched");

  const totalSold = newOrders.reduce((s, o) => s + o.soldFor, 0);
  const totalEarnings = newOrders.reduce((s, o) => s + (o.earnings ?? 0), 0);
  const totalCost = newOrders.reduce((s, o) => s + (o.cost ?? 0), 0);
  const totalRefunds = newOrders.reduce(
    (s, o) => s + (o.refundFromEarnings ?? 0),
    0
  );
  const totalProfit = totalEarnings - totalCost;

  const pendingRefundDeductions = refundAdjustments
    .filter(
      (r) =>
        r.channel === selectedChannel &&
        r.appliedToSettlement === null &&
        (selectedPartnerId === "all" || r.partnerId === selectedPartnerId)
    )
    .reduce((s, r) => s + r.partnerDeduction, 0);

  const stats = [
    {
      label: "New Orders",
      value: newOrders.length,
      icon: Package,
      color: "text-teal-600 bg-teal-50",
    },
    {
      label: "Total Profit",
      value: formatCurrency(totalProfit),
      icon: TrendingUp,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Refunded Orders",
      value: refundedOrders.length,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Active Partners",
      value: channelPartners.length,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your eBay profit-sharing activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChannel}
            onChange={(e) => {
              setSelectedChannel(e.target.value);
              setSelectedPartnerId("all");
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {channels.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Partners</option>
            {channelPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button onClick={() => onNavigate("upload")}>
            <Upload className="w-4 h-4" />
            Upload Reports
          </Button>
        </div>
      </div>

      {!sheetConfig.connected && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Google Sheet is not connected yet.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect your Google Sheet in Settings to record finalized
                payments and sync partner data.
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("settings")}>
              Go to Settings
            </Button>
          </div>
        </Card>
      )}

      {filteredOrders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders to display
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedPartnerId !== "all"
                ? "No orders found for the selected partner. Try selecting a different partner or upload new reports."
                : "Upload your eBay reports to get started with profit calculations."}
            </p>
            <Button onClick={() => onNavigate("upload")}>
              <Upload className="w-4 h-4" />
              Upload Reports
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="qualified">New</Badge>
                    <span className="text-sm text-gray-600">
                      Qualified for settlement
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {newOrders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="paid">Paid</Badge>
                    <span className="text-sm text-gray-600">
                      Already settled
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {paidOrders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="refunded">Refunded</Badge>
                    <span className="text-sm text-gray-600">
                      Refunded after settlement
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {refundedOrders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="incomplete">Incomplete</Badge>
                    <span className="text-sm text-gray-600">
                      Missing earnings or cost data
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {incompleteOrders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="unmatched">Unmatched</Badge>
                    <span className="text-sm text-gray-600">
                      No partner SKU match
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {unmatchedOrders.length}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Financial Summary (New Orders)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Sold</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(totalSold)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Refunds</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatCurrency(totalRefunds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Cost</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">
                    Total Profit
                  </span>
                  <span className="text-sm font-bold text-teal-600">
                    {formatCurrency(totalProfit)}
                  </span>
                </div>
                {pendingRefundDeductions > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-red-600">
                      Pending Refund Deductions
                    </span>
                    <span className="text-sm font-medium text-red-600">
                      {formatCurrency(pendingRefundDeductions)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => onNavigate("settlement")}
                >
                  <Receipt className="w-4 h-4" />
                  Go to Settlement
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

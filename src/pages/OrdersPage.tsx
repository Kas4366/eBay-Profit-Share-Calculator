import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Badge, Button, Input, Select } from "@/components/ui";
import { formatCurrency, truncate } from "@/utils/calculations";
import {
  Package,
  Search,
  Edit2,
  Check,
  X,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Page } from "@/components/Sidebar";
import type { OrderStatus } from "@/types";

const STATUS_BADGE: Record<
  OrderStatus,
  "new" | "paid" | "refunded" | "unmatched" | "qualified" | "incomplete"
> = {
  new: "new",
  paid: "paid",
  refunded: "refunded",
  unmatched: "unmatched",
  incomplete: "incomplete",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  paid: "Paid",
  refunded: "Refunded",
  unmatched: "Unmatched",
  incomplete: "Incomplete",
};

export function OrdersPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const {
    combinedOrders,
    partners,
    updateOrderSku,
    toggleInclusion,
    selectedChannel,
  } = useApp();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState("");

  const channelOrders = useMemo(
    () => combinedOrders.filter((o) => o.channel === selectedChannel),
    [combinedOrders, selectedChannel]
  );

  const filtered = useMemo(() => {
    return channelOrders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (partnerFilter !== "all") {
        if (partnerFilter === "unmatched" && o.partnerId !== null) return false;
        if (partnerFilter !== "unmatched" && o.partnerId !== partnerFilter)
          return false;
      }
      if (search) {
        const lower = search.toLowerCase();
        if (
          !o.orderNumber.toLowerCase().includes(lower) &&
          !o.sku.toLowerCase().includes(lower) &&
          !(o.partnerName?.toLowerCase().includes(lower) ?? false) &&
          !o.itemTitle.toLowerCase().includes(lower)
        )
          return false;
      }
      return true;
    });
  }, [channelOrders, statusFilter, partnerFilter, search]);

  const startEdit = (orderId: string, currentSku: string) => {
    setEditingId(orderId);
    setEditSku(currentSku);
  };

  const saveEdit = (orderId: string) => {
    updateOrderSku(orderId, editSku);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSku("");
  };

  const newCount = channelOrders.filter((o) => o.status === "new").length;
  const incompleteCount = channelOrders.filter(
    (o) => o.status === "incomplete"
  ).length;
  const refundedCount = channelOrders.filter(
    (o) => o.status === "refunded"
  ).length;
  const paidCount = channelOrders.filter((o) => o.status === "paid").length;

  if (channelOrders.length === 0) {
    return (
      <div className="p-8">
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders to display
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your eBay reports to see and manage orders here.
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {channelOrders.length} orders detected from uploaded files for{" "}
            {selectedChannel}
          </p>
        </div>
        <Button onClick={() => onNavigate("settlement")}>
          <TrendingUp className="w-4 h-4" />
          Go to Settlement
        </Button>
      </div>

      {refundedCount > 0 && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {refundedCount} previously paid order(s) have been refunded.
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                These will be deducted from the partner's next settlement
                payment.
              </p>
            </div>
          </div>
        </Card>
      )}

      {incompleteCount > 0 && (
        <Card className="p-4 mb-4 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {incompleteCount} order(s) are missing earnings or cost data.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These are excluded from settlement. Review them and tick the
                checkbox to include if appropriate.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500">New Orders</p>
          <p className="text-2xl font-bold text-teal-600">{newCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Incomplete</p>
          <p className="text-2xl font-bold text-amber-600">{incompleteCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Paid Orders</p>
          <p className="text-2xl font-bold text-blue-600">{paidCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Refunded Orders</p>
          <p className="text-2xl font-bold text-red-600">{refundedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">
            {channelOrders.length}
          </p>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number, SKU, item title, or partner..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "new", label: "New" },
              { value: "incomplete", label: "Incomplete" },
              { value: "paid", label: "Paid" },
              { value: "refunded", label: "Refunded" },
              { value: "unmatched", label: "Unmatched" },
            ]}
            className="w-40"
          />
          <Select
            value={partnerFilter}
            onChange={setPartnerFilter}
            options={[
              { value: "all", label: "All Partners" },
              { value: "unmatched", label: "Unmatched" },
              ...partners
                .filter((p) => p.channel === selectedChannel)
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="w-48"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-400px)]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-center font-medium text-gray-600 w-10">
                  Inc.
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Order Number
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Item Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  SKU (Custom Label)
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Partner
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Sold For
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Earnings
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Refund
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Cost
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Profit
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Sale Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className={
                    order.status === "refunded"
                      ? "bg-red-50"
                      : order.status === "paid"
                      ? "bg-blue-50/50"
                      : order.status === "incomplete"
                      ? "bg-amber-50/50"
                      : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={order.includedInSettlement}
                      onChange={() => toggleInclusion(order.id)}
                      disabled={
                        order.status === "paid" ||
                        order.status === "refunded" ||
                        order.status === "unmatched"
                      }
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                    {order.itemTitle ? (
                      <span title={order.itemTitle}>
                        {truncate(order.itemTitle, 35)}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">no title</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === order.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editSku}
                          onChange={(e) => setEditSku(e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(order.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-700">
                          {order.sku || (
                            <span className="text-gray-400 italic">empty</span>
                          )}
                        </span>
                        {order.status !== "paid" &&
                          order.status !== "refunded" && (
                            <button
                              onClick={() =>
                                startEdit(order.id, order.sku)
                              }
                              className="text-gray-400 hover:text-teal-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {order.partnerName ?? (
                      <span className="text-gray-400 italic">unmatched</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {order.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {formatCurrency(order.soldFor)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {order.hasEarnings
                      ? formatCurrency(order.earnings)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {order.refundFromEarnings > 0
                      ? formatCurrency(order.refundFromEarnings)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {order.hasCost ? formatCurrency(order.cost) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium">
                    {formatCurrency(order.profit)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[order.status]}>
                      {STATUS_LABEL[order.status]}
                    </Badge>
                    {order.status === "refunded" && (
                      <span className="ml-2 text-xs text-red-600">
                        -{formatCurrency(order.refundAmount)}
                      </span>
                    )}
                    {order.status === "incomplete" && (
                      <span className="ml-1 text-xs text-amber-600">
                        {!order.hasEarnings && !order.hasCost
                          ? "missing both"
                          : !order.hasEarnings
                          ? "no earnings"
                          : "no cost"}
                      </span>
                    )}
                    {order.previousSettlementMonth && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({order.previousSettlementMonth})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.saleDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          No orders match your filters.
        </p>
      )}
    </div>
  );
}

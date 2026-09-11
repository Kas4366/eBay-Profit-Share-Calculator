import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Button, Input, Select, Modal, Badge } from "@/components/ui";
import { Users, Plus, Trash2, Edit2 } from "lucide-react";
import type { Partner, PaymentType } from "@/types";

export function PartnersPage() {
  const {
    partners,
    channels,
    selectedChannel,
    setSelectedChannel,
    addPartner,
    updatePartner,
    deletePartner,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    skuSnippet: "",
    paymentType: "profit_share" as PaymentType,
    profitPercentage: "50",
    fixedFeePerItem: "0",
    channel: selectedChannel,
  });

  const channelPartners = partners.filter(
    (p) => p.channel === selectedChannel
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      skuSnippet: "",
      paymentType: "profit_share",
      profitPercentage: "50",
      fixedFeePerItem: "0",
      channel: selectedChannel,
    });
    setShowModal(true);
  };

  const openEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setForm({
      name: partner.name,
      skuSnippet: partner.skuSnippet,
      paymentType: partner.paymentType,
      profitPercentage: String(partner.profitPercentage),
      fixedFeePerItem: String(partner.fixedFeePerItem),
      channel: partner.channel,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.skuSnippet.trim()) return;

    const data = {
      name: form.name.trim(),
      skuSnippet: form.skuSnippet.trim(),
      paymentType: form.paymentType,
      profitPercentage: parseFloat(form.profitPercentage) || 0,
      fixedFeePerItem: parseFloat(form.fixedFeePerItem) || 0,
      channel: form.channel,
    };

    if (editingId) {
      updatePartner(editingId, data);
    } else {
      addPartner(data);
    }
    setShowModal(false);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your profit-sharing partners and their SKU matching rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedChannel}
            onChange={setSelectedChannel}
            options={channels.map((c) => ({
              value: c.name,
              label: c.name,
            }))}
            className="w-48"
          />
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Add Partner
          </Button>
        </div>
      </div>

      {channelPartners.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No partners yet for {selectedChannel}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Add a partner and set their SKU text snippet so the system can
              automatically match orders to them.
            </p>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" />
              Add Partner
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {channelPartners.map((partner) => (
            <Card key={partner.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {partner.name}
                    </h3>
                    <p className="text-xs text-gray-500">{partner.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(partner)}
                    className="text-gray-400 hover:text-teal-600 p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePartner(partner.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">SKU Match Text</span>
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    {partner.skuSnippet}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Payment Type</span>
                  <Badge
                    variant={
                      partner.paymentType === "profit_share"
                        ? "new"
                        : "qualified"
                    }
                  >
                    {partner.paymentType === "profit_share"
                      ? `Profit Share (${partner.profitPercentage}%)`
                      : `Fixed Fee (${partner.fixedFeePerItem}/item)`}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Partner" : "Add Partner"}
      >
        <div className="space-y-4">
          <Input
            label="Partner Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="e.g., John Smith"
          />
          <Input
            label="SKU Match Text"
            value={form.skuSnippet}
            onChange={(v) => setForm({ ...form, skuSnippet: v })}
            placeholder="e.g., Muz (matches any SKU containing this text, case-insensitive)"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setForm({ ...form, paymentType: "profit_share" })
                }
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                  form.paymentType === "profit_share"
                    ? "bg-teal-50 border-teal-500 text-teal-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Profit Share (%)
              </button>
              <button
                onClick={() => setForm({ ...form, paymentType: "fixed_fee" })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                  form.paymentType === "fixed_fee"
                    ? "bg-teal-50 border-teal-500 text-teal-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Fixed Fee (per item)
              </button>
            </div>
          </div>
          {form.paymentType === "profit_share" ? (
            <Input
              label="Profit Share Percentage (%)"
              type="number"
              value={form.profitPercentage}
              onChange={(v) => setForm({ ...form, profitPercentage: v })}
              placeholder="e.g., 50"
            />
          ) : (
            <Input
              label="Fixed Fee Per Item"
              type="number"
              value={form.fixedFeePerItem}
              onChange={(v) => setForm({ ...form, fixedFeePerItem: v })}
              placeholder="e.g., 2.50"
            />
          )}
          <Select
            label="Channel"
            value={form.channel}
            onChange={(v) => setForm({ ...form, channel: v })}
            options={channels.map((c) => ({
              value: c.name,
              label: c.name,
            }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Partner"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

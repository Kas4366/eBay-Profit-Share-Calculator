import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type {
  Partner,
  Channel,
  CombinedOrder,
  SettlementSummary,
  RefundAdjustment,
  FinalizedOrder,
  SheetConfig,
} from "@/types";
import {
  getPartners,
  savePartners,
  getChannels,
  saveChannels,
  getSheetConfig,
  saveSheetConfig,
  fetchPreviousOrders,
  finalizeToSheet,
  syncPartnersToSheet,
  syncChannelsToSheet,
} from "@/utils/sheets";
import { combineData, detectRefunds, recalculateOrder } from "@/utils/calculations";
import type { ParsedOrder, ParsedEarning, ParsedCost } from "@/types";

interface AppState {
  partners: Partner[];
  channels: Channel[];
  sheetConfig: SheetConfig;
  selectedChannel: string;
  combinedOrders: CombinedOrder[];
  previousOrders: FinalizedOrder[];
  refundAdjustments: RefundAdjustment[];
  isProcessing: boolean;
  setSelectedChannel: (channel: string) => void;
  addPartner: (partner: Omit<Partner, "id">) => void;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  addChannel: (name: string) => void;
  deleteChannel: (id: string) => void;
  connectSheet: (scriptUrl: string) => Promise<boolean>;
  processUpload: (
    orders: ParsedOrder[],
    earnings: ParsedEarning[],
    costs: ParsedCost[]
  ) => void;
  updateOrderSku: (orderId: string, newSku: string) => void;
  toggleInclusion: (orderId: string) => void;
  loadPreviousOrders: () => Promise<void>;
  finalizeSettlement: (
    ordersToFinalize: FinalizedOrder[],
    summaries: SettlementSummary[],
    newRefundAdjustments: RefundAdjustment[]
  ) => Promise<boolean>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [partners, setPartners] = useState<Partner[]>(getPartners);
  const [channels, setChannels] = useState<Channel[]>(getChannels);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(getSheetConfig);
  const [selectedChannel, setSelectedChannel] = useState<string>(
    getChannels()[0]?.name ?? ""
  );
  const [combinedOrders, setCombinedOrders] = useState<CombinedOrder[]>([]);
  const [previousOrders, setPreviousOrders] = useState<FinalizedOrder[]>([]);
  const [refundAdjustments, setRefundAdjustments] = useState<RefundAdjustment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addPartner = useCallback((partner: Omit<Partner, "id">) => {
    const newPartner: Partner = { ...partner, id: crypto.randomUUID() };
    setPartners((prev) => {
      const updated = [...prev, newPartner];
      savePartners(updated);
      syncPartnersToSheet(sheetConfig, updated);
      return updated;
    });
  }, [sheetConfig]);

  const updatePartner = useCallback((id: string, updates: Partial<Partner>) => {
    setPartners((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePartners(updated);
      syncPartnersToSheet(sheetConfig, updated);
      return updated;
    });
  }, [sheetConfig]);

  const deletePartner = useCallback((id: string) => {
    setPartners((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePartners(updated);
      syncPartnersToSheet(sheetConfig, updated);
      return updated;
    });
  }, [sheetConfig]);

  const addChannel = useCallback((name: string) => {
    const newChannel: Channel = { id: crypto.randomUUID(), name };
    setChannels((prev) => {
      const updated = [...prev, newChannel];
      saveChannels(updated);
      syncChannelsToSheet(sheetConfig, updated);
      return updated;
    });
  }, [sheetConfig]);

  const deleteChannel = useCallback((id: string) => {
    setChannels((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveChannels(updated);
      syncChannelsToSheet(sheetConfig, updated);
      return updated;
    });
  }, [sheetConfig]);

  const connectSheet = useCallback(async (scriptUrl: string) => {
    const config: SheetConfig = {
      scriptUrl,
      sheetId: "",
      connected: true,
    };
    saveSheetConfig(config);
    setSheetConfig(config);
    syncPartnersToSheet(config, partners);
    syncChannelsToSheet(config, channels);
    return true;
  }, [partners, channels]);

  const processUpload = useCallback(
    (
      orders: ParsedOrder[],
      earnings: ParsedEarning[],
      costs: ParsedCost[]
    ) => {
      setIsProcessing(true);
      try {
        const combined = combineData(
          orders,
          earnings,
          costs,
          partners,
          selectedChannel,
          previousOrders
        );
        setCombinedOrders(combined);

        setRefundAdjustments((prev) => {
          const existing = new Set(prev.map((r) => r.orderNumber));
          const newRefunds = detectRefunds(combined, partners, existing);
          if (newRefunds.length === 0) return prev;
          return [...prev, ...newRefunds];
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [partners, selectedChannel, previousOrders]
  );

  const updateOrderSku = useCallback(
    (orderId: string, newSku: string) => {
      setCombinedOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updated = { ...o, sku: newSku };
          return recalculateOrder(updated, partners);
        })
      );
    },
    [partners]
  );

  const toggleInclusion = useCallback(
    (orderId: string) => {
      setCombinedOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const newIncluded = !o.includedInSettlement;
          const updated = { ...o, includedInSettlement: newIncluded };
          return recalculateOrder(updated, partners);
        })
      );
    },
    [partners]
  );

  const loadPreviousOrders = useCallback(async () => {
    if (!sheetConfig.connected) return;
    const orders = await fetchPreviousOrders(sheetConfig);
    setPreviousOrders(orders);
  }, [sheetConfig]);

  useEffect(() => {
    if (sheetConfig.connected) {
      loadPreviousOrders();
    }
  }, [sheetConfig.connected, loadPreviousOrders]);

  const finalizeSettlement = useCallback(
    async (
      ordersToFinalize: FinalizedOrder[],
      summaries: SettlementSummary[],
      newRefundAdjustments: RefundAdjustment[]
    ) => {
      const result = await finalizeToSheet(
        sheetConfig,
        ordersToFinalize,
        summaries,
        newRefundAdjustments
      );
      if (result.success) {
        setPreviousOrders((prev) => [...prev, ...ordersToFinalize]);
        setCombinedOrders([]);
        setRefundAdjustments([]);
        await loadPreviousOrders();
      }
      return result.success;
    },
    [sheetConfig, loadPreviousOrders]
  );

  return (
    <AppContext.Provider
      value={{
        partners,
        channels,
        sheetConfig,
        selectedChannel,
        combinedOrders,
        previousOrders,
        refundAdjustments,
        isProcessing,
        setSelectedChannel,
        addPartner,
        updatePartner,
        deletePartner,
        addChannel,
        deleteChannel,
        connectSheet,
        processUpload,
        updateOrderSku,
        toggleInclusion,
        loadPreviousOrders,
        finalizeSettlement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

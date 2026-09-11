import { useState, useEffect } from "react";
import { AppProvider, useApp } from "@/store/AppContext";
import { Sidebar, type Page } from "@/components/Sidebar";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { SettlementPage } from "@/pages/SettlementPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { HistoryPage } from "@/pages/HistoryPage";

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const { sheetConfig, loadPreviousOrders, combinedOrders } = useApp();

  useEffect(() => {
    if (sheetConfig.connected) {
      loadPreviousOrders();
    }
  }, [sheetConfig.connected, loadPreviousOrders]);

  const navigate = (p: Page) => {
    if (p === "orders" && combinedOrders.length === 0) {
      setPage("upload");
      return;
    }
    if (p === "settlement" && combinedOrders.length === 0) {
      setPage("upload");
      return;
    }
    setPage(p);
  };

  return (
    <Sidebar currentPage={page} onNavigate={navigate}>
      {page === "dashboard" && <DashboardPage onNavigate={navigate} />}
      {page === "upload" && <UploadPage onNavigate={navigate} />}
      {page === "orders" && <OrdersPage onNavigate={navigate} />}
      {page === "settlement" && <SettlementPage onNavigate={navigate} />}
      {page === "partners" && <PartnersPage />}
      {page === "settings" && <SettingsPage onNavigate={navigate} />}
      {page === "history" && <HistoryPage onNavigate={navigate} />}
    </Sidebar>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

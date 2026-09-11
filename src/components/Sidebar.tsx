import { cn } from "@/utils/cn";
import { useApp } from "@/store/AppContext";
import {
  LayoutDashboard,
  Upload,
  Users,
  Settings,
  History,
  Receipt,
  Package,
} from "lucide-react";
import type { ReactNode } from "react";

export type Page =
  | "dashboard"
  | "upload"
  | "orders"
  | "settlement"
  | "partners"
  | "channels"
  | "history"
  | "settings";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Reports", icon: Upload },
  { id: "orders", label: "Orders", icon: Package },
  { id: "settlement", label: "Settlement", icon: Receipt },
  { id: "partners", label: "Partners", icon: Users },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, children }: SidebarProps) {
  const { sheetConfig, combinedOrders, refundAdjustments } = useApp();

  const refundCount = refundAdjustments.length;
  const ordersCount = combinedOrders.length;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Profit Share</h1>
              <p className="text-xs text-gray-500">eBay Partner Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const badge =
              item.id === "orders" && ordersCount > 0
                ? ordersCount
                : item.id === "settlement" && refundCount > 0
                ? refundCount
                : null;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-xs">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                sheetConfig.connected ? "bg-green-500" : "bg-gray-300"
              )}
            />
            <span className="text-gray-500">
              {sheetConfig.connected
                ? "Google Sheet connected"
                : "Not connected"}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

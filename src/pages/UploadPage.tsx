import { useState, useCallback, useRef } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Button, Select } from "@/components/ui";
import {
  parseOrdersReport,
  parseEarningsReport,
  parseCostReport,
} from "@/utils/parsers";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Package,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import type { Page } from "@/components/Sidebar";
import type { ParsedOrder, ParsedEarning, ParsedCost } from "@/types";

interface UploadZoneProps {
  label: string;
  description: string;
  icon: typeof FileText;
  onFile: (content: string, fileName: string) => void;
  fileName: string | null;
  error: string | null;
  recordCount: number | null;
}

function UploadZone({
  label,
  description,
  icon: Icon,
  onFile,
  fileName,
  error,
  recordCount,
}: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFile(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFile]
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-teal-500 bg-teal-50"
            : fileName
            ? "border-green-300 bg-green-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{fileName}</p>
              {recordCount !== null && (
                <p className="text-xs text-green-600">
                  {recordCount} records found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Click to browse or drag and drop your CSV file here
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </Card>
  );
}

export function UploadPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { channels, selectedChannel, setSelectedChannel, processUpload } =
    useApp();

  const [ordersFile, setOrdersFile] = useState<string | null>(null);
  const [earningsFile, setEarningsFile] = useState<string | null>(null);
  const [costFile, setCostFile] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [earningsCount, setEarningsCount] = useState<number | null>(null);
  const [costCount, setCostCount] = useState<number | null>(null);

  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [parsedEarnings, setParsedEarnings] = useState<ParsedEarning[]>([]);
  const [parsedCosts, setParsedCosts] = useState<ParsedCost[]>([]);

  const handleOrdersFile = (content: string, fileName: string) => {
    setOrdersError(null);
    try {
      const parsed = parseOrdersReport(content);
      setParsedOrders(parsed);
      setOrdersFile(fileName);
      setOrdersCount(parsed.length);
    } catch (err) {
      setOrdersError(
        err instanceof Error ? err.message : "Failed to parse file."
      );
      setOrdersFile(null);
      setOrdersCount(null);
    }
  };

  const handleEarningsFile = (content: string, fileName: string) => {
    setEarningsError(null);
    try {
      const parsed = parseEarningsReport(content);
      setParsedEarnings(parsed);
      setEarningsFile(fileName);
      setEarningsCount(parsed.length);
    } catch (err) {
      setEarningsError(
        err instanceof Error ? err.message : "Failed to parse file."
      );
      setEarningsFile(null);
      setEarningsCount(null);
    }
  };

  const handleCostFile = (content: string, fileName: string) => {
    setCostError(null);
    try {
      const parsed = parseCostReport(content);
      setParsedCosts(parsed);
      setCostFile(fileName);
      setCostCount(parsed.length);
    } catch (err) {
      setCostError(
        err instanceof Error ? err.message : "Failed to parse file."
      );
      setCostFile(null);
      setCostCount(null);
    }
  };

  const canProcess = ordersFile;

  const handleProcess = () => {
    if (!canProcess) return;
    processUpload(parsedOrders, parsedEarnings, parsedCosts);
    onNavigate("orders");
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your eBay reports exactly as downloaded. The system finds the
          right columns automatically.
        </p>
      </div>

      <Card className="p-5 mb-6">
        <Select
          label="Select eBay Channel"
          value={selectedChannel}
          onChange={setSelectedChannel}
          options={channels.map((c) => ({
            value: c.name,
            label: c.name,
          }))}
        />
        <p className="text-xs text-gray-500 mt-2">
          Choose which eBay channel these reports belong to. You can add more
          channels in the Partners page.
        </p>
      </Card>

      <div className="space-y-4">
        <UploadZone
          label="eBay All Orders Report"
          description="Contains order numbers and SKU (Custom label). Download from eBay's order report."
          icon={Package}
          onFile={handleOrdersFile}
          fileName={ordersFile}
          error={ordersError}
          recordCount={ordersCount}
        />

        <UploadZone
          label="Order Earnings Report"
          description="Optional. Contains order numbers and earnings. Upload to include earnings data."
          icon={DollarSign}
          onFile={handleEarningsFile}
          fileName={earningsFile}
          error={earningsError}
          recordCount={earningsCount}
        />

        <UploadZone
          label="Order Cost Sheet"
          description="Optional. Contains order numbers (Channel Order ID) and item cost. Upload to include cost data."
          icon={ShoppingCart}
          onFile={handleCostFile}
          fileName={costFile}
          error={costError}
          recordCount={costCount}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {canProcess
            ? "Ready to process. Click Process to combine and analyze."
            : "Upload at least the eBay All Orders Report to continue."}
        </p>
        <Button
          size="lg"
          disabled={!canProcess}
          onClick={handleProcess}
        >
          Process Reports
        </Button>
      </div>
    </div>
  );
}

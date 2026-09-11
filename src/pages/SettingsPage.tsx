import { useState, useEffect } from "react";
import { useApp } from "@/store/AppContext";
import { Card, Button, Input, Modal } from "@/components/ui";
import {
  Settings as SettingsIcon,
  Link2,
  CheckCircle,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  History,
} from "lucide-react";
import { APPS_SCRIPT_CODE, testSheetConnection } from "@/utils/sheets";
import type { Page } from "@/components/Sidebar";

export function SettingsPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const {
    sheetConfig,
    connectSheet,
    channels,
    addChannel,
    deleteChannel,
    loadPreviousOrders,
  } = useApp();

  const [scriptUrl, setScriptUrl] = useState(sheetConfig.scriptUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (sheetConfig.connected) {
      loadPreviousOrders();
    }
  }, [sheetConfig.connected, loadPreviousOrders]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSheetConnection(scriptUrl);
    setTestResult(result);
    if (result.success) {
      connectSheet(scriptUrl);
    }
    setTesting(false);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddChannel = () => {
    if (newChannelName.trim()) {
      addChannel(newChannelName.trim());
      setNewChannelName("");
      setShowChannelModal(false);
    }
  };

  const handleSync = async () => {
    setSynced(false);
    await loadPreviousOrders();
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your Google Sheet and manage channels
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Google Sheet Connection
            </h3>
            <p className="text-xs text-gray-500">
              Connect a Google Sheet to record finalized payments and sync
              partner data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              sheetConfig.connected ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="text-sm font-medium">
            {sheetConfig.connected
              ? "Connected"
              : "Not connected"}
          </span>
        </div>

        <Input
          label="Google Apps Script Web App URL"
          value={scriptUrl}
          onChange={setScriptUrl}
          placeholder="https://script.google.com/macros/s/.../exec"
        />

        <div className="flex items-center gap-3 mt-3">
          <Button
            onClick={handleTest}
            disabled={!scriptUrl.trim() || testing}
          >
            {testing ? "Testing..." : "Test & Connect"}
          </Button>
          <Button variant="secondary" onClick={() => setShowScript(!showScript)}>
            <SettingsIcon className="w-4 h-4" />
            {showScript ? "Hide" : "Show"} Setup Instructions
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm ${
              testResult.success ? "text-green-600" : "text-red-600"
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {testResult.message}
          </div>
        )}

        {showScript && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              One-Time Setup Guide
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                Create a new Google Sheet (or use an existing one). This is
                where all your data will be stored.
              </li>
              <li>
                In the Google Sheet, click <strong>Extensions</strong> in the
                top menu, then click <strong>Apps Script</strong>.
              </li>
              <li>
                Delete any code in the script editor, then click the{" "}
                <strong>Copy</strong> button below to copy the code, and paste
                it into the script editor.
              </li>
              <li>
                Click <strong>Deploy</strong> (top right), then{" "}
                <strong>New deployment</strong>.
              </li>
              <li>
                Click the gear icon next to "Select type" and choose{" "}
                <strong>Web app</strong>.
              </li>
              <li>
                In "Who has access", select{" "}
                <strong>Anyone</strong> (this is required for the app to
                communicate with your sheet).
              </li>
              <li>
                Click <strong>Deploy</strong>, authorize the permissions when
                prompted, and copy the <strong>Web app URL</strong> it gives
                you.
              </li>
              <li>
                Paste that URL into the field above and click{" "}
                <strong>Test & Connect</strong>.
              </li>
            </ol>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Apps Script Code
                </span>
                <Button size="sm" variant="secondary" onClick={handleCopyScript}>
                  {copied ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        )}

        {sheetConfig.connected && (
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleSync}>
              <History className="w-3 h-3" />
              Sync Previous Orders
            </Button>
            {synced && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Synced successfully
              </span>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                eBay Channels
              </h3>
              <p className="text-xs text-gray-500">
                Manage your eBay selling channels
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowChannelModal(true)}>
            <Plus className="w-4 h-4" />
            Add Channel
          </Button>
        </div>

        <div className="space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700">
                {channel.name}
              </span>
              {channels.length > 1 && (
                <button
                  onClick={() => deleteChannel(channel.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={showChannelModal}
        onClose={() => setShowChannelModal(false)}
        title="Add Channel"
      >
        <div className="space-y-4">
          <Input
            label="Channel Name"
            value={newChannelName}
            onChange={setNewChannelName}
            placeholder="e.g., CC eBay"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowChannelModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddChannel}>Add Channel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

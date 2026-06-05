import { useEffect, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { backupDatabase, getAppSettings, restoreDatabase, saveAppSettings } from "@/services/api";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { useNoticeStore } from "@/stores/notice-store";

const CAPTURE_ENDPOINT = "http://127.0.0.1:38951/capture";
const EXTENSION_PATH = ".\\browser-extension\\atlasx-capture";

function resolveDefaultPath(defaultDirectory: string, fileName: string) {
  if (!defaultDirectory.trim()) return fileName;
  const normalizedDirectory = defaultDirectory.trim().replace(/[\\/]+$/, "");
  const separator = normalizedDirectory.includes("/") && !normalizedDirectory.includes("\\") ? "/" : "\\";
  return `${normalizedDirectory}${separator}${fileName}`;
}

export function SettingsPage() {
  const showNotice = useNoticeStore((state) => state.show);
  const [settings, setSettings] = useState<Record<string, string>>({
    exportDirectory: "",
    dateFormat: "yyyy-MM-dd",
    statuses: "\u5f85\u6574\u7406,\u5df2\u6574\u7406,\u91cd\u70b9,\u5f52\u6863",
    sourceTypes: "chatgpt,claude,gemini,manual",
    aiEndpoint: "",
    aiModel: "",
  });

  useEffect(() => {
    void (async () => {
      const payload = await getAppSettings();
      setSettings((prev) => ({ ...prev, ...payload }));
    })();
  }, []);

  async function pickDirectory() {
    const path = await open({ directory: true, multiple: false });
    if (!path || Array.isArray(path)) return;
    setSettings((prev) => ({ ...prev, exportDirectory: path }));
  }

  async function handleBackup() {
    const defaultFileName = `atlas-x-indexer-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const destination = await save({
      defaultPath: resolveDefaultPath(settings.exportDirectory ?? "", defaultFileName),
      filters: [{ name: "SQLite DB", extensions: ["db", "sqlite"] }],
    });
    if (!destination) return;
    const path = await backupDatabase(destination);
    showNotice({ type: "success", message: `\u6570\u636e\u5e93\u5df2\u5907\u4efd\u5230 ${path}` });
  }

  async function handleRestore() {
    const source = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "SQLite DB", extensions: ["db", "sqlite"] }],
    });
    if (!source || Array.isArray(source)) return;
    if (!window.confirm("\u6062\u590d\u4f1a\u8986\u76d6\u5f53\u524d\u6570\u636e\u5e93\uff0c\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f")) return;
    await restoreDatabase(source);
    showNotice({ type: "success", message: "\u6570\u636e\u5e93\u5df2\u6062\u590d\uff0c\u5efa\u8bae\u91cd\u542f\u5e94\u7528\u540e\u7ee7\u7eed\u64cd\u4f5c\u3002" });
  }

  async function handleSave() {
    await saveAppSettings(settings);
    showNotice({ type: "success", message: "\u8bbe\u7f6e\u5df2\u4fdd\u5b58" });
  }

  async function copyCaptureEndpoint() {
    await navigator.clipboard.writeText(CAPTURE_ENDPOINT);
    showNotice({ type: "success", message: `\u91c7\u96c6\u5730\u5740\u5df2\u590d\u5236\uff1a${CAPTURE_ENDPOINT}` });
  }

  async function copyExtensionPath() {
    await navigator.clipboard.writeText(EXTENSION_PATH);
    showNotice({ type: "success", message: `\u6d4f\u89c8\u5668\u63d2\u4ef6\u76ee\u5f55\u5df2\u590d\u5236\uff1a${EXTENSION_PATH}` });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{"\u8bbe\u7f6e"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{"\u5728\u8fd9\u91cc\u914d\u7f6e\u9ed8\u8ba4\u5bfc\u51fa\u76ee\u5f55\u3001\u65e5\u671f\u683c\u5f0f\u3001\u81ea\u5b9a\u4e49\u72b6\u6001\u3001\u6765\u6e90\u7c7b\u578b\uff0c\u4ee5\u53ca AI \u63a5\u53e3\u548c\u7f51\u9875\u91c7\u96c6\u7684\u9884\u7559\u53c2\u6570\u3002"}</p>
      </div>
      <Card className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">{"\u9ed8\u8ba4\u5bfc\u51fa\u76ee\u5f55"}</span>
          <div className="flex gap-2">
            <Input value={settings.exportDirectory} onChange={(event) => setSettings((prev) => ({ ...prev, exportDirectory: event.target.value }))} />
            <Button variant="outline" onClick={pickDirectory}>{"\u9009\u62e9"}</Button>
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{"\u65e5\u671f\u683c\u5f0f"}</span>
          <Input value={settings.dateFormat} onChange={(event) => setSettings((prev) => ({ ...prev, dateFormat: event.target.value }))} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{"\u72b6\u6001\u679a\u4e3e\uff0c\u4f7f\u7528\u9017\u53f7\u5206\u9694"}</span>
          <Input value={settings.statuses} onChange={(event) => setSettings((prev) => ({ ...prev, statuses: event.target.value }))} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{"\u6765\u6e90\u7c7b\u578b\uff0c\u4f7f\u7528\u9017\u53f7\u5206\u9694"}</span>
          <Input value={settings.sourceTypes} onChange={(event) => setSettings((prev) => ({ ...prev, sourceTypes: event.target.value }))} />
        </label>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">{"AI \u63a5\u53e3\u5730\u5740\u9884\u7559"}</span>
            <Input value={settings.aiEndpoint} onChange={(event) => setSettings((prev) => ({ ...prev, aiEndpoint: event.target.value }))} placeholder="https://api.openai.com/v1" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">{"AI \u6a21\u578b\u9884\u7559"}</span>
            <Input value={settings.aiModel} onChange={(event) => setSettings((prev) => ({ ...prev, aiModel: event.target.value }))} placeholder="gpt-4.1-mini / gpt-5" />
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-sm font-medium">{"\u6570\u636e\u5e93\u5907\u4efd"}</p>
            <p className="mt-2 text-sm text-muted-foreground">{"\u4e00\u952e\u590d\u5236\u5f53\u524d SQLite \u6587\u4ef6\uff0c\u9002\u5408\u5728\u5927\u6279\u91cf\u6574\u7406\u6216\u5bfc\u5165\u524d\u5148\u505a\u5feb\u7167\u3002"}</p>
            <Button className="mt-4" variant="outline" onClick={handleBackup}>{"\u5bfc\u51fa\u5907\u4efd"}</Button>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-sm font-medium">{"\u6570\u636e\u5e93\u6062\u590d"}</p>
            <p className="mt-2 text-sm text-muted-foreground">{"\u6062\u590d\u524d\u8bf7\u786e\u8ba4\u5907\u4efd\u6587\u4ef6\u6765\u6e90\u53ef\u9760\uff0c\u5f53\u524d\u6570\u636e\u5e93\u4f1a\u88ab\u8986\u76d6\u3002"}</p>
            <Button className="mt-4" variant="destructive" onClick={handleRestore}>{"\u4ece\u5907\u4efd\u6062\u590d"}</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4 space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{"\u6d4f\u89c8\u5668\u63d2\u4ef6\u4e0e\u7f51\u9875\u91c7\u96c6"}</p>
          <p>{"Atlas-X \u8fd0\u884c\u65f6\u4f1a\u81ea\u52a8\u76d1\u542c\u672c\u5730\u91c7\u96c6\u7aef\u53e3\u3002Chrome / Edge \u63d2\u4ef6\u53ef\u4ee5\u628a ChatGPT \u548c Gemini \u5bf9\u8bdd\u5148\u9001\u5165\u91c7\u96c6\u6536\u4ef6\u7bb1\uff0c\u518d\u7531\u4f60\u786e\u8ba4\u5165\u5e93\u3002"}</p>
          <p>{"\u672c\u5730\u91c7\u96c6\u5730\u5740\uff1a"}<span className="font-mono text-foreground">{CAPTURE_ENDPOINT}</span></p>
          <p>{"\u6d4f\u89c8\u5668\u63d2\u4ef6\u76ee\u5f55\uff1a"}<span className="font-mono text-foreground">{EXTENSION_PATH}</span></p>
          <p>{"\u684c\u9762 Chrome \u548c Edge \u5171\u7528\u540c\u4e00\u4efd Manifest V3 \u63d2\u4ef6\u4ee3\u7801\u3002\u624b\u673a\u7aef\u540e\u7eed\u5efa\u8bae\u8d70\u5c40\u57df\u7f51\u4e8c\u7ef4\u7801\u91c7\u96c6\u6a21\u5f0f\uff0c\u4e0d\u76f4\u63a5\u4f9d\u8d56 127.0.0.1\u3002"}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyCaptureEndpoint}>{"\u590d\u5236\u91c7\u96c6\u5730\u5740"}</Button>
            <Button variant="outline" onClick={copyExtensionPath}>{"\u590d\u5236\u63d2\u4ef6\u76ee\u5f55"}</Button>
          </div>
        </div>
        <div className="rounded-2xl bg-background/50 p-4 text-sm text-muted-foreground">
          {"\u5f53\u524d AI \u914d\u7f6e\u53ea\u505a\u53c2\u6570\u9884\u7559\uff0c\u6ca1\u6709\u628a\u4efb\u4f55\u4f9b\u5e94\u5546\u5199\u6b7b\u3002\u540e\u7eed\u53ef\u4ee5\u5728 Rust \u670d\u52a1\u5c42\u63a5\u5165\u81ea\u52a8\u6458\u8981\u3001\u81ea\u52a8\u6807\u7b7e\u548c\u76f8\u4f3c\u5ea6\u5224\u65ad\u3002"}
        </div>
        <div className="rounded-2xl bg-background/50 p-4 text-sm text-muted-foreground">
          {"\u5173\u4e8e\uff1aAtlas-X Indexer \u5f53\u524d\u7248\u672c\u4ee5\u672c\u5730\u4f18\u5148\u3001\u79bb\u7ebf\u4f18\u5148\u4e3a\u51c6\uff0c\u751f\u4ea7\u7248\u53ef\u6267\u884c\u6587\u4ef6\u4f1a\u5728 src-tauri/target/release \u4e0b\u751f\u6210\u3002"}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>{"\u4fdd\u5b58\u8bbe\u7f6e"}</Button>
        </div>
      </Card>
    </div>
  );
}
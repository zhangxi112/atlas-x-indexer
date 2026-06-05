import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { EntryFormValues } from "@/schemas/entry-schema";
import {
  approveCaptureInboxItem,
  discardCaptureInboxItems,
  getAppSettings,
  importEntries,
  listCaptureInbox,
  listEntries,
  recordExportLog,
  updateCaptureInboxItem,
} from "@/services/api";
import {
  buildImportIssueRows,
  buildImportPreview,
  exportEntriesFile,
  exportImportIssuesFile,
  importFieldLabels,
  inferFieldMapping,
  loadImportFile,
  type FieldMapping,
  type ImportFieldKey,
} from "@/services/import-export";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/shared/input";
import { Textarea } from "@/components/shared/textarea";
import { useNoticeStore } from "@/stores/notice-store";
import type { CaptureInboxItem, EntryListItem, ImportPreviewRow } from "@/types/models";

const CAPTURE_ENDPOINT = "http://127.0.0.1:38951/capture";
const EXTENSION_PATH = ".\\browser-extension\\atlasx-capture";

const TEXT = {
  pageTitle: "\u5bfc\u5165 / \u5bfc\u51fa",
  pageDesc:
    "\u652f\u6301\u5916\u90e8 CSV / Excel / JSON \u6587\u4ef6\u3002\u5f53\u524d\u7248\u672c\u4f1a\u81ea\u52a8\u8bc6\u522b\u5e38\u89c1\u4e2d\u82f1\u6587\u5217\u540d\uff0c\u5e76\u63d0\u4f9b\u5b57\u6bb5\u6620\u5c04\u3001\u9884\u89c8\u3001\u5f02\u5e38\u660e\u7ec6\u3001\u6536\u4ef6\u7bb1\u5ba1\u6838\u548c\u5bfc\u51fa\u76ee\u5f55\u914d\u7f6e\u3002",
  importTitle: "\u5bfc\u5165",
  exportTitle: "\u5bfc\u51fa",
  captureTitle: "ChatGPT / Gemini \u7f51\u9875\u8054\u52a8",
  inboxTitle: "\u91c7\u96c6\u6536\u4ef6\u7bb1",
  noFileTitle: "\u8fd8\u6ca1\u6709\u52a0\u8f7d\u6587\u4ef6",
  noFileDesc:
    "\u9009\u62e9 CSV / Excel / JSON \u6587\u4ef6\u540e\uff0c\u8fd9\u91cc\u4f1a\u5c55\u793a\u5b57\u6bb5\u6620\u5c04\u548c\u5bfc\u5165\u9884\u89c8\u3002Excel \u4f1a\u4f18\u5148\u8bfb\u53d6\u6570\u636e\u6700\u591a\u7684\u5de5\u4f5c\u8868\u3002",
  noInboxTitle: "\u6682\u65e0\u5f85\u5904\u7406\u91c7\u96c6",
  noInboxDesc:
    "\u5f53\u4f60\u5728 ChatGPT / Gemini \u9875\u9762\u70b9\u51fb Atlas-X \u6309\u94ae\u540e\uff0c\u65b0\u91c7\u96c6\u8bb0\u5f55\u4f1a\u5148\u8fdb\u5165\u8fd9\u4e2a\u6536\u4ef6\u7bb1\uff0c\u7531\u4f60\u624b\u52a8\u786e\u8ba4\u5165\u5e93\u3002",
  importAction: "\u6267\u884c\u5bfc\u5165",
  approveCapture: "\u786e\u8ba4\u5165\u5e93",
  discardCapture: "\u4e22\u5f03",
  saveCapture: "\u4fdd\u5b58\u8349\u7a3f",
  openCaptureUrl: "\u6253\u5f00\u539f\u59cb\u94fe\u63a5",
  copyCaptureUrl: "\u590d\u5236\u94fe\u63a5",
  approveSelected: "\u6279\u91cf\u5165\u5e93",
  discardSelected: "\u6279\u91cf\u4e22\u5f03",
  selectAll: "\u5168\u9009",
  exportCsv: "\u5bfc\u51fa CSV",
  exportExcel: "\u5bfc\u51fa Excel",
  exportJson: "\u5bfc\u51fa JSON",
  exportIssueCsv: "\u5bfc\u51fa\u5f02\u5e38 CSV",
  exportIssueExcel: "\u5bfc\u51fa\u5f02\u5e38 Excel",
  exportIssueJson: "\u5bfc\u51fa\u5f02\u5e38 JSON",
};

type CaptureDraft = {
  title: string;
  sourceType: string;
  favorite: boolean;
  projectName: string;
  topic: string;
  tagsText: string;
  status: string;
  summary: string;
  notes: string;
};

export function ImportExportPage() {
  const showNotice = useNoticeStore((state) => state.show);
  const [allEntries, setAllEntries] = useState<EntryListItem[]>([]);
  const [captureInbox, setCaptureInbox] = useState<CaptureInboxItem[]>([]);
  const [selectedInboxIds, setSelectedInboxIds] = useState<number[]>([]);
  const [captureDrafts, setCaptureDrafts] = useState<Record<number, CaptureDraft>>({});
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableSourceTypes, setAvailableSourceTypes] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [importPayload, setImportPayload] = useState<EntryFormValues[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceKind, setSourceKind] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [dedupeStrategy, setDedupeStrategy] = useState<"skip" | "overwrite">("skip");
  const [exportDirectory, setExportDirectory] = useState("");

  async function loadPageData() {
    const [data, settings, inboxItems] = await Promise.all([
      listEntries({
        query: "",
        tags: [],
        favoritesOnly: false,
        sortBy: "updated_at",
        sortOrder: "desc",
        page: 1,
        pageSize: 5000,
        viewMode: "table",
      }),
      getAppSettings(),
      listCaptureInbox(),
    ]);
    setAllEntries(data.items);
    setAvailableStatuses(data.statuses);
    setAvailableSourceTypes(data.sourceTypes);
    setExportDirectory(settings.exportDirectory ?? "");
    setCaptureInbox(inboxItems);
    setCaptureDrafts(
      Object.fromEntries(
        inboxItems.map((item) => [
          item.id,
          {
            title: item.title,
            sourceType: item.sourceType,
            favorite: item.favorite,
            projectName: item.projectName ?? "",
            topic: item.topic ?? "",
            tagsText: item.tags.join(", "),
            status: item.status,
            summary: item.summary,
            notes: item.notes ?? "",
          },
        ]),
      ),
    );
    setSelectedInboxIds((prev) => prev.filter((id) => inboxItems.some((item) => item.id === id)));
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  useEffect(() => {
    if (!rawRows.length) return;
    const result = buildImportPreview(rawRows, allEntries, mapping);
    setPreview(result.preview);
    setImportPayload(result.entries);
  }, [rawRows, allEntries, mapping]);

  function toCapturePayload(item: CaptureInboxItem): EntryFormValues {
    const draft = captureDrafts[item.id] ?? {
      title: item.title,
      sourceType: item.sourceType,
      favorite: item.favorite,
      projectName: item.projectName ?? "",
      topic: item.topic ?? "",
      tagsText: item.tags.join(", "),
      status: item.status,
      summary: item.summary,
      notes: item.notes ?? "",
    };

    return {
      customId: "",
      title: item.title,
      summary: draft.summary,
      url: item.url,
      sourceType: item.sourceType,
      projectName: draft.projectName,
      topic: item.topic ?? "",
      tags: draft.tagsText
        .split(/[;,，]/)
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      conversationDate: item.conversationDate,
      notes: draft.notes,
      status: draft.status || item.status,
      favorite: item.favorite,
    };
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await loadImportFile(file);
      setRawRows(result.rows);
      setHeaders(result.headers);
      setMapping(inferFieldMapping(result.headers));
      setFileName(file.name);
      setSourceKind(result.sourceKind);
      setSheetName(result.sheetName ?? "");
      const sheetInfo = result.sheetName ? `\uff0c\u5de5\u4f5c\u8868\uff1a${result.sheetName}` : "";
      showNotice({ type: "success", message: `\u5df2\u8f7d\u5165 ${result.sourceKind.toUpperCase()} \u6587\u4ef6\uff1a${file.name}${sheetInfo}` });
    } catch (error) {
      console.error(error);
      showNotice({ type: "error", message: "\u6587\u4ef6\u89e3\u6790\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u683c\u5f0f\u540e\u91cd\u8bd5\u3002" });
    }
  }

  async function handleImport() {
    if (!importPayload.length) return;
    const result = await importEntries({
      sourceFileName: fileName,
      fileType: fileName.split(".").pop() ?? "unknown",
      dedupeStrategy,
      entries: importPayload,
    });

    const errorInfo = result.errors.length ? `\uff0c\u9519\u8bef ${result.errors.length} \u6761` : "";
    showNotice({
      type: result.errors.length ? "info" : "success",
      message: `\u5bfc\u5165\u5b8c\u6210\uff1a\u6210\u529f ${result.imported} \u6761\uff0c\u8df3\u8fc7 ${result.skipped} \u6761${errorInfo}`,
    });
    await loadPageData();
  }

  async function handleExport(format: "csv" | "xlsx" | "json") {
    const path = await exportEntriesFile(allEntries, format, exportDirectory);
    if (!path) return;
    await recordExportLog({
      fileName: path.split(/[/\\]/).pop() ?? path,
      fileType: format,
      rows: allEntries.length,
      targetPath: path,
    });
    showNotice({ type: "success", message: `\u5bfc\u51fa\u5b8c\u6210\uff1a${path}` });
    await loadPageData();
  }

  async function handleExportIssues(format: "csv" | "xlsx" | "json") {
    const issueRows = buildImportIssueRows(preview);
    if (!issueRows.length) return;
    const path = await exportImportIssuesFile(issueRows, format, exportDirectory);
    if (!path) return;
    showNotice({ type: "success", message: `\u5f02\u5e38\u62a5\u544a\u5df2\u5bfc\u51fa\uff1a${path}` });
  }

  async function handleSaveCaptureDraft(item: CaptureInboxItem) {
    await updateCaptureInboxItem(item.id, toCapturePayload(item));
    showNotice({ type: "success", message: `\u5df2\u4fdd\u5b58\u6536\u4ef6\u7bb1\u8349\u7a3f\uff1a${item.title}` });
    await loadPageData();
  }

  async function handleApproveCapture(item: CaptureInboxItem) {
    await updateCaptureInboxItem(item.id, toCapturePayload(item));
    const record = await approveCaptureInboxItem(item.id);
    showNotice({ type: "success", message: `\u5df2\u5165\u5e93\uff1a${record.customId} / ${record.title}` });
    await loadPageData();
  }

  async function handleApproveSelected() {
    if (!selectedInboxIds.length) return;
    for (const id of selectedInboxIds) {
      const item = captureInbox.find((entry) => entry.id === id);
      if (!item) continue;
      await updateCaptureInboxItem(id, toCapturePayload(item));
      await approveCaptureInboxItem(id);
    }
    showNotice({ type: "success", message: `\u5df2\u6279\u91cf\u5165\u5e93 ${selectedInboxIds.length} \u6761\u91c7\u96c6\u8bb0\u5f55` });
    setSelectedInboxIds([]);
    await loadPageData();
  }

  async function handleOpenCaptureUrl(item: CaptureInboxItem) {
    await openUrl(item.url);
  }

  async function handleCopyCaptureUrl(item: CaptureInboxItem) {
    await navigator.clipboard.writeText(item.url);
    showNotice({ type: "success", message: `\u5df2\u590d\u5236\u91c7\u96c6\u94fe\u63a5\uff1a${item.title}` });
  }

  async function handleDiscardCapture(id: number) {
    await discardCaptureInboxItems([id]);
    showNotice({ type: "success", message: "\u5df2\u4ece\u6536\u4ef6\u7bb1\u79fb\u9664\u8be5\u91c7\u96c6\u9879\u3002" });
    await loadPageData();
  }

  async function handleDiscardSelected() {
    if (!selectedInboxIds.length) return;
    await discardCaptureInboxItems(selectedInboxIds);
    showNotice({ type: "success", message: `\u5df2\u6279\u91cf\u79fb\u9664 ${selectedInboxIds.length} \u6761\u91c7\u96c6\u8bb0\u5f55` });
    setSelectedInboxIds([]);
    await loadPageData();
  }

  function toggleInboxSelection(id: number) {
    setSelectedInboxIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllInboxSelection(checked: boolean) {
    setSelectedInboxIds(checked ? captureInbox.map((item) => item.id) : []);
  }

  async function copyCaptureEndpoint() {
    await navigator.clipboard.writeText(CAPTURE_ENDPOINT);
    showNotice({ type: "success", message: `\u672c\u5730\u91c7\u96c6\u5730\u5740\u5df2\u590d\u5236\uff1a${CAPTURE_ENDPOINT}` });
  }

  async function copyExtensionPath() {
    await navigator.clipboard.writeText(EXTENSION_PATH);
    showNotice({ type: "success", message: `\u6d4f\u89c8\u5668\u6269\u5c55\u8def\u5f84\u5df2\u590d\u5236\uff1a${EXTENSION_PATH}` });
  }

  const errorCount = useMemo(() => preview.filter((item) => item.error).length, [preview]);
  const duplicateCount = useMemo(
    () => preview.filter((item) => item.suspectedDuplicateTitle || item.suspectedDuplicateUrl).length,
    [preview],
  );
  const issueRows = useMemo(() => buildImportIssueRows(preview), [preview]);
  const autoMappedCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);
  const allInboxSelected = captureInbox.length > 0 && selectedInboxIds.length === captureInbox.length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{TEXT.pageTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{TEXT.pageDesc}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <h3 className="font-display text-xl font-semibold">{TEXT.importTitle}</h3>
          <input type="file" accept=".csv,.xlsx,.xls,.slsx,.json" onChange={handleFileChange} />
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>{sourceKind ? `\u6587\u4ef6\u7c7b\u578b ${sourceKind.toUpperCase()}` : "\u7b49\u5f85\u8f7d\u5165\u6587\u4ef6"}</Badge>
            {sheetName ? <Badge className="bg-primary/10 text-primary">{`\u5de5\u4f5c\u8868 ${sheetName}`}</Badge> : null}
            {headers.length ? <Badge>{`\u81ea\u52a8\u8bc6\u522b ${autoMappedCount} \u4e2a\u5b57\u6bb5`}</Badge> : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>{"\u91cd\u590d\u5904\u7406\u7b56\u7565"}</span>
            <select className="h-10 rounded-xl border bg-background px-3" value={dedupeStrategy} onChange={(event) => setDedupeStrategy(event.target.value as "skip" | "overwrite")}>
              <option value="skip">{"URL \u91cd\u590d\u65f6\u8df3\u8fc7"}</option>
              <option value="overwrite">{"URL \u91cd\u590d\u65f6\u8986\u76d6"}</option>
            </select>
          </div>

          {headers.length ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{"\u5b57\u6bb5\u6620\u5c04"}</p>
                <p className="text-xs text-muted-foreground">{`\u6587\u4ef6\u5217\uff1a${headers.join(" / ")}`}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {(Object.keys(importFieldLabels) as ImportFieldKey[]).map((field) => (
                  <label key={field} className="space-y-1 text-sm">
                    <span className="text-muted-foreground">{importFieldLabels[field]}</span>
                    <select
                      className="h-10 w-full rounded-xl border bg-background px-3"
                      value={mapping[field] ?? ""}
                      onChange={(event) => setMapping((prev) => ({ ...prev, [field]: event.target.value }))}
                    >
                      <option value="">{"\u81ea\u52a8\u8bc6\u522b / \u7559\u7a7a"}</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {preview.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{`\u9884\u89c8 ${preview.length} \u884c`}</Badge>
                <Badge className="bg-destructive/10 text-destructive">{`\u9519\u8bef ${errorCount}`}</Badge>
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{`\u5f02\u5e38 ${duplicateCount}`}</Badge>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-2xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{"\u884c\u53f7"}</th>
                      <th className="px-3 py-2">{"\u6807\u9898"}</th>
                      <th className="px-3 py-2">URL</th>
                      <th className="px-3 py-2">{"\u6807\u7b7e"}</th>
                      <th className="px-3 py-2">{"\u7ed3\u679c"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-border/60">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.title}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.url}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.tags.join(", ") || "-"}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.error
                            ? row.error
                            : row.suspectedDuplicateUrl
                              ? `URL \u91cd\u590d\uff1a${row.duplicateUrlMatch ?? "\u5df2\u5b58\u5728\u8bb0\u5f55"}`
                              : row.suspectedDuplicateTitle
                                ? `\u6807\u9898\u7591\u4f3c\u91cd\u590d\uff1a${row.duplicateTitleMatch ?? "\u5b58\u5728\u76f8\u4f3c\u6807\u9898"}`
                                : "\u53ef\u5bfc\u5165"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {issueRows.length ? (
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{"\u5f02\u5e38\u660e\u7ec6"}</p>
                    <p className="text-xs text-muted-foreground">{"\u4f1a\u968f\u5f02\u5e38\u62a5\u544a\u4e00\u8d77\u5bfc\u51fa"}</p>
                  </div>
                  <div className="max-h-[220px] overflow-auto rounded-2xl border border-border/60">
                    <table className="min-w-full text-sm">
                      <thead className="bg-secondary/60 text-left text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">{"\u884c\u53f7"}</th>
                          <th className="px-3 py-2">{"\u7c7b\u578b"}</th>
                          <th className="px-3 py-2">{"\u8bf4\u660e"}</th>
                          <th className="px-3 py-2">{"\u5339\u914d\u9879"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issueRows.map((row) => (
                          <tr key={`${row.rowNumber}-${row.issueType}`} className="border-t border-border/60">
                            <td className="px-3 py-2">{row.rowNumber}</td>
                            <td className="px-3 py-2">{row.issueType}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{row.details}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{row.matchedValue ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleImport}>{TEXT.importAction}</Button>
                {issueRows.length ? (
                  <>
                    <Button variant="outline" onClick={() => handleExportIssues("csv")}>{TEXT.exportIssueCsv}</Button>
                    <Button variant="outline" onClick={() => handleExportIssues("xlsx")}>{TEXT.exportIssueExcel}</Button>
                    <Button variant="outline" onClick={() => handleExportIssues("json")}>{TEXT.exportIssueJson}</Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState title={TEXT.noFileTitle} description={TEXT.noFileDesc} />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-xl font-semibold">{TEXT.inboxTitle}</h3>
                <Badge>{`\u5f85\u5904\u7406 ${captureInbox.length} \u6761`}</Badge>
              </div>
              {captureInbox.length ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={allInboxSelected} onChange={(event) => toggleAllInboxSelection(event.target.checked)} />
                  <span>{TEXT.selectAll}</span>
                </label>
              ) : null}
            </div>

            {selectedInboxIds.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-3">
                <Badge className="bg-primary/10 text-primary">{`\u5df2\u9009 ${selectedInboxIds.length} \u6761`}</Badge>
                <Button className="h-9 px-3 text-xs" onClick={() => void handleApproveSelected()}>{TEXT.approveSelected}</Button>
                <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => void handleDiscardSelected()}>{TEXT.discardSelected}</Button>
              </div>
            ) : null}

            {captureInbox.length ? (
              <div className="space-y-3">
                {captureInbox.map((item) => {
                  const draft = captureDrafts[item.id] ?? {
                    title: item.title,
                    sourceType: item.sourceType,
                    favorite: item.favorite,
                    projectName: item.projectName ?? "",
                    topic: item.topic ?? "",
                    tagsText: item.tags.join(", "),
                    status: item.status,
                    summary: item.summary,
                    notes: item.notes ?? "",
                  };

                  return (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            className="mt-1"
                            type="checkbox"
                            checked={selectedInboxIds.includes(item.id)}
                            onChange={() => toggleInboxSelection(item.id)}
                          />
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-primary/10 text-primary">{draft.sourceType}</Badge>
                              <Badge>{draft.status || item.status}</Badge>
                              {draft.favorite ? <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">\u91cd\u70b9</Badge> : null}
                            </div>
                            <label className="space-y-1 text-sm">
                              <span className="text-muted-foreground">{"\u6807\u9898"}</span>
                              <Input
                                value={draft.title}
                                onChange={(event) =>
                                  setCaptureDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: { ...draft, title: event.target.value },
                                  }))
                                }
                                placeholder="\u5bf9\u8bdd\u6807\u9898"
                              />
                            </label>
                            <p className="text-xs text-muted-foreground break-all">{item.url}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{`\u65e5\u671f ${item.conversationDate}`}</span>
                              <span>{`\u66f4\u65b0 ${item.updatedAt}`}</span>
                              {item.sourceContext ? <span>{item.sourceContext}</span> : null}
                            </div>
                            <div className="grid gap-3 lg:grid-cols-5">
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u6765\u6e90\u7c7b\u578b"}</span>
                                <select
                                  className="h-10 w-full rounded-xl border bg-background px-3"
                                  value={draft.sourceType}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, sourceType: event.target.value },
                                    }))
                                  }
                                >
                                  {(availableSourceTypes.length ? availableSourceTypes : [item.sourceType]).map((sourceType) => (
                                    <option key={`${item.id}-${sourceType}`} value={sourceType}>{sourceType}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u9879\u76ee"}</span>
                                <Input
                                  value={draft.projectName}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, projectName: event.target.value },
                                    }))
                                  }
                                  placeholder="\u672a\u6307\u5b9a\u9879\u76ee"
                                />
                              </label>
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u4e3b\u9898"}</span>
                                <Input
                                  value={draft.topic}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, topic: event.target.value },
                                    }))
                                  }
                                  placeholder="\u5bf9\u8bdd\u4e3b\u9898"
                                />
                              </label>
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u6807\u7b7e"}</span>
                                <Input
                                  value={draft.tagsText}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, tagsText: event.target.value },
                                    }))
                                  }
                                  placeholder="\u9017\u53f7\u5206\u9694\u6807\u7b7e"
                                />
                              </label>
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u72b6\u6001"}</span>
                                <select
                                  className="h-10 w-full rounded-xl border bg-background px-3"
                                  value={draft.status}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, status: event.target.value },
                                    }))
                                  }
                                >
                                  {(availableStatuses.length ? availableStatuses : [item.status]).map((status) => (
                                    <option key={`${item.id}-${status}`} value={status}>{status}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <button
                                type="button"
                                className={`rounded-xl border px-3 py-2 transition ${draft.favorite ? "border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-background text-muted-foreground"}`}
                                onClick={() =>
                                  setCaptureDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: { ...draft, favorite: !draft.favorite },
                                  }))
                                }
                              >
                                {draft.favorite ? "\u5df2\u8bbe\u4e3a\u91cd\u70b9" : "\u8bbe\u4e3a\u91cd\u70b9"}
                              </button>
                              <span className="text-xs text-muted-foreground">{"\u786e\u8ba4\u5165\u5e93\u65f6\u4f1a\u540c\u6b65\u4e3a\u5f53\u524d\u72b6\u6001\u53e3\u5f84"}</span>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u6458\u8981"}</span>
                                <Textarea
                                  className="min-h-[96px]"
                                  value={draft.summary}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, summary: event.target.value },
                                    }))
                                  }
                                  placeholder="\u53ef\u4ee5\u5148\u8865\u4e00\u53e5\u6458\u8981\uff0c\u518d\u786e\u8ba4\u5165\u5e93"
                                />
                              </label>
                              <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">{"\u5907\u6ce8"}</span>
                                <Textarea
                                  className="min-h-[96px]"
                                  value={draft.notes}
                                  onChange={(event) =>
                                    setCaptureDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...draft, notes: event.target.value },
                                    }))
                                  }
                                  placeholder="\u53ef\u8bb0\u5f55\u4f60\u4e3a\u4ec0\u4e48\u8981\u4fdd\u7559\u8fd9\u6761\u5bf9\u8bdd"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => void handleCopyCaptureUrl(item)}>{TEXT.copyCaptureUrl}</Button>
                          <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => void handleOpenCaptureUrl(item)}>{TEXT.openCaptureUrl}</Button>
                          <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => void handleSaveCaptureDraft(item)}>{TEXT.saveCapture}</Button>
                          <Button className="h-9 px-3 text-xs" onClick={() => void handleApproveCapture(item)}>{TEXT.approveCapture}</Button>
                          <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => void handleDiscardCapture(item.id)}>{TEXT.discardCapture}</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title={TEXT.noInboxTitle} description={TEXT.noInboxDesc} />
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="font-display text-xl font-semibold">{TEXT.exportTitle}</h3>
            <p className="text-sm text-muted-foreground">{`\u5f53\u524d\u6570\u636e\u5e93\u5171\u6709 ${allEntries.length} \u6761\u7d22\u5f15\uff0c\u53ef\u76f4\u63a5\u5bfc\u51fa\u4e3a\u7ed3\u6784\u5316\u6587\u4ef6\u3002`}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleExport("csv")}>{TEXT.exportCsv}</Button>
              <Button variant="outline" onClick={() => handleExport("xlsx")}>{TEXT.exportExcel}</Button>
              <Button variant="outline" onClick={() => handleExport("json")}>{TEXT.exportJson}</Button>
            </div>
            <div className="rounded-2xl bg-background/50 p-4 text-sm text-muted-foreground">
              {exportDirectory
                ? `\u5f53\u524d\u9ed8\u8ba4\u5bfc\u51fa\u76ee\u5f55\uff1a${exportDirectory}`
                : "\u5f53\u524d\u672a\u914d\u7f6e\u9ed8\u8ba4\u5bfc\u51fa\u76ee\u5f55\uff0c\u4f1a\u5728\u6bcf\u6b21\u5bfc\u51fa\u65f6\u7531\u7cfb\u7edf\u5f39\u7a97\u9009\u62e9\u3002"}
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-display text-xl font-semibold">{TEXT.captureTitle}</h3>
            <p className="text-sm text-muted-foreground">{"\u5e94\u7528\u542f\u52a8\u540e\u4f1a\u5728\u672c\u673a\u6253\u5f00\u91c7\u96c6\u7aef\u53e3\u3002\u6d4f\u89c8\u5668\u6269\u5c55\u4f1a\u628a\u5f53\u524d\u5bf9\u8bdd\u6216\u4fa7\u8fb9\u680f\u6761\u76ee\u5148\u63a8\u9001\u8fdb\u6536\u4ef6\u7bb1\uff0c\u518d\u7531\u4f60\u786e\u8ba4\u5165\u5e93\u3002"}</p>
            <div className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground space-y-2">
              <p>{"\u672c\u5730\u91c7\u96c6\u5730\u5740\uff1a"}<span className="font-mono text-foreground">{CAPTURE_ENDPOINT}</span></p>
              <p>{"ChatGPT / Gemini \u6d4f\u89c8\u5668\u6269\u5c55\uff1a"}<span className="font-mono text-foreground">{EXTENSION_PATH}</span></p>
              <p>{"\u652f\u6301\u5916\u90e8 Excel \u8868\u683c\u5bfc\u5165\u548c ChatGPT / Gemini \u7f51\u9875\u4e00\u952e\u91c7\u96c6\u4e24\u6761\u94fe\u8def\u5e76\u884c\u4f7f\u7528\u3002"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyCaptureEndpoint}>{"\u590d\u5236\u91c7\u96c6\u5730\u5740"}</Button>
              <Button variant="outline" onClick={copyExtensionPath}>{"\u590d\u5236\u6269\u5c55\u8def\u5f84"}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

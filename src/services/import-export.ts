import * as XLSX from "xlsx";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { EntryFormValues } from "@/schemas/entry-schema";
import type { EntryListItem, ImportIssueRow, ImportPreviewRow } from "@/types/models";

export const importFieldLabels = {
  customId: "\u7f16\u53f7",
  title: "\u6807\u9898",
  summary: "\u6458\u8981",
  url: "\u94fe\u63a5",
  sourceType: "\u6765\u6e90",
  projectName: "\u9879\u76ee",
  topic: "\u4e3b\u9898",
  tags: "\u6807\u7b7e",
  conversationDate: "\u5bf9\u8bdd\u65e5\u671f",
  notes: "\u5907\u6ce8",
  status: "\u72b6\u6001",
} as const;

export type ImportFieldKey = keyof typeof importFieldLabels;
export type FieldMapping = Partial<Record<ImportFieldKey, string>>;

const candidateKeys: Record<ImportFieldKey, string[]> = {
  title: ["title", "\u6807\u9898", "\u4f1a\u8bdd\u6807\u9898", "\u540d\u79f0", "name", "conversation title", "chat title", "\u5bf9\u8bdd\u6807\u9898", "\u8bb0\u5f55\u6807\u9898"],
  summary: ["summary", "\u6458\u8981", "\u7b80\u4ecb", "\u8bf4\u660e", "description", "content summary", "ai summary"],
  url: ["url", "\u94fe\u63a5", "\u539f\u59cb\u94fe\u63a5", "\u5730\u5740", "link", "source url", "source_url", "conversation url", "conversation_url", "chat url", "chat_url", "\u5bf9\u8bdd\u94fe\u63a5", "\u8bb0\u5f55\u94fe\u63a5", "url \u5730\u5740"],
  sourceType: ["sourceType", "source_type", "\u6765\u6e90", "\u6765\u6e90\u7c7b\u578b", "source", "platform"],
  projectName: ["projectName", "project_name", "\u9879\u76ee", "\u9879\u76ee\u540d", "project", "\u6240\u5c5e\u9879\u76ee", "\u9879\u76ee\u540d\u79f0"],
  topic: ["topic", "\u4e3b\u9898", "\u5206\u7c7b", "category", "subject"],
  tags: ["tags", "\u6807\u7b7e", "tag", "keywords", "labels", "\u5173\u952e\u5b57", "\u6807\u7b7e\u5217\u8868"],
  conversationDate: ["conversationDate", "conversation_date", "\u5bf9\u8bdd\u65e5\u671f", "\u65e5\u671f", "date", "created_at", "\u521b\u5efa\u65e5\u671f", "conversation date", "\u8bb0\u5f55\u65e5\u671f"],
  notes: ["notes", "\u5907\u6ce8", "note", "remark", "comments", "\u8bf4\u660e\u5907\u6ce8"],
  status: ["status", "\u72b6\u6001", "\u6574\u7406\u72b6\u6001", "state"],
  customId: ["customId", "custom_id", "\u7f16\u53f7", "\u7d22\u5f15\u7f16\u53f7", "id", "record id"],
};

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\:()\[\]{}]+/g, "");
}

function readAsTextList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[;,\uFF0C|\n]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUrl(value: string) {
  const fallback = value.trim().toLowerCase().replace(/\/+$/, "");
  if (!fallback) return fallback;

  try {
    const url = new URL(value.trim());
    url.hash = "";

    const params = new URLSearchParams(url.search);
    for (const key of [...params.keys()]) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith("utm_") || ["ref", "source"].includes(lowerKey)) {
        params.delete(key);
      }
    }

    const search = params.toString();
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return fallback;
  }
}

function pickValue(row: Record<string, unknown>, keys: string[]) {
  const normalizedKeyMap = new Map(Object.keys(row).map((key) => [normalizeHeaderKey(key), key]));

  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
    const matchedKey = normalizedKeyMap.get(normalizeHeaderKey(key));
    if (matchedKey && row[matchedKey] != null && row[matchedKey] !== "") {
      return row[matchedKey];
    }
  }
  return undefined;
}

function findHeaderMatch(headers: string[], aliases: string[]) {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeaderKey(header), header]));
  for (const alias of aliases) {
    const direct = headers.find((header) => header === alias);
    if (direct) return direct;

    const normalized = normalizedHeaders.get(normalizeHeaderKey(alias));
    if (normalized) return normalized;
  }
  return "";
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(normalizeText(left).split(/\s+/).filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(/\s+/).filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function findDuplicateTitleMatch(existingTitles: string[], candidateTitle: string) {
  const normalizedCandidate = normalizeText(candidateTitle);
  if (!normalizedCandidate) return undefined;

  for (const existingTitle of existingTitles) {
    const normalizedExisting = normalizeText(existingTitle);
    if (!normalizedExisting) continue;

    const similarity = jaccardSimilarity(existingTitle, candidateTitle);
    const contained = normalizedExisting.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedExisting);
    if (similarity >= 0.75 || contained) {
      return existingTitle;
    }
  }

  return undefined;
}

function resolveDefaultPath(defaultDirectory: string | undefined, fileName: string) {
  if (!defaultDirectory?.trim()) return fileName;
  const normalizedDirectory = defaultDirectory.trim().replace(/[\\/]+$/, "");
  const separator = normalizedDirectory.includes("/") && !normalizedDirectory.includes("\\") ? "/" : "\\";
  return `${normalizedDirectory}${separator}${fileName}`;
}

function pickWorkbookSheet(workbook: XLSX.WorkBook) {
  let bestName = workbook.SheetNames[0] ?? "Sheet1";
  let bestRows: Record<string, unknown>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (rows.length > bestRows.length) {
      bestName = sheetName;
      bestRows = rows;
    }
  }

  return { sheetName: bestName, rows: bestRows };
}

async function exportDataFile(
  rows: object[],
  format: "csv" | "xlsx" | "json",
  defaultBaseName: string,
  defaultDirectory?: string,
) {
  const fileName = `${defaultBaseName}.${format}`;
  const path = await save({
    defaultPath: resolveDefaultPath(defaultDirectory, fileName),
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });

  if (!path) return null;

  if (format === "json") {
    const bytes = new TextEncoder().encode(JSON.stringify(rows, null, 2));
    await writeFile(path, bytes);
    return path;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const type = format === "csv" ? "string" : "array";
  const data = XLSX.write(workbook, { bookType: format, type });

  if (typeof data === "string") {
    await writeFile(path, new TextEncoder().encode(data));
  } else {
    await writeFile(path, new Uint8Array(data));
  }

  return path;
}

export async function loadImportFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (lowerName.endsWith(".json")) {
    const text = new TextDecoder().decode(buffer);
    const rows = JSON.parse(text) as Record<string, unknown>[];
    return {
      rows,
      headers: rows.length ? Object.keys(rows[0] ?? {}) : [],
      sourceKind: "json",
      sheetName: undefined,
    };
  }

  const workbook = XLSX.read(buffer, { type: "array" });
  const { sheetName, rows } = pickWorkbookSheet(workbook);
  return {
    rows,
    headers: rows.length ? Object.keys(rows[0] ?? {}) : [],
    sourceKind: lowerName.endsWith(".csv") ? "csv" : "xlsx",
    sheetName,
  };
}

export function inferFieldMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  (Object.keys(candidateKeys) as ImportFieldKey[]).forEach((field) => {
    mapping[field] = findHeaderMatch(headers, candidateKeys[field]);
  });
  return mapping;
}

export function buildImportPreview(
  rows: Record<string, unknown>[],
  existing: EntryListItem[],
  mapping?: FieldMapping,
): { preview: ImportPreviewRow[]; entries: EntryFormValues[] } {
  const existingUrlMap = new Map(existing.map((item) => [normalizeUrl(item.url), item.url]));
  const existingTitles = existing.map((item) => item.title);
  const preview: ImportPreviewRow[] = [];
  const entries: EntryFormValues[] = [];
  const activeMapping = mapping ?? {};

  rows.forEach((row, index) => {
    const getMappedValue = (field: ImportFieldKey) => {
      const mappedKey = activeMapping[field];
      if (mappedKey && row[mappedKey] != null && row[mappedKey] !== "") {
        return row[mappedKey];
      }
      return pickValue(row, candidateKeys[field]);
    };

    const title = String(getMappedValue("title") ?? "").trim() || "\u5f85\u8865\u5168";
    const summary = String(getMappedValue("summary") ?? "").trim() || "\u5f85\u8865\u5168";
    const url = String(getMappedValue("url") ?? "").trim();
    const normalizedUrl = normalizeUrl(url);
    const sourceType = String(getMappedValue("sourceType") ?? "chatgpt").trim() || "chatgpt";
    const projectName = String(getMappedValue("projectName") ?? "").trim();
    const topic = String(getMappedValue("topic") ?? "").trim();
    const tags = readAsTextList(getMappedValue("tags"));
    const conversationDate = String(getMappedValue("conversationDate") ?? "").trim();
    const notes = String(getMappedValue("notes") ?? "").trim();
    const status = String(getMappedValue("status") ?? "\u5e38\u89c4").trim() || "\u5e38\u89c4";
    const customId = String(getMappedValue("customId") ?? `IMP${String(index + 1).padStart(3, "0")}`).trim();
    const duplicateUrlMatch = existingUrlMap.get(normalizedUrl);
    const duplicateTitleMatch = findDuplicateTitleMatch(existingTitles, title);
    const suspectedDuplicateUrl = Boolean(duplicateUrlMatch);
    const suspectedDuplicateTitle = Boolean(duplicateTitleMatch);
    const error = !url ? "\u94fe\u63a5\u4e0d\u80fd\u4e3a\u7a7a" : undefined;

    preview.push({
      rowNumber: index + 1,
      title,
      url,
      projectName,
      summary,
      tags,
      status,
      conversationDate,
      suspectedDuplicateUrl,
      suspectedDuplicateTitle,
      duplicateUrlMatch,
      duplicateTitleMatch,
      error,
    });

    if (!error) {
      entries.push({
        customId,
        title,
        summary,
        url,
        sourceType,
        projectName,
        topic,
        tags,
        conversationDate,
        notes,
        status,
        favorite: status === "\u91cd\u70b9",
      });
    }
  });

  return { preview, entries };
}

export function buildImportIssueRows(preview: ImportPreviewRow[]): ImportIssueRow[] {
  return preview
    .filter((row) => row.error || row.suspectedDuplicateUrl || row.suspectedDuplicateTitle)
    .map((row) => {
      const issueType = row.error
        ? "\u6821\u9a8c\u9519\u8bef"
        : row.suspectedDuplicateUrl
          ? "URL \u91cd\u590d"
          : "\u6807\u9898\u7591\u4f3c\u91cd\u590d";

      const matchedValue = row.duplicateUrlMatch ?? row.duplicateTitleMatch;
      const details = row.error
        ? row.error
        : row.suspectedDuplicateUrl
          ? "\u68c0\u6d4b\u5230\u4e0e\u73b0\u6709\u6570\u636e\u5b58\u5728\u76f8\u540c\u6216\u7b49\u4ef7\u7684 URL"
          : "\u68c0\u6d4b\u5230\u4e0e\u73b0\u6709\u6807\u9898\u6709\u8f83\u9ad8\u76f8\u4f3c\u5ea6";

      return {
        rowNumber: row.rowNumber,
        title: row.title,
        url: row.url,
        projectName: row.projectName,
        status: row.status,
        issueType,
        details,
        matchedValue,
      };
    });
}

function toPlainRow(entry: EntryListItem) {
  return {
    "\u7f16\u53f7": entry.customId,
    "\u4e3b\u9898/\u6807\u9898": entry.title,
    "\u7b80\u8981\u8bf4\u660e": entry.summary,
    "\u5173\u952e\u95ee\u9898/\u5173\u952e\u8bcd": entry.topic ?? "",
    "\u5bf9\u8bdd\u94fe\u63a5": entry.url,
    "\u65e5\u671f": entry.conversationDate,
    "\u6807\u7b7e": entry.tags.join(", "),
    "\u5907\u6ce8": entry.notes ?? "",
    "\u6765\u6e90": entry.sourceType,
    "\u72b6\u6001": entry.status,
    "\u9879\u76ee\u540d\u79f0": entry.projectName ?? "",
    "\u521b\u5efa\u65f6\u95f4": entry.createdAt,
    "\u66f4\u65b0\u65f6\u95f4": entry.updatedAt,
  };
}

export async function exportEntriesFile(entries: EntryListItem[], format: "csv" | "xlsx" | "json", defaultDirectory?: string) {
  return exportDataFile(entries.map(toPlainRow), format, `atlas-x-export-${Date.now()}`, defaultDirectory);
}

export async function exportImportIssuesFile(rows: ImportIssueRow[], format: "csv" | "xlsx" | "json", defaultDirectory?: string) {
  return exportDataFile(rows.map((row) => ({ ...row })), format, `atlas-x-import-issues-${Date.now()}`, defaultDirectory);
}
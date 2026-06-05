export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  const isFullDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const isDateTime = /^\d{4}-\d{2}-\d{2}T/.test(trimmed);
  if (!isFullDate && !isDateTime) return trimmed;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: isDateTime ? "2-digit" : undefined,
    minute: isDateTime ? "2-digit" : undefined,
  }).format(date);
}

export function toLocalDateInput(value?: string | null) {
  return value ?? "";
}

export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}


const GARBLED_MARKERS = [
  "\ufffd",
  "\u951f",
  "\u9422",
  "\u7035",
  "\u7b5b",
  "\u93cd",
  "\u7f02",
  "\u6d93",
  "\u93c3",
  "\u95be",
  "\u70ac",
  "\u5e34",
  "\u949f",
  "\u8235",
  "\u6924",
  "\u572d",
  "\u6d30",
  "\u5bf0",
  "\u5470",
  "\u02c9",
  "\ub364",
  "\uaef8",
  "\ud64d",
];

export function looksGarbledText(value?: string | null) {
  return Boolean(value && GARBLED_MARKERS.some((marker) => value.includes(marker)));
}

export function displayText(value?: string | null, fallback = "\u5f85\u8865\u5168") {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || looksGarbledText(trimmed)) return fallback;
  return trimmed;
}

export function displayTag(value?: string | null) {
  let tag = displayText(value, "");
  if (!tag) return "";
  tag = tag
    .replace(/[\u3010\u3011\u300c\u300d\u300e\u300f]/g, "")
    .replace(/\uff08/g, "(")
    .replace(/\uff09/g, ")")
    .replace(/\s+/g, " ")
    .trim();

  const openCount = (tag.match(/\(/g) ?? []).length;
  const closeCount = (tag.match(/\)/g) ?? []).length;
  if (openCount !== closeCount) {
    tag = tag.replace(/[()]/g, "").trim();
  }

  return tag;
}

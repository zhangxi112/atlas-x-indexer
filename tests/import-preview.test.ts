import { describe, expect, it } from "vitest";
import { buildImportIssueRows, buildImportPreview, inferFieldMapping } from "@/services/import-export";

describe("inferFieldMapping", () => {
  it("matches common external xlsx headers with loose normalization", () => {
    const mapping = inferFieldMapping([
      "\u4f1a\u8bdd\u6807\u9898",
      "conversation_url",
      "Project Name",
      "AI Summary",
      "\u5bf9\u8bdd\u65e5\u671f",
    ]);

    expect(mapping.title).toBe("\u4f1a\u8bdd\u6807\u9898");
    expect(mapping.url).toBe("conversation_url");
    expect(mapping.projectName).toBe("Project Name");
    expect(mapping.summary).toBe("AI Summary");
    expect(mapping.conversationDate).toBe("\u5bf9\u8bdd\u65e5\u671f");
  });

  it("recognizes additional chinese workbook headers", () => {
    const mapping = inferFieldMapping([
      "\u5bf9\u8bdd\u6807\u9898",
      "\u8bb0\u5f55\u94fe\u63a5",
      "\u9879\u76ee\u540d\u79f0",
      "\u6807\u7b7e\u5217\u8868",
      "\u8bb0\u5f55\u65e5\u671f",
    ]);

    expect(mapping.title).toBe("\u5bf9\u8bdd\u6807\u9898");
    expect(mapping.url).toBe("\u8bb0\u5f55\u94fe\u63a5");
    expect(mapping.projectName).toBe("\u9879\u76ee\u540d\u79f0");
    expect(mapping.tags).toBe("\u6807\u7b7e\u5217\u8868");
    expect(mapping.conversationDate).toBe("\u8bb0\u5f55\u65e5\u671f");
  });
});

describe("buildImportPreview", () => {
  it("detects duplicate url and maps tags", () => {
    const { preview, entries } = buildImportPreview(
      [
        {
          ["\u6807\u9898"]: "\u91cd\u590d\u8bb0\u5f55",
          ["\u6458\u8981"]: "\u6458\u8981",
          ["\u94fe\u63a5"]: "https://chatgpt.com/share/demo-1",
          ["\u6807\u7b7e"]: "A, B",
          ["\u5bf9\u8bdd\u65e5\u671f"]: "2026-03-18",
          ["\u72b6\u6001"]: "\u5f85\u6574\u7406",
        },
      ],
      [
        {
          id: 1,
          customId: "I001",
          title: "\u65e7\u8bb0\u5f55",
          summary: "\u65e7\u6458\u8981",
          url: "https://chatgpt.com/share/demo-1",
          sourceType: "chatgpt",
          projectName: null,
          topic: null,
          tags: [],
          conversationDate: "2026-03-17",
          createdAt: "2026-03-17T10:00:00",
          updatedAt: "2026-03-17T10:00:00",
          notes: null,
          status: "\u5f85\u6574\u7406",
          favorite: false,
        },
      ],
    );

    expect(preview[0]?.suspectedDuplicateUrl).toBe(true);
    expect(entries[0]?.tags).toEqual(["A", "B"]);
  });

  it("treats equivalent url with tracking params as duplicate and exposes matched value", () => {
    const { preview } = buildImportPreview(
      [
        {
          ["\u6807\u9898"]: "\u5e26\u53c2\u6570\u7684\u65b0\u8bb0\u5f55",
          ["\u6458\u8981"]: "\u6458\u8981",
          ["\u94fe\u63a5"]: "https://chatgpt.com/share/demo-2?utm_source=test",
          ["\u5bf9\u8bdd\u65e5\u671f"]: "2026-03-18",
          ["\u72b6\u6001"]: "\u5f85\u6574\u7406",
        },
      ],
      [
        {
          id: 2,
          customId: "I002",
          title: "\u539f\u8bb0\u5f55",
          summary: "\u6458\u8981",
          url: "https://chatgpt.com/share/demo-2",
          sourceType: "chatgpt",
          projectName: null,
          topic: null,
          tags: [],
          conversationDate: "2026-03-17",
          createdAt: "2026-03-17T10:00:00",
          updatedAt: "2026-03-17T10:00:00",
          notes: null,
          status: "\u5f85\u6574\u7406",
          favorite: false,
        },
      ],
    );

    expect(preview[0]?.suspectedDuplicateUrl).toBe(true);
    expect(preview[0]?.duplicateUrlMatch).toBe("https://chatgpt.com/share/demo-2");
  });

  it("keeps partial date clues during import", () => {
    const { preview, entries } = buildImportPreview(
      [{ ["\u94fe\u63a5"]: "https://chatgpt.com/share/partial-date", ["\u5bf9\u8bdd\u65e5\u671f"]: "2026-04" }],
      [],
    );

    expect(preview[0]?.error).toBeUndefined();
    expect(preview[0]?.conversationDate).toBe("2026-04");
    expect(entries[0]?.conversationDate).toBe("2026-04");
  });

});

describe("buildImportIssueRows", () => {
  it("includes duplicate match details in issue rows", () => {
    const rows = buildImportIssueRows([
      {
        rowNumber: 1,
        title: "\u91cd\u590d\u6807\u9898",
        url: "https://chatgpt.com/share/demo-3",
        tags: [],
        status: "\u5f85\u6574\u7406",
        suspectedDuplicateUrl: false,
        suspectedDuplicateTitle: true,
        duplicateTitleMatch: "\u91cd\u590d\u6807\u9898\uff08\u65e7\uff09",
      },
    ]);

    expect(rows[0]?.issueType).toBe("\u6807\u9898\u7591\u4f3c\u91cd\u590d");
    expect(rows[0]?.matchedValue).toBe("\u91cd\u590d\u6807\u9898\uff08\u65e7\uff09");
  });
});

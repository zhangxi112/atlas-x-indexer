import { describe, expect, it } from "vitest";
import { entryFormSchema } from "@/schemas/entry-schema";

describe("entryFormSchema", () => {
  it("accepts a valid payload", () => {
    const result = entryFormSchema.safeParse({
      customId: "I001",
      title: "示例标题",
      summary: "摘要",
      url: "https://chatgpt.com/share/demo",
      sourceType: "chatgpt",
      projectName: "Atlas-X",
      topic: "测试主题",
      tags: ["标签"],
      conversationDate: "2026-03-18",
      notes: "备注",
      status: "待整理",
      favorite: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid url", () => {
    const result = entryFormSchema.safeParse({
      customId: "I001",
      title: "示例标题",
      summary: "摘要",
      url: "not-a-url",
      sourceType: "chatgpt",
      tags: [],
      conversationDate: "2026-03-18",
      status: "待整理",
      favorite: false,
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial or fuzzy date clues", () => {
    const result = entryFormSchema.safeParse({
      customId: "",
      title: "",
      summary: "",
      url: "https://chatgpt.com/share/demo",
      sourceType: "chatgpt",
      tags: [],
      conversationDate: "2026-04",
      status: "\u5e38\u89c4",
      favorite: false,
    });

    expect(result.success).toBe(true);
  });

});

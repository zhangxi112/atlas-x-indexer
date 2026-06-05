import { z } from "zod";

export const entryFormSchema = z.object({
  customId: z.string().max(30, "\u7f16\u53f7\u957f\u5ea6\u4e0d\u80fd\u8d85\u8fc7 30 \u4e2a\u5b57\u7b26").optional().default(""),
  title: z.string().max(160, "\u6807\u9898\u957f\u5ea6\u4e0d\u80fd\u8d85\u8fc7 160 \u4e2a\u5b57\u7b26").optional().default(""),
  summary: z.string().max(2000, "\u7b80\u8981\u8bf4\u660e\u957f\u5ea6\u4e0d\u80fd\u8d85\u8fc7 2000 \u4e2a\u5b57\u7b26").optional().default(""),
  url: z.string().url("\u8bf7\u8f93\u5165\u6709\u6548\u7684\u5bf9\u8bdd\u94fe\u63a5"),
  sourceType: z.string().min(1, "\u8bf7\u9009\u62e9\u6765\u6e90"),
  projectName: z.string().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
  conversationDate: z.string().max(80, "\u65e5\u671f\u7ebf\u7d22\u957f\u5ea6\u4e0d\u80fd\u8d85\u8fc7 80 \u4e2a\u5b57\u7b26").optional().default(""),
  notes: z.string().optional(),
  status: z.string().optional().default("\u5e38\u89c4"),
  favorite: z.boolean().default(false),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;

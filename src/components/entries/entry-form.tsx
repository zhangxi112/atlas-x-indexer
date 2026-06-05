import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { entryFormSchema, type EntryFormValues } from "@/schemas/entry-schema";
import type { EntryFormMeta } from "@/types/models";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { TagInput } from "@/components/entries/tag-input";
import { toLocalDateInput } from "@/lib/utils";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

export function EntryForm({ meta, defaultValues, onSubmit, submitLabel }: {
  meta: EntryFormMeta;
  defaultValues?: Partial<EntryFormValues>;
  onSubmit: (values: EntryFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const defaultStatus = meta.statuses.includes("\u5e38\u89c4") ? "\u5e38\u89c4" : meta.statuses[0] ?? "\u5e38\u89c4";
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      customId: defaultValues?.customId ?? "",
      title: defaultValues?.title ?? "",
      summary: defaultValues?.summary ?? "",
      url: defaultValues?.url ?? "",
      sourceType: defaultValues?.sourceType ?? meta.sourceTypes[0] ?? "chatgpt",
      projectName: defaultValues?.projectName ?? "",
      topic: defaultValues?.topic ?? "",
      tags: defaultValues?.tags ?? [],
      conversationDate: toLocalDateInput(defaultValues?.conversationDate) || new Date().toISOString().slice(0, 10),
      notes: defaultValues?.notes ?? "",
      status: defaultValues?.status ?? defaultStatus,
      favorite: defaultValues?.favorite ?? false,
    },
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = form;

  async function submit(values: EntryFormValues) {
    const status = values.status?.trim() || defaultStatus;
    await onSubmit({
      ...values,
      title: values.title?.trim() || "\u5f85\u8865\u5168",
      customId: values.customId?.trim() || meta.suggestedCustomId,
      summary: values.summary?.trim() || "\u5f85\u8865\u5168",
      status,
      favorite: status === "\u91cd\u70b9",
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="\u7f16\u53f7" hint="\u53ef\u7559\u7a7a\uff1b\u82e5\u586b I003 \u4e14\u5df2\u5b58\u5728\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u5c06 I003/I004... \u987a\u5ef6\u4e00\u4f4d\u3002" error={errors.customId?.message}>
          <Input {...register("customId")} placeholder={meta.suggestedCustomId} />
        </Field>
        <Field label="\u4e3b\u9898 / \u6807\u9898" hint="\u53ef\u7559\u7a7a\uff0c\u4fdd\u5b58\u65f6\u4f1a\u5148\u8bb0\u4e3a\u5f85\u8865\u5168\u3002" error={errors.title?.message}>
          <Input {...register("title")} placeholder="\u4f8b\u5982\uff1aAtlas-X \u7d22\u5f15\u5668\u7ed3\u6784\u8bbe\u8ba1" autoFocus />
        </Field>
        <div className="lg:col-span-2">
          <Field label="\u7b80\u8981\u8bf4\u660e" hint="\u6ca1\u6709\u73b0\u6210\u6458\u8981\u53ef\u4ee5\u7559\u7a7a\uff0c\u7cfb\u7edf\u4f1a\u5148\u6807\u8bb0\u4e3a\u5f85\u8865\u5168\u3002" error={errors.summary?.message}>
            <Textarea {...register("summary")} placeholder="\u4e00\u4e24\u53e5\u8bdd\u8bf4\u660e\u8fd9\u6761\u5bf9\u8bdd\u4e3b\u8981\u89e3\u51b3\u4e86\u4ec0\u4e48" />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="\u5bf9\u8bdd\u94fe\u63a5" error={errors.url?.message}>
            <Input {...register("url")} placeholder="https://chatgpt.com/..." />
          </Field>
        </div>
        <Field label="\u5173\u952e\u95ee\u9898 / \u5173\u952e\u8bcd" error={errors.topic?.message}>
          <Input {...register("topic")} placeholder="\u6570\u636e\u5e93\u3001\u5bfc\u5165\u5bfc\u51fa\u3001\u641c\u7d22\u3001\u6027\u80fd\u4f18\u5316" />
        </Field>
        <Field label="\u65e5\u671f / \u65f6\u95f4\u7ebf\u7d22" hint="\u53ef\u586b 2026\u30012026-04\u30012026\u5e744\u6708\u6216\u5176\u4ed6\u6709\u7528\u65f6\u95f4\u7ebf\u7d22\u3002" error={errors.conversationDate?.message}>
          <Input {...register("conversationDate")} placeholder="2026-04 / 2026\u5e744\u6708 / \u7ea62025\u5e74" />
        </Field>
        <div className="lg:col-span-2">
          <Field label="\u6807\u7b7e" error={errors.tags?.message as string | undefined}>
            <Controller control={control} name="tags" render={({ field }) => <TagInput value={field.value} suggestions={meta.tags} onChange={field.onChange} />} />
          </Field>
        </div>
        <Field label="\u6765\u6e90" error={errors.sourceType?.message}>
          <select className="h-10 w-full rounded-xl border bg-background/70 px-3 text-sm" {...register("sourceType")}>
            {meta.sourceTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="\u72b6\u6001" error={errors.status?.message}>
          <Select {...register("status")}>
            {meta.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </Field>
        <Field label="\u9879\u76ee\u540d\u79f0\uff08\u53ef\u9009\uff09" error={errors.projectName?.message}>
          <Input {...register("projectName")} list="project-options" placeholder="Atlas-X Index" />
          <datalist id="project-options">{meta.projects.map((project) => <option key={project} value={project} />)}</datalist>
        </Field>
        <div className="lg:col-span-2">
          <Field label="\u5907\u6ce8" error={errors.notes?.message}>
            <Textarea {...register("notes")} placeholder="\u8865\u5145\u4e0a\u4e0b\u6587\u3001\u540e\u7eed\u5904\u7406\u610f\u89c1\u3001\u5173\u8054\u4fe1\u606f\u6216\u9700\u8981\u56de\u770b\u7684\u91cd\u70b9" />
          </Field>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "\u4fdd\u5b58\u4e2d..." : submitLabel}</Button>
      </div>
    </form>
  );
}

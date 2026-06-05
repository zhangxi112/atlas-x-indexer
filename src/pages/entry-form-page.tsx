import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { EntryForm } from "@/components/entries/entry-form";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { createEntry, getEntryById, getEntryFormMeta, updateEntry } from "@/services/api";
import type { EntryFormMeta, EntryRecord } from "@/types/models";
import type { EntryFormValues } from "@/schemas/entry-schema";
import { useNoticeStore } from "@/stores/notice-store";

export function EntryFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const params = useParams();
  const showNotice = useNoticeStore((state) => state.show);
  const [meta, setMeta] = useState<EntryFormMeta | null>(null);
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const formMeta = await getEntryFormMeta();
        setMeta(formMeta);
        if (mode === "edit" && params.id) setEntry(await getEntryById(Number(params.id)));
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, params.id]);

  const mappedDefaults = useMemo<Partial<EntryFormValues> | undefined>(() => {
    if (!entry) return undefined;
    return {
      customId: entry.customId,
      title: entry.title,
      summary: entry.summary,
      url: entry.url,
      sourceType: entry.sourceType,
      projectName: entry.projectName ?? "",
      topic: entry.topic ?? "",
      tags: entry.tags,
      conversationDate: entry.conversationDate,
      notes: entry.notes ?? "",
      status: entry.status,
      favorite: entry.favorite,
    };
  }, [entry]);

  async function handleSubmit(values: EntryFormValues) {
    const normalizedCustomId = values.customId.trim().toUpperCase();
    const baseCustomId = mode === "create" ? meta?.suggestedCustomId ?? "" : entry?.customId ?? "";
    const customIdChanged = normalizedCustomId.length > 0 && normalizedCustomId !== baseCustomId.toUpperCase();
    if (customIdChanged) {
      const confirmed = window.confirm(
        "如果该编号已存在，系统会自动将同前缀、同位数的后续编号顺延一位。是否继续？",
      );
      if (!confirmed) return;
    }

    if (mode === "create") {
      const created = await createEntry(values);
      showNotice({ type: "success", message: `已创建 ${created.customId} / ${created.title}` });
      navigate(`/entries/${created.id}`);
      return;
    }

    const updated = await updateEntry(Number(params.id), values);
    showNotice({ type: "success", message: `已更新 ${updated.customId} / ${updated.title}` });
    navigate(`/entries/${updated.id}`);
  }

  if (loading || !meta) return <LoadingPanel message="正在准备表单..." />;

  return (
    <div className="space-y-5">
      <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" />返回</Button>
      <Card>
        <div className="mb-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">{mode === "create" ? "新增索引" : "编辑索引"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">编号支持插队顺延；日期可填完整日期、年月或其他有用时间线索。</p>
        </div>
        <EntryForm meta={meta} defaultValues={mappedDefaults} onSubmit={handleSubmit} submitLabel={mode === "create" ? "创建索引" : "保存修改"} />
      </Card>
    </div>
  );
}

"use client";

import { Tabs, tabElementId, tabPanelId, type TabItem } from "@/components/ui/Tabs";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

export type CaseTab = "editor" | "history";

export const tabId = (tab: CaseTab) => tabElementId("case", tab);
export const panelId = (tab: CaseTab) => tabPanelId("case", tab);

const TAB_COPY = messages({
  id: { editor: "Editor", history: "Riwayat versi", label: "Bagian kasus" },
  en: { editor: "Editor", history: "Version history", label: "Case sections" },
});

type Props = {
  active: CaseTab;
  onChange: (tab: CaseTab) => void;
};

/** Pindah antara editor kasus dan riwayat versinya. */
export function CaseTabs({ active, onChange }: Readonly<Props>) {
  const copy = useText(TAB_COPY);
  const tabs: readonly TabItem<CaseTab>[] = [
    { id: "editor", label: copy.editor },
    { id: "history", label: copy.history },
  ];
  return <Tabs tabs={tabs} active={active} onChange={onChange} label={copy.label} idPrefix="case" />;
}

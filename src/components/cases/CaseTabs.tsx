import { Tabs, tabElementId, tabPanelId, type TabItem } from "@/components/ui/Tabs";

export type CaseTab = "editor" | "history";

export const tabId = (tab: CaseTab) => tabElementId("case", tab);
export const panelId = (tab: CaseTab) => tabPanelId("case", tab);

const TABS: readonly TabItem<CaseTab>[] = [
  { id: "editor", label: "Editor" },
  { id: "history", label: "Riwayat versi" },
];

type Props = {
  active: CaseTab;
  onChange: (tab: CaseTab) => void;
};

/** Pindah antara editor kasus dan riwayat versinya. */
export function CaseTabs({ active, onChange }: Props) {
  return <Tabs tabs={TABS} active={active} onChange={onChange} label="Bagian kasus" idPrefix="case" />;
}

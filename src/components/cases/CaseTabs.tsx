export type CaseTab = "editor" | "history";

export const tabId = (tab: CaseTab) => `case-tab-${tab}`;
export const panelId = (tab: CaseTab) => `case-panel-${tab}`;

type Props = {
  active: CaseTab;
  onChange: (tab: CaseTab) => void;
};

export function CaseTabs(props: Props) {
  void props;
  return null;
}

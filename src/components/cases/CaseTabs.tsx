export type CaseTab = "editor" | "history";

/** Id tombol tab dan panelnya, dipakai halaman untuk menghubungkan keduanya. */
export const tabId = (tab: CaseTab) => `case-tab-${tab}`;
export const panelId = (tab: CaseTab) => `case-panel-${tab}`;

const TABS: { id: CaseTab; label: string }[] = [
  { id: "editor", label: "Editor" },
  { id: "history", label: "Riwayat versi" },
];

type Props = {
  active: CaseTab;
  onChange: (tab: CaseTab) => void;
};

/** Pindah antara editor kasus dan riwayat versinya. */
export function CaseTabs({ active, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Bagian kasus" className="flex gap-1 border-b border-slate-200">
      {TABS.map(({ id, label }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={tabId(id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(id)}
            onClick={() => onChange(id)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

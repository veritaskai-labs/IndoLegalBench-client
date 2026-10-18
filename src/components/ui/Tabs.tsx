export type TabItem<T extends string> = { id: T; label: string };

/** Id tombol tab dan panelnya, dipakai halaman untuk menghubungkan keduanya. */
export const tabElementId = (prefix: string, tab: string) => `${prefix}-tab-${tab}`;
export const tabPanelId = (prefix: string, tab: string) => `${prefix}-panel-${tab}`;

type Props<T extends string> = {
  tabs: readonly TabItem<T>[];
  active: T;
  onChange: (tab: T) => void;
  label: string;
  idPrefix: string;
};

/** Deretan tab; halaman yang memegang tab aktif dan menampilkan panelnya. */
export function Tabs<T extends string>({ tabs, active, onChange, label, idPrefix }: Readonly<Props<T>>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-slate-200">
      {tabs.map(({ id, label: tabLabel }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={tabElementId(idPrefix, id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, id)}
            onClick={() => onChange(id)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tabLabel}
          </button>
        );
      })}
    </div>
  );
}

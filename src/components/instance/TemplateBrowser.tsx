import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useReferenceStore } from '@/stores/reference-store';
import { useTemplateStore } from '@/stores/template-store';
import type { TemplateSource } from '@/engine/templates/resolve';
import type { TemplateKind } from '@/persistence/paths';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { NpcTemplate } from '@/domain/npc';

export interface BrowsableTemplate {
  source: TemplateSource;
  template: MonsterTemplate | RyudeTemplate | NpcTemplate;
}

interface TemplateBrowserProps {
  kind: TemplateKind;
  campaignDir: string | null;
  /** When set, only this source is shown (chips hidden). */
  fixedSource?: TemplateSource;
  selected: BrowsableTemplate | null;
  onSelect: (t: BrowsableTemplate) => void;
}

const SOURCE_CHIP_LABEL: Record<TemplateSource | 'all', string> = {
  all: 'All',
  bundled: 'Bundled',
  vault: 'Vault',
  campaign: 'Campaign',
};

const SOURCE_CHIP_TINT: Record<TemplateSource, string> = {
  bundled:
    'bg-[var(--color-parchment-200)] text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]',
  vault:
    'bg-[var(--color-verdigris)]/10 text-[var(--color-verdigris)] border-[var(--color-verdigris)]/40',
  campaign:
    'bg-[var(--color-rust)]/10 text-[var(--color-rust)] border-[var(--color-rust)]/40',
};

function bundledFor(
  kind: TemplateKind,
  catalog: ReturnType<typeof useReferenceStore.getState>['catalog'],
): Array<MonsterTemplate | RyudeTemplate | NpcTemplate> {
  if (!catalog) return [];
  if (kind === 'monster') return catalog.beastiary.monsters;
  if (kind === 'ryude') return catalog.ryudeUnits.ryude_units;
  return [];
}

export function TemplateBrowser({
  kind,
  campaignDir,
  fixedSource,
  selected,
  onSelect,
}: TemplateBrowserProps): React.JSX.Element {
  const { catalog } = useReferenceData();
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const campaignTemplates = useTemplateStore((s) => s.campaignTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);
  const loadCampaign = useTemplateStore((s) => s.loadCampaign);

  const [query, setQuery] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState<TemplateSource | 'all'>(
    fixedSource ?? 'all',
  );

  React.useEffect(() => {
    void loadGlobal(kind);
    if (campaignDir) void loadCampaign(campaignDir, kind);
  }, [kind, campaignDir, loadGlobal, loadCampaign]);

  const items = React.useMemo<BrowsableTemplate[]>(() => {
    const all: BrowsableTemplate[] = [];
    const campaign = campaignDir ? campaignTemplates[campaignDir]?.[kind] ?? [] : [];
    const vault = globalTemplates[kind] ?? [];
    const bundled = bundledFor(kind, catalog);
    if (sourceFilter === 'all' || sourceFilter === 'campaign') {
      for (const t of campaign) all.push({ source: 'campaign', template: t });
    }
    if (sourceFilter === 'all' || sourceFilter === 'vault') {
      for (const t of vault) all.push({ source: 'vault', template: t });
    }
    if (sourceFilter === 'all' || sourceFilter === 'bundled') {
      for (const t of bundled) all.push({ source: 'bundled', template: t });
    }
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((it) => {
      const t = it.template as { id: string; name: string };
      return (
        t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
      );
    });
  }, [
    catalog,
    campaignDir,
    campaignTemplates,
    globalTemplates,
    kind,
    query,
    sourceFilter,
  ]);

  const sources: Array<TemplateSource | 'all'> = fixedSource
    ? [fixedSource]
    : ['all', 'bundled', 'vault', 'campaign'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-faint)]"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind} templates…`}
            className="h-8 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] pl-7 pr-2 text-sm"
          />
        </div>
        {!fixedSource && (
          <div className="flex items-center gap-1">
            {sources.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={cn(
                  'rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider',
                  sourceFilter === s
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-parchment-50)]'
                    : 'border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60',
                )}
              >
                {SOURCE_CHIP_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="max-h-72 min-h-[8rem] overflow-y-auto rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40">
        {items.length === 0 ? (
          <div className="p-3 text-xs italic text-[var(--color-ink-faint)]">
            No templates match. Bundled monsters/Ryude come from the playkit
            data; vault templates from <code>templates/{kind}s/</code>; campaign
            templates from <code>{`{campaign}/templates/${kind}s/`}</code>.
          </div>
        ) : (
          <ul role="listbox" className="divide-y divide-[var(--color-parchment-300)]">
            {items.map((it) => {
              const t = it.template as { id: string; name: string };
              const isSelected =
                selected?.source === it.source && selected?.template.id === t.id;
              return (
                <li key={`${it.source}:${t.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(it)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-[var(--color-gilt)]/15 text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]',
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{t.name}</span>
                      <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                        {t.id}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
                        SOURCE_CHIP_TINT[it.source],
                      )}
                    >
                      {SOURCE_CHIP_LABEL[it.source]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

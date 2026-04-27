import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PawPrint, Cog, UserPlus } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useTemplateStore } from '@/stores/template-store';
import type { TemplateKind } from '@/persistence/paths';

export const Route = createFileRoute('/templates/')({
  component: TemplatesIndex,
});

interface SectionDef {
  kind: TemplateKind;
  to: '/templates/monsters' | '/templates/ryude' | '/templates/npcs';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
}

const SECTIONS: SectionDef[] = [
  {
    kind: 'monster',
    to: '/templates/monsters',
    label: 'Monster Templates',
    icon: PawPrint,
    summary:
      'Bundled bestiary creatures plus your own variants. Used to spawn named monster instances into a campaign with per-instance damage, status, and overrides.',
  },
  {
    kind: 'ryude',
    to: '/templates/ryude',
    label: 'Ryude Templates',
    icon: Cog,
    summary:
      'Bundled Footman / Courser / Maledictor units plus your own. Spawn named Ryude with operator assignments, durability tracking, and attunement state.',
  },
  {
    kind: 'npc',
    to: '/templates/npcs',
    label: 'NPC Templates',
    icon: UserPlus,
    summary:
      'User-authored NPCs in three archetypes — beast (full monster stat block), simple (CHA modifier + role), or full-character (complete sheet).',
  },
];

function TemplatesIndex(): React.JSX.Element {
  const { catalog } = useReferenceData();
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);

  React.useEffect(() => {
    void loadGlobal('monster');
    void loadGlobal('ryude');
    void loadGlobal('npc');
  }, [loadGlobal]);

  const counts: Record<TemplateKind, { bundled: number; vault: number }> = {
    monster: {
      bundled: catalog?.beastiary.monsters.length ?? 0,
      vault: globalTemplates.monster?.length ?? 0,
    },
    ryude: {
      bundled: catalog?.ryudeUnits.ryude_units.length ?? 0,
      vault: globalTemplates.ryude?.length ?? 0,
    },
    npc: {
      bundled: 0, // NPCs have no bundled tier
      vault: globalTemplates.npc?.length ?? 0,
    },
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <IlluminatedHeading level={1}>Templates</IlluminatedHeading>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Reusable definitions you spawn into campaigns as named instances.
          Bundled templates ship with the playkit; vault templates are
          authored here and saved under{' '}
          <code className="font-mono">~/Documents/WareMaster/templates/</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const c = counts[section.kind];
          return (
            <Link
              key={section.to}
              to={section.to}
              className="block rounded-sm transition-colors hover:bg-[var(--color-parchment-200)]/50"
            >
              <ParchmentCard className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[var(--color-rust)]" aria-hidden />
                  <h2 className="font-display text-lg text-[var(--color-ink)]">
                    {section.label}
                  </h2>
                </div>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  {section.summary}
                </p>
                <div className="mt-auto flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  {c.bundled > 0 && (
                    <span className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-200)] px-1.5 py-0.5">
                      {c.bundled} bundled
                    </span>
                  )}
                  <span className="rounded-sm border border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 px-1.5 py-0.5 text-[var(--color-verdigris)]">
                    {c.vault} vault
                  </span>
                </div>
              </ParchmentCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

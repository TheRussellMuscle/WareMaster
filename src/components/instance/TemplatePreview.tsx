import * as React from 'react';
import type { TemplateKind } from '@/persistence/paths';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { NpcTemplate, BeastNpc, SimpleNpc } from '@/domain/npc';
import type { BrowsableTemplate } from './TemplateBrowser';

interface TemplatePreviewProps {
  kind: TemplateKind;
  selected: BrowsableTemplate | null;
}

/**
 * Read-only stat preview of the currently-selected template in the
 * spawn dialog. Compact, no controls.
 */
export function TemplatePreview({
  kind,
  selected,
}: TemplatePreviewProps): React.JSX.Element {
  if (!selected) {
    return (
      <div className="flex h-full min-h-[8rem] items-center justify-center rounded-sm border border-dashed border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)]/40 p-4 text-xs italic text-[var(--color-ink-faint)]">
        Pick a template on the left to see its stat block.
      </div>
    );
  }
  if (kind === 'monster') {
    return <MonsterPreview template={selected.template as MonsterTemplate} />;
  }
  if (kind === 'ryude') {
    return <RyudePreview template={selected.template as RyudeTemplate} />;
  }
  return <NpcPreview template={selected.template as NpcTemplate} />;
}

function PreviewShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40 p-3 text-xs">
      <div>
        <div className="font-display text-sm text-[var(--color-ink)]">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-[var(--color-ink-faint)]">
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function MonsterPreview({ template: t }: { template: MonsterTemplate }) {
  return (
    <PreviewShell title={t.name} subtitle={`${t.type ?? 'Monster'} · Rank ${t.rank} · ${t.source}`}>
      <StatRow label="Damage" value={String(t.damage_value)} />
      {t.total_absorption != null && (
        <StatRow label="Absorption" value={String(t.total_absorption)} />
      )}
      <StatRow label="Reaction" value={t.reaction} />
      <StatRow label="Movement" value={`${t.movement_speed}${t.sprint_speed ? ` / sprint ${t.sprint_speed}` : ''}`} />
      <StatRow label="Intelligence" value={t.intelligence} />
      {t.encounter_rate_vs_ryude != null && (
        <StatRow label="vs Ryude" value={`damage ×${t.damage_value_multiplier_vs_ryude ?? 1}, abs ${t.total_absorption_vs_ryude ?? '—'}`} />
      )}
      {t.description && (
        <p className="mt-1 text-[10px] italic text-[var(--color-ink-soft)] line-clamp-3">
          {t.description}
        </p>
      )}
    </PreviewShell>
  );
}

function RyudePreview({ template: t }: { template: RyudeTemplate }) {
  return (
    <PreviewShell title={t.name} subtitle={`${t.type} · Persona ${t.persona_rank} · ${t.source}`}>
      <StatRow
        label="Attributes"
        value={`SPE ${t.attributes.spe}, POW ${t.attributes.pow}, ARM ${t.attributes.arm}, BAL ${t.attributes.bal}`}
      />
      <StatRow label="Durability" value={t.durability} />
      <StatRow label="Required Drive" value={t.required_drive} />
      <StatRow label="Attunement" value={t.attunement_value} />
      {t.equipment.length > 0 && (
        <StatRow label="Equipment" value={t.equipment.join(', ')} />
      )}
      {t.courser_perks && t.courser_perks.length > 0 && (
        <div className="mt-1 text-[10px] text-[var(--color-ink-soft)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Courser perks
          </div>
          <ul className="ml-3 list-disc space-y-0.5">
            {t.courser_perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </PreviewShell>
  );
}

function NpcPreview({ template: t }: { template: NpcTemplate }) {
  if (t.archetype === 'beast') {
    const beast = t as BeastNpc;
    return (
      <PreviewShell title={beast.name} subtitle={`Beast · Rank ${beast.rank}`}>
        <StatRow label="Damage" value={String(beast.damage_value)} />
        {beast.total_absorption != null && (
          <StatRow label="Absorption" value={String(beast.total_absorption)} />
        )}
        {beast.disposition && (
          <StatRow label="Disposition" value={beast.disposition} />
        )}
      </PreviewShell>
    );
  }
  if (t.archetype === 'simple') {
    const s = t as SimpleNpc;
    return (
      <PreviewShell title={s.name} subtitle={`Simple · ${s.role}`}>
        <StatRow label="CHA mod" value={s.cha_modifier} />
        {s.reaction_value != null && (
          <StatRow label="Reaction" value={s.reaction_value} />
        )}
        {s.notable_skills.length > 0 && (
          <StatRow
            label="Notable skills"
            value={s.notable_skills
              .map((sk) => `${sk.skill_id}:${sk.level}`)
              .join(', ')}
          />
        )}
        {s.description && (
          <p className="mt-1 text-[10px] italic text-[var(--color-ink-soft)] line-clamp-3">
            {s.description}
          </p>
        )}
      </PreviewShell>
    );
  }
  // full-character
  return (
    <PreviewShell title={t.name} subtitle={`Full Character · ${t.class_id}`}>
      <StatRow
        label="Abilities"
        value={`SEN ${t.abilities.SEN} / AGI ${t.abilities.AGI} / WIL ${t.abilities.WIL} / CON ${t.abilities.CON} / CHA ${t.abilities.CHA}`}
      />
      <StatRow label="Skills" value={`${t.skills.length} total`} />
      <StatRow label="Equipment" value={`${t.equipment.weapons.length} weapons`} />
    </PreviewShell>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import type { TablesFile } from '@/domain/tables';

export const Route = createFileRoute('/reference/tables')({
  component: TablesReference,
});

function TablesReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Tables"
      subtitle="Reference tables for Difficulty, Proficiency Gains, recovery rates, attunement, operator errors, and Ryude damage."
    >
      {(catalog) => {
        const t = catalog.tables;
        return (
          <div className="flex flex-col gap-4">
            <Section title="Difficulty Examples" source={t.difficulty_examples.source}>
              <RangeTable
                rows={t.difficulty_examples.ranges}
                columns={[
                  { label: 'Range', key: 'range' },
                  { label: 'Description', key: 'description' },
                ]}
              />
            </Section>

            <Section title="Proficiency Gains" source={t.proficiency_gains.source}>
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                    <th className="py-1">Impact</th>
                    <th>Perfect Success</th>
                    <th>Total Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {t.proficiency_gains.rows.map((r, i) => (
                    <tr
                      key={i}
                      className="border-t border-[var(--color-parchment-300)]/60"
                    >
                      <td className="py-1">{r.impact}</td>
                      <td>{r.perfect_success}</td>
                      <td>{r.total_failure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Completion Bonus Examples"
              source={t.completion_bonus_examples.source}
            >
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                    <th className="py-1">Event</th>
                    <th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {t.completion_bonus_examples.entries.map((e, i) => (
                    <tr
                      key={i}
                      className="border-t border-[var(--color-parchment-300)]/60"
                    >
                      <td className="py-1">{e.event}</td>
                      <td>{e.bonus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Skill Advancement Costs" source={t.skill_advancement_costs.source}>
              <dl className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                <KV label="Raise existing" value={t.skill_advancement_costs.raise_existing} />
                <KV label="Acquire combat (Lv 1)" value={String(t.skill_advancement_costs.acquire_level_1_combat)} />
                <KV label="Acquire adventure (Lv 1)" value={String(t.skill_advancement_costs.acquire_level_1_adventure)} />
                <KV label="Acquire specialized (Lv 1)" value={t.skill_advancement_costs.acquire_level_1_specialized} />
              </dl>
            </Section>

            <Section title="LUC Reserves" source={t.luc_reserves.source}>
              <dl className="text-sm">
                <KV label="Conversion" value={t.luc_reserves.conversion} />
                <KV label="Cap" value={t.luc_reserves.cap} />
              </dl>
            </Section>

            <Section title="Damage Recovery" source={t.damage_recovery.source}>
              <dl className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                <KV
                  label="Light Physical"
                  value={`${t.damage_recovery.light_damage.physical_per_day} per day`}
                />
                <KV
                  label="Light Mental"
                  value={`${t.damage_recovery.light_damage.mental_per_hour} per hour`}
                />
                <KV
                  label="Heavy Physical"
                  value={`1 per (${t.damage_recovery.heavy_damage.physical_days_per_point}) days`}
                />
                <KV
                  label="Heavy Mental"
                  value={`1 per (${t.damage_recovery.heavy_damage.mental_hours_per_point}) hours`}
                />
              </dl>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-[var(--color-ink-soft)]">
                {t.damage_recovery.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Section>

            <RollResultSection
              title="Attunement Penalty Table A"
              source={t.attunement_penalty_table_a.source}
              rows={t.attunement_penalty_table_a.rows}
            />
            <RollResultSection
              title="Attunement Penalty Table B"
              source={t.attunement_penalty_table_b.source}
              rows={t.attunement_penalty_table_b.rows}
            />

            <RollResultSection
              title="Operator Error Table A (Normal)"
              source={t.operator_error_table_a_normal.source}
              rows={t.operator_error_table_a_normal.rows}
            />
            <RollResultSection
              title="Operator Error Table B (Normal)"
              source={t.operator_error_table_b_normal.source}
              rows={t.operator_error_table_b_normal.rows}
            />
            <RollResultSection
              title="Operator Error Table A (Combat)"
              source={t.operator_error_table_a_combat.source}
              rows={t.operator_error_table_a_combat.rows}
            />
            <RollResultSection
              title="Operator Error Table B (Combat)"
              source={t.operator_error_table_b_combat.source}
              rows={t.operator_error_table_b_combat.rows}
            />

            <RollResultSection
              title={`Standard Damage Penalty (${t.standard_damage_penalty_table.trigger})`}
              source={t.standard_damage_penalty_table.source}
              rows={t.standard_damage_penalty_table.rows}
            />
            <RollResultSection
              title={`Critical Damage Table A (${t.critical_damage_table_a.trigger})`}
              source={t.critical_damage_table_a.source}
              rows={t.critical_damage_table_a.rows}
            />
            <RollResultSection
              title="Critical Damage Table B"
              source={t.critical_damage_table_b.source}
              rows={t.critical_damage_table_b.rows}
            />

            <Section title="Damage Location Table" source={t.damage_location_table.source}>
              <RangeTable
                rows={t.damage_location_table.rows}
                columns={[
                  { label: 'Roll', key: 'roll' },
                  { label: 'Location', key: 'location' },
                ]}
              />
            </Section>

            <Section title="Ryude Repair Costs" source={t.ryude_repair_costs.source}>
              <dl className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                <KV
                  label="Durability damage — time"
                  value={t.ryude_repair_costs.durability_damage.time}
                />
                <KV
                  label="Durability damage — cost"
                  value={t.ryude_repair_costs.durability_damage.cost_golda}
                />
                <KV
                  label="Ability damage — time"
                  value={t.ryude_repair_costs.ability_damage.time}
                />
                <KV
                  label="Ability damage — cost"
                  value={t.ryude_repair_costs.ability_damage.cost_golda}
                />
              </dl>
            </Section>
          </div>
        );
      }}
    </ReferenceShell>
  );
}

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ParchmentCard>
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-[var(--color-ink)]">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {source}
        </span>
      </header>
      {children}
    </ParchmentCard>
  );
}

function RollResultSection({
  title,
  source,
  rows,
}: {
  title: string;
  source: string;
  rows: TablesFile['attunement_penalty_table_a']['rows'];
}): React.JSX.Element {
  return (
    <Section title={title} source={source}>
      <RangeTable
        rows={rows}
        columns={[
          { label: 'Roll', key: 'roll' },
          { label: 'Result', key: 'result' },
        ]}
      />
    </Section>
  );
}

function RangeTable<TRow extends Record<string, string>>({
  rows,
  columns,
}: {
  rows: TRow[];
  columns: Array<{ label: string; key: keyof TRow }>;
}): React.JSX.Element {
  return (
    <table className="w-full font-mono text-xs">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {columns.map((c) => (
            <th key={String(c.key)} className="py-1">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-[var(--color-ink)]">
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-[var(--color-parchment-300)]/60">
            {columns.map((c) => (
              <td key={String(c.key)} className="py-1">
                {String(r[c.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

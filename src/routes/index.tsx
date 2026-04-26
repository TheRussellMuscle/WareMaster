import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';

export const Route = createFileRoute('/')({
  component: Landing,
});

function Landing(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ParchmentCard>
        <IlluminatedHeading level={1} className="mb-1">
          WareMaster
        </IlluminatedHeading>
        <p className="text-[var(--color-ink-soft)]">
          A companion for the Wares Blade tabletop RPG. Track campaigns,
          characters, monsters, and Ryude across the continent of Ahan.
        </p>
        <SealedDivider className="my-5" />
        <p className="text-sm text-[var(--color-ink-faint)]">
          Foundation phase &mdash; the app is being built up phase by phase.
          See <code className="font-mono text-[var(--color-rust)]">STACK.md</code>{' '}
          and <code className="font-mono text-[var(--color-rust)]">docs/</code>{' '}
          for the rules and reference data.
        </p>
      </ParchmentCard>

      <ParchmentCard>
        <IlluminatedHeading level={2} className="mb-2">
          Native vocabulary &amp; tooltips
        </IlluminatedHeading>
        <p className="mb-4 text-sm text-[var(--color-ink-soft)]">
          Hover any underlined term to see its real-world equivalent. The UI
          uses Wares Blade's own units everywhere; metric/imperial appears only
          in tooltips.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <UnitDemo label="Combat tick" content={<UnitTooltip unit="segment" />} />
          <UnitDemo label="Short rest" content={<UnitTooltip unit="round" />} />
          <UnitDemo label="Technique duration" content={<UnitTooltip unit="turn" />} />
          <UnitDemo
            label="Half-day march"
            content={<UnitTooltip unit="etch" />}
          />
          <UnitDemo
            label="Full day"
            content={<UnitTooltip unit="day" />}
          />
          <UnitDemo
            label="Brisk pace"
            content={<UnitTooltip unit="liet" amount={3} />}
          />
          <UnitDemo
            label="Day's travel"
            content={<UnitTooltip unit="li" amount={12} />}
          />
          <UnitDemo
            label="Ration weight"
            content={<UnitTooltip unit="gren" amount={1} />}
          />
          <UnitDemo
            label="Waterskin"
            content={<UnitTooltip unit="garom" amount={1} />}
          />
          <UnitDemo
            label="Longsword price"
            content={<UnitTooltip unit="golda" amount={125} />}
          />
        </div>

        <SealedDivider className="my-5" />

        <IlluminatedHeading level={3} className="mb-2">
          Acronyms
        </IlluminatedHeading>
        <p className="mb-3 text-sm text-[var(--color-ink-soft)]">
          Hover the codes used across stat blocks and combat.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <AcronymTooltip code="IN" />
          <AcronymTooltip code="DN" />
          <AcronymTooltip code="BN" />
          <AcronymTooltip code="PP" />
          <AcronymTooltip code="LUC" />
          <AcronymTooltip code="SEN" />
          <AcronymTooltip code="AGI" />
          <AcronymTooltip code="WIL" />
          <AcronymTooltip code="CON" />
          <AcronymTooltip code="CHA" />
          <AcronymTooltip code="WM" />
          <AcronymTooltip code="PC" />
          <AcronymTooltip code="NPC" />
        </div>
      </ParchmentCard>
    </div>
  );
}

function UnitDemo({
  label,
  content,
}: {
  label: string;
  content: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>
      <span className="font-mono text-[var(--color-ink)]">{content}</span>
    </div>
  );
}

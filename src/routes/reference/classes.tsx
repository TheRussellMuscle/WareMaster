import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import type { Class } from '@/domain/class';

export const Route = createFileRoute('/reference/classes')({
  component: ClassesReference,
});

function ClassesReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Classes"
      subtitle="The four character classes, their perks, skill packages, and equipment packages. Source: Playkit Chapter 3."
    >
      {(catalog) => (
        <div className="flex flex-col gap-4">
          {catalog.classes.classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </ReferenceShell>
  );
}

function ClassCard({ cls }: { cls: Class }): React.JSX.Element {
  return (
    <ParchmentCard className="flex flex-col gap-3">
      <header>
        <IlluminatedHeading level={2}>{cls.name}</IlluminatedHeading>
        <p className="mt-1 text-sm italic text-[var(--color-ink-soft)]">
          {cls.description}
        </p>
      </header>

      {cls.perks.length > 0 && (
        <section>
          <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Class Perks
          </h3>
          <ul className="space-y-1 text-sm">
            {cls.perks.map((perk) => (
              <li key={perk.id}>
                <span className="font-medium">{perk.name}.</span>{' '}
                <span className="text-[var(--color-ink-soft)]">{perk.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cls.gates_with_paired_skills && (
        <section>
          <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Gates &amp; Paired Skills
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
            {Object.entries(cls.gates_with_paired_skills).map(([gate, info]) => (
              <div key={gate} className="flex items-baseline gap-2">
                <dt className="font-display capitalize text-[var(--color-ink)]">
                  {gate}
                </dt>
                <dd className="text-xs text-[var(--color-ink-soft)]">
                  {info.paired_skill}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {cls.skill_packages && cls.skill_packages.length > 0 && (
        <>
          <SealedDivider />
          <section>
            <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
              Skill Packages
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {cls.skill_packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-sm"
                >
                  <div className="font-display text-base text-[var(--color-ink)]">
                    {pkg.name}
                  </div>
                  {pkg.notes && (
                    <p className="mt-1 text-xs italic text-[var(--color-ink-faint)]">
                      {pkg.notes}
                    </p>
                  )}
                  {pkg.skills && pkg.skills.length > 0 && (
                    <ul className="mt-1 space-y-0.5 font-mono text-xs">
                      {pkg.skills.map((s, i) => (
                        <li key={i}>
                          {s.name}: Level {s.level}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pkg.optional_choose_one &&
                    pkg.optional_choose_one.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                          Choose one
                        </div>
                        <ul className="mt-0.5 space-y-0.5 text-xs">
                          {pkg.optional_choose_one.map((opt, i) => (
                            <li key={i}>{opt.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {pkg.bonus_golda != null && (
                    <div className="mt-2 text-xs">
                      Bonus:{' '}
                      <UnitTooltip unit="golda" amount={pkg.bonus_golda} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {cls.equipment_packages && cls.equipment_packages.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Equipment Packages
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {cls.equipment_packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-sm"
              >
                <div className="font-display text-base text-[var(--color-ink)]">
                  {pkg.name}
                </div>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {pkg.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {pkg.total_golda != null && (
                  <div className="mt-1 text-xs">
                    Total:{' '}
                    <UnitTooltip unit="golda" amount={pkg.total_golda} />
                  </div>
                )}
                {pkg.cost && (
                  <div className="mt-1 text-xs">Cost: {pkg.cost}</div>
                )}
                {pkg.notes && (
                  <p className="mt-1 text-xs italic text-[var(--color-ink-faint)]">
                    {pkg.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {cls.professions && cls.professions.length > 0 && (
        <>
          <SealedDivider />
          <section>
            <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
              Professions
            </h3>
            <div className="flex flex-col gap-3">
              {cls.professions.map((prof) => (
                <div
                  key={prof.id}
                  className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-sm"
                >
                  <div className="font-display text-base text-[var(--color-ink)]">
                    {prof.name}
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {prof.perks.map((perk) => (
                      <li key={perk.id}>
                        <span className="font-medium">{perk.name}.</span>{' '}
                        <span className="text-[var(--color-ink-soft)]">
                          {perk.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {cls.source}
      </footer>
    </ParchmentCard>
  );
}

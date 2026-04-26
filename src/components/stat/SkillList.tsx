import { cn } from '@/lib/cn';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import type { Skill, SkillCategory } from '@/domain/skill';

interface SkillListProps {
  skills: Skill[];
  className?: string;
}

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  combat: 'Combat',
  'adventure-physical': 'Adventure — Physical',
  'adventure-mental': 'Adventure — Mental',
  specialized: 'Specialized',
};

const CATEGORY_ORDER: SkillCategory[] = [
  'combat',
  'adventure-physical',
  'adventure-mental',
  'specialized',
];

export function SkillList({
  skills,
  className,
}: SkillListProps): React.JSX.Element {
  const grouped = new Map<SkillCategory, Skill[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const skill of skills) {
    grouped.get(skill.category)?.push(skill);
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="mb-2 font-display text-lg text-[var(--color-ink)]">
              {CATEGORY_LABEL[category]}
            </h3>
            <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {items.map((skill) => (
                <li
                  key={skill.id}
                  className="flex items-baseline justify-between gap-3 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5 text-sm"
                >
                  <span>
                    <span className="font-medium text-[var(--color-ink)]">
                      {skill.name}
                    </span>
                    {skill.notes && (
                      <span className="ml-2 text-xs italic text-[var(--color-ink-faint)]">
                        {skill.notes}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-ink-soft)]">
                    {skill.attribute ? (
                      <AcronymTooltip code={skill.attribute} />
                    ) : (
                      <span className="text-[var(--color-ink-faint)]">—</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

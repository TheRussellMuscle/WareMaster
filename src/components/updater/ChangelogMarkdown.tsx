import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { open as openUrl } from '@tauri-apps/plugin-shell';

interface ChangelogMarkdownProps {
  source: string;
}

export function ChangelogMarkdown({
  source,
}: ChangelogMarkdownProps): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        h1: ({ children }) => (
          <h2 className="mt-3 font-display text-base text-[var(--color-ink)] first:mt-0">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h3 className="mt-3 font-display text-sm text-[var(--color-ink)] first:mt-0">
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="mt-2 font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)] first:mt-0">
            {children}
          </h4>
        ),
        p: ({ children }) => <p className="my-1.5">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-snug">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--color-ink)]">
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, ...props }) => (
          <code
            className="rounded-sm bg-[var(--color-parchment-200)] px-1 py-0.5 font-mono text-[10px]"
            {...props}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-1.5 overflow-x-auto rounded-sm bg-[var(--color-parchment-200)] p-2 font-mono text-[10px]">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-1.5 border-l-2 border-[var(--color-parchment-400)] pl-2 italic text-[var(--color-ink-faint)]">
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr className="my-2 border-t border-[var(--color-parchment-300)]" />
        ),
        a: ({ href, children }) => {
          const safeHref =
            typeof href === 'string' && href.startsWith('https://') ? href : null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (safeHref) void openUrl(safeHref);
              }}
              className="underline decoration-dotted text-[var(--color-rust)] hover:text-[var(--color-rust)]/80 disabled:no-underline"
              disabled={safeHref === null}
              title={safeHref ?? 'Link blocked (only https:// allowed)'}
            >
              {children}
            </button>
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

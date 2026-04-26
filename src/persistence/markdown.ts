import yaml from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface MarkdownDoc<TFrontmatter> {
  frontmatter: TFrontmatter;
  body: string;
}

/**
 * Split a markdown file with YAML frontmatter into typed parts.
 * Returns the body verbatim (no trimming) so round-trip writes preserve content.
 */
export function parseMarkdown<TFrontmatter>(text: string): MarkdownDoc<TFrontmatter> {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) {
    return {
      frontmatter: {} as TFrontmatter,
      body: text,
    };
  }
  const fm = yaml.load(match[1] ?? '') as TFrontmatter;
  return {
    frontmatter: fm ?? ({} as TFrontmatter),
    body: match[2] ?? '',
  };
}

export function serializeMarkdown<TFrontmatter>(
  doc: MarkdownDoc<TFrontmatter>,
): string {
  const fm = yaml.dump(doc.frontmatter, { lineWidth: 100 }).trimEnd();
  return `---\n${fm}\n---\n\n${doc.body}`;
}

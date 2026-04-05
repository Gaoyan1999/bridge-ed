/** Turn single newlines into Markdown hard breaks so discovery text keeps line-oriented layout. */
export function discoveryPlainTextToMarkdown(src: string): string {
  return src.replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

/**
 * Normalises LangChain / provider message content (string, content-block
 * array, or single object) into plain text.
 */
export function responseText(content: unknown): string {
  if (typeof content === 'string') return content;

  if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
    return content.text;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('');

    if (text) return text;
  }

  return JSON.stringify(content);
}

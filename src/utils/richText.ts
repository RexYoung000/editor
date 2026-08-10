export interface RichTextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type RichTextCommand = 'bold' | 'italic' | 'underline';

export interface RichTextActiveStyles {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface RichTextStyleController {
  elementId: string | null;
  activeStyles: RichTextActiveStyles;
  applyCommand: (command: RichTextCommand) => boolean;
}

export const EMPTY_RICH_TEXT_ACTIVE_STYLES: RichTextActiveStyles = {
  bold: false,
  italic: false,
  underline: false,
};

export const EMPTY_RICH_TEXT_STYLE_CONTROLLER: RichTextStyleController = {
  elementId: null,
  activeStyles: EMPTY_RICH_TEXT_ACTIVE_STYLES,
  applyCommand: () => false,
};

export interface RichTextToken {
  text: string;
  style: RichTextStyle;
}

export interface RichTextBreak {
  break: true;
}

export type RichTextItem = RichTextToken | RichTextBreak;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

const RICH_TEXT_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN']);
const RICH_TEXT_DROP_CONTENT_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'BASE',
  'SVG',
  'MATH',
  'IMG',
  'VIDEO',
  'AUDIO',
  'SOURCE',
  'CANVAS',
]);

function sanitizeRichTextStyle(styleText: string): string {
  const rules: string[] = [];
  const fontWeight = styleText.match(/font-weight\s*:\s*(bold|[5-9]\d{2})/i)?.[1];
  if (fontWeight) rules.push(`font-weight: ${fontWeight.toLowerCase()}`);
  if (/font-style\s*:\s*italic/i.test(styleText)) rules.push('font-style: italic');
  if (/text-decoration[^;]*underline/i.test(styleText)) rules.push('text-decoration: underline');
  return rules.join('; ');
}

function tagNameFromHtml(tagHtml: string): string | null {
  return tagHtml.match(/^<\s*\/?\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() ?? null;
}

function styleFromHtmlTag(tagHtml: string): string {
  return tagHtml.match(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)?.slice(1).find(Boolean) ?? '';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeTagStyleFromHtml(tag: string, styleText: string, style: RichTextStyle): RichTextStyle {
  const next: RichTextStyle = { ...style };
  if (tag === 'B' || tag === 'STRONG') next.bold = true;
  if (tag === 'I' || tag === 'EM') next.italic = true;
  if (tag === 'U') next.underline = true;
  if (/font-weight\s*:\s*(bold|[5-9]\d{2})/i.test(styleText)) next.bold = true;
  if (/font-style\s*:\s*italic/i.test(styleText)) next.italic = true;
  if (/text-decoration[^;]*underline/i.test(styleText)) next.underline = true;
  return next;
}

function stripDroppedRichTextContent(html: string): string {
  let result = html;
  for (const tag of RICH_TEXT_DROP_CONTENT_TAGS) {
    const pattern = new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, 'gi');
    result = result.replace(pattern, '');
    const selfClosingPattern = new RegExp(`<\\s*${tag}\\b[^>]*(?:\\/\\s*)?>`, 'gi');
    result = result.replace(selfClosingPattern, '');
  }
  return result;
}

export function sanitizeRichTextHtml(html: string | undefined, fallbackText = ''): string {
  const source = html?.trim() ? html : plainTextToHtml(fallbackText);
  const stripped = stripDroppedRichTextContent(source);
  let result = '';
  let cursor = 0;
  const tagPattern = /<[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(stripped))) {
    result += escapeHtml(decodeHtmlEntities(stripped.slice(cursor, match.index)));
    cursor = match.index + match[0].length;

    const tag = tagNameFromHtml(match[0]);
    if (!tag || !RICH_TEXT_ALLOWED_TAGS.has(tag)) continue;
    if (tag === 'BR') {
      result += '<br />';
      continue;
    }

    const tagName = tag.toLowerCase();
    if (/^<\s*\//.test(match[0])) {
      result += `</${tagName}>`;
      continue;
    }

    const safeStyle = sanitizeRichTextStyle(styleFromHtmlTag(match[0]));
    const styleAttribute = safeStyle ? ` style="${escapeHtml(safeStyle)}"` : '';
    result += `<${tagName}${styleAttribute}>`;
  }

  result += escapeHtml(decodeHtmlEntities(stripped.slice(cursor)));
  return result;
}

function normalizeTagStyle(node: HTMLElement, style: RichTextStyle): RichTextStyle {
  const next: RichTextStyle = { ...style };
  const tag = node.tagName.toUpperCase();
  if (tag === 'B' || tag === 'STRONG') next.bold = true;
  if (tag === 'I' || tag === 'EM') next.italic = true;
  if (tag === 'U') next.underline = true;
  const css = node.getAttribute('style') ?? '';
  if (/font-weight\s*:\s*(bold|[5-9]\d{2})/i.test(css)) next.bold = true;
  if (/font-style\s*:\s*italic/i.test(css)) next.italic = true;
  if (/text-decoration[^;]*underline/i.test(css)) next.underline = true;
  return next;
}

function appendText(tokens: RichTextItem[], text: string, style: RichTextStyle): void {
  if (!text) return;
  tokens.push({ text, style: { ...style } });
}

function walkRichNode(node: Node, style: RichTextStyle, tokens: RichTextItem[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    appendText(tokens, node.textContent ?? '', style);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tag = element.tagName.toUpperCase();
  if (tag === 'BR') {
    tokens.push({ break: true });
    return;
  }

  const nextStyle = normalizeTagStyle(element, style);
  for (const child of Array.from(element.childNodes)) {
    walkRichNode(child, nextStyle, tokens);
  }
  if (tag === 'DIV' || tag === 'P') {
    tokens.push({ break: true });
  }
}

export function parseRichTextHtml(html: string | undefined, fallbackText: string, legacyStyle: RichTextStyle = {}): RichTextItem[] {
  const source = sanitizeRichTextHtml(html, fallbackText);
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    const tokens: RichTextItem[] = [];
    const styleStack: RichTextStyle[] = [{ ...legacyStyle }];
    let cursor = 0;
    const tagPattern = /<[^>]*>/g;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(source))) {
      appendText(tokens, decodeHtmlEntities(source.slice(cursor, match.index)), styleStack[styleStack.length - 1]);
      cursor = match.index + match[0].length;
      const tag = tagNameFromHtml(match[0]);
      if (!tag) continue;
      if (tag === 'BR') {
        tokens.push({ break: true });
      } else if (/^<\s*\//.test(match[0])) {
        if (styleStack.length > 1) styleStack.pop();
        if (tag === 'DIV' || tag === 'P') tokens.push({ break: true });
      } else {
        styleStack.push(normalizeTagStyleFromHtml(tag, styleFromHtmlTag(match[0]), styleStack[styleStack.length - 1]));
      }
    }
    appendText(tokens, decodeHtmlEntities(source.slice(cursor)), styleStack[styleStack.length - 1]);
    while (tokens.length > 0 && 'break' in tokens[tokens.length - 1]) tokens.pop();
    if (tokens.length === 0) tokens.push({ text: '', style: { ...legacyStyle } });
    return tokens;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${source}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [{ text: fallbackText, style: { ...legacyStyle } }];
  const tokens: RichTextItem[] = [];
  for (const child of Array.from(root.childNodes)) {
    walkRichNode(child, legacyStyle, tokens);
  }
  while (tokens.length > 0 && 'break' in tokens[tokens.length - 1]) tokens.pop();
  if (tokens.length === 0) tokens.push({ text: '', style: { ...legacyStyle } });
  return tokens;
}

export function richTextToPlainText(html: string | undefined, fallbackText: string): string {
  const tokens = parseRichTextHtml(html, fallbackText);
  let text = '';
  for (const token of tokens) text += 'break' in token ? '\n' : token.text;
  return text;
}

type LibrarySearchableEntry = {
  name: string;
  libraryPath: string;
};

type LibrarySearchAliasRule = {
  pathPattern: RegExp;
  aliases: readonly string[];
};

const LIBRARY_SEARCH_ALIAS_RULES: readonly LibrarySearchAliasRule[] = [
  {
    pathPattern: /^通用素材\/icon纸片人\//iu,
    aliases: ['IP人物', 'IP角色', 'IP头像', '人物', '角色', '纸片人'],
  },
  {
    pathPattern: /^通用素材\/道具素材\//u,
    aliases: ['道具', '教学道具'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/(?:S7大力熊|dlx)/iu,
    aliases: ['大力熊'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/(?:S7皮皮虎|pph)/iu,
    aliases: ['皮皮虎'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/(?:S7眯眯猫|[ab]\.png$)/iu,
    aliases: ['眯眯猫'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/(?:S7聪明鹿|cml)/iu,
    aliases: ['聪明鹿'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/syls/iu,
    aliases: ['山羊老师'],
  },
  {
    pathPattern: /^通用素材\/icon纸片人\/wdjl/iu,
    aliases: ['豌豆精灵'],
  },
];

const DIRECTORY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  icon纸片人: 'IP人物',
  道具素材: '道具',
};

export function displayLibraryDirectoryName(name: string): string {
  return DIRECTORY_DISPLAY_NAMES[name] ?? name;
}

export function displayLibraryPath(pathSegments: readonly string[]): string {
  return pathSegments.map(displayLibraryDirectoryName).join(' / ');
}

export function normalizeLibrarySearchText(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s_./\\\-–—~·,，、:：;；()（）[\]【】]+/gu, '');
}

export function detectLibrarySeries(text: string): string {
  const matches = [...text.matchAll(/(?:^|[^a-z0-9])(S\d+(?:\s*[-–—~至]\s*S?\d+)?)/giu)];
  return matches.at(-1)?.[1]
    ?.replace(/[–—~至]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase() ?? '';
}

export function getLibrarySearchAliases(libraryPath: string): string[] {
  return LIBRARY_SEARCH_ALIAS_RULES
    .filter((rule) => rule.pathPattern.test(libraryPath))
    .flatMap((rule) => [...rule.aliases]);
}

/**
 * 可控模糊匹配：文件名、完整目录与业务别名共同参与包含匹配。
 * 多个空格关键词仍采用 AND 关系，不做拼音、错别字或 AI 语义扩展。
 */
export function matchesLibrarySearchQuery(entry: LibrarySearchableEntry, query: string): boolean {
  const keywords = query.trim().split(/\s+/u).filter(Boolean);
  if (keywords.length === 0) return true;

  const target = normalizeLibrarySearchText([
    entry.name,
    entry.libraryPath,
    ...getLibrarySearchAliases(entry.libraryPath),
  ].join(' '));

  return keywords.every((keyword) => target.includes(normalizeLibrarySearchText(keyword)));
}

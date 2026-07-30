import type { Element } from '../types';
import { lookupBuiltinByExportPath, lookupBuiltinBySrcPath } from '../elements/builtinAssets';
import { DEFAULT_FONT_ID, normalizeFontLibraryId } from '../elements/fontLibrary';

export type PresetPreviewKind = 'image' | 'text' | 'video';

const PREVIEW_KINDS: Partial<Record<string, PresetPreviewKind>> = {
  NewImage: 'image',
  SoundButton: 'image',
  NewTextArea: 'text',
  Video: 'video',
};

export function presetPreviewKind(element: Element): PresetPreviewKind | null {
  return PREVIEW_KINDS[element.type] ?? null;
}

export function resolvePresetPreviewSkin(skin: unknown): string | null {
  if (typeof skin !== 'string' || !skin) return null;
  const byExport = lookupBuiltinByExportPath(skin);
  if (byExport) return `/builtin/${byExport.src}`;
  const bySrc = lookupBuiltinBySrcPath(skin);
  if (bySrc) return `/builtin/${bySrc.src}`;
  return null;
}

export function isPresetPreviewVisible(element: Element): boolean {
  if (element.props._editorHidden === true) return false;
  return !('visible' in element.props) || element.props.visible === true;
}

export function getPresetPreviewIssues(elements: Element[]): string[] {
  const issues: string[] = [];
  const ids = new Set(elements.map((element) => element.id));
  const idCounts = new Map<string, number>();
  const byId = new Map<string, Element>();

  for (const element of elements) {
    idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
    byId.set(element.id, element);
  }

  for (const element of elements) {
    if ((idCounts.get(element.id) ?? 0) > 1) {
      issues.push(`${element.id}: duplicate id`);
    }
    const kind = presetPreviewKind(element);
    if (!kind) {
      issues.push(`${element.id}: unsupported type ${element.type}`);
      continue;
    }
    if (element.parentId && !ids.has(element.parentId)) {
      issues.push(`${element.id}: missing parent ${element.parentId}`);
    }
    if (!Number.isFinite(element.x) || !Number.isFinite(element.y)
      || !Number.isFinite(element.width) || !Number.isFinite(element.height)
      || element.width <= 0 || element.height <= 0) {
      issues.push(`${element.id}: invalid geometry`);
    }
    const anchorX = element.props.anchorX;
    const anchorY = element.props.anchorY;
    if (!Number.isFinite(element.rotation)
      || !Number.isFinite(element.opacity)
      || element.opacity < 0 || element.opacity > 1
      || (anchorX !== undefined && !Number.isFinite(anchorX))
      || (anchorY !== undefined && !Number.isFinite(anchorY))) {
      issues.push(`${element.id}: invalid transform`);
    }
    if (kind === 'image' && !resolvePresetPreviewSkin(element.props.skin)) {
      issues.push(`${element.id}: unregistered skin ${String(element.props.skin ?? '')}`);
    }
    if (kind === 'image'
      && typeof element.props.sizeGrid === 'string'
      && element.props.sizeGrid.trim()) {
      issues.push(`${element.id}: unsupported image sizeGrid`);
    }
    if (element.type === 'SoundButton'
      && element.props.stateNum !== undefined
      && element.props.stateNum !== 1) {
      issues.push(`${element.id}: unsupported SoundButton stateNum ${String(element.props.stateNum)}`);
    }
    if (kind === 'text'
      && normalizeFontLibraryId(element.props.fontLibraryId) !== DEFAULT_FONT_ID) {
      issues.push(`${element.id}: unsupported preview font ${String(element.props.fontLibraryId)}`);
    }
    if (kind === 'text'
      && typeof element.props.fontLocalPath === 'string'
      && element.props.fontLocalPath) {
      issues.push(`${element.id}: unsupported local preview font`);
    }
  }

  for (const element of elements) {
    const parentChain = new Set<string>();
    let current: Element | undefined = element;
    while (current?.parentId) {
      if (parentChain.has(current.id)) {
        issues.push(`${element.id}: cyclic parent relation`);
        break;
      }
      parentChain.add(current.id);
      current = byId.get(current.parentId);
    }
  }

  return [...new Set(issues)];
}

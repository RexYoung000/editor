import type { CSSProperties, ReactNode } from 'react';
import type { Element } from '../types';
import { DEFAULT_FONT_FACE } from '../elements/fontLibrary';
import {
  isPresetPreviewVisible,
  presetPreviewKind,
  resolvePresetPreviewSkin,
} from '../presets/preview';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

function numberProp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function textVisual(element: Element): ReactNode {
  const props = element.props;
  const fontSize = numberProp(props.fontSize, 38);
  const leading = numberProp(props.leading, 0);
  const valign = props.valign === 'middle'
    ? 'center'
    : props.valign === 'bottom'
      ? 'flex-end'
      : 'flex-start';
  const style: CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: valign,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    color: typeof props.color === 'string' ? props.color : '#ffffff',
    fontFamily: `${DEFAULT_FONT_FACE}, sans-serif`,
    fontSize,
    fontStyle: props.italic ? 'italic' : 'normal',
    fontWeight: props.bold ? 700 : 400,
    lineHeight: `${fontSize + leading}px`,
    textAlign: props.align === 'center' || props.align === 'right' ? props.align : 'left',
    whiteSpace: props.wordWrap === false ? 'pre' : 'pre-wrap',
    overflowWrap: 'anywhere',
  };

  return (
    <foreignObject width={element.width} height={element.height}>
      <div style={style}>
        <div style={{ width: '100%' }}>{String(props.text ?? '')}</div>
      </div>
    </foreignObject>
  );
}

function elementVisual(element: Element): ReactNode {
  const kind = presetPreviewKind(element);
  if (kind === 'text') return textVisual(element);
  if (kind === 'video') {
    return (
      <g>
        <rect width={element.width} height={element.height} fill="#020617" />
        <circle cx={element.width / 2} cy={element.height / 2} r={90} fill="#334155" />
        <path
          d={`M ${element.width / 2 - 28} ${element.height / 2 - 48} L ${element.width / 2 + 54} ${element.height / 2} L ${element.width / 2 - 28} ${element.height / 2 + 48} Z`}
          fill="#cbd5e1"
        />
      </g>
    );
  }

  const skin = resolvePresetPreviewSkin(element.props.skin);
  return skin ? (
    <image
      href={skin}
      width={element.width}
      height={element.height}
      preserveAspectRatio="none"
    />
  ) : null;
}

function previewElement(
  element: Element,
  childMap: Map<string, Element[]>,
  visiting: Set<string>,
): ReactNode {
  if (visiting.has(element.id) || !isPresetPreviewVisible(element)) return null;
  const nextVisiting = new Set(visiting).add(element.id);
  const anchorX = numberProp(element.props.anchorX, 0);
  const anchorY = numberProp(element.props.anchorY, 0);
  const left = element.x - element.width * anchorX;
  const top = element.y - element.height * anchorY;
  const rotation = numberProp(element.rotation, 0);
  const transform = `translate(${left} ${top}) rotate(${rotation} ${element.width * anchorX} ${element.height * anchorY})`;

  return (
    <g key={element.id} transform={transform} opacity={numberProp(element.opacity, 1)}>
      {elementVisual(element)}
      {(childMap.get(element.id) ?? []).map((child) => (
        previewElement(child, childMap, nextVisiting)
      ))}
    </g>
  );
}

interface Props {
  elements: Element[];
  label: string;
}

export default function PresetTemplatePreview({ elements, label }: Props) {
  const ids = new Set(elements.map((element) => element.id));
  const childMap = new Map<string, Element[]>();
  for (const element of elements) {
    if (!element.parentId || !ids.has(element.parentId)) continue;
    childMap.set(element.parentId, [...(childMap.get(element.parentId) ?? []), element]);
  }
  const roots = elements.filter((element) => !element.parentId || !ids.has(element.parentId));

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full bg-slate-950"
      role="img"
      aria-label={`${label}模板预览`}
    >
      {roots.map((element) => previewElement(element, childMap, new Set()))}
    </svg>
  );
}

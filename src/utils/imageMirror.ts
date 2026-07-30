import type { Element } from '../types';

export type ImageMirrorAxis = 'horizontal' | 'vertical';

export interface ImageMirrorTransform {
  x: number;
  y: number;
  scaleX: 1 | -1;
  scaleY: 1 | -1;
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toggleImageMirrorProps(
  props: Record<string, unknown>,
  axis: ImageMirrorAxis,
): Record<string, unknown> {
  const key = axis === 'horizontal' ? 'mirrorX' : 'mirrorY';
  return { ...props, [key]: props[key] !== true };
}

export function getImageMirrorTransform(element: Element): ImageMirrorTransform {
  const mirrorX = element.props.mirrorX === true;
  const mirrorY = element.props.mirrorY === true;
  const anchorX = finiteNumber(element.props.anchorX, 0);
  const anchorY = finiteNumber(element.props.anchorY, 0);
  const localOffsetX = mirrorX ? (1 - 2 * anchorX) * element.width : 0;
  const localOffsetY = mirrorY ? (1 - 2 * anchorY) * element.height : 0;
  const radians = finiteNumber(element.rotation, 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: element.x + cos * localOffsetX - sin * localOffsetY,
    y: element.y + sin * localOffsetX + cos * localOffsetY,
    scaleX: mirrorX ? -1 : 1,
    scaleY: mirrorY ? -1 : 1,
  };
}

import { useRef, useEffect, useCallback } from 'react';

interface RulerProps {
  /** Orientation: horizontal (top) or vertical (left) */
  orientation: 'horizontal' | 'vertical';
  /** Canvas logical size (1920 or 1080) */
  length: number;
  /** Current zoom factor */
  zoom: number;
  /** 固定画布窗口在工作区中的位置 */
  offsetX: number;
  offsetY: number;
  /** 固定画布窗口在当前方向上的长度 */
  viewportLength: number;
  /** 镜头内容相对固定窗口起点的偏移 */
  contentOffset: number;
  /** Ruler strip width in viewport pixels (fixed, not scaled) */
  rulerWidth: number;
}

const RULER_PX = 20; // logical ruler strip width
const TICK_MAJOR = 100;
const TICK_MINOR = 50;
const TICK_FINE = 10;

export default function CanvasRuler({
  orientation,
  length,
  zoom,
  offsetX,
  offsetY,
  viewportLength,
  contentOffset,
  rulerWidth,
}: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const visibleStart = Math.max(0, Math.floor((-contentOffset / zoom) / TICK_FINE) * TICK_FINE);
    const visibleEnd = Math.min(length, Math.ceil(((viewportLength - contentOffset) / zoom) / TICK_FINE) * TICK_FINE);

    if (orientation === 'horizontal') {
      const w = viewportLength;
      const h = rulerWidth;
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);

      // Bottom border line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 0.5);
      ctx.lineTo(w, h - 0.5);
      ctx.stroke();

      // Tick marks
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'bottom';

      for (let logical = visibleStart; logical <= visibleEnd; logical += TICK_FINE) {
        const px = contentOffset + logical * zoom;

        let tickH: number;
        let lineW: number;
        if (logical % TICK_MAJOR === 0) {
          tickH = h; lineW = 1;
        } else if (logical % TICK_MINOR === 0) {
          tickH = h * 0.5; lineW = 0.5;
        } else {
          tickH = h * 0.25; lineW = 0.5;
        }

        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.moveTo(px, h);
        ctx.lineTo(px, h - tickH);
        ctx.stroke();

        // Label on major ticks
        if (logical % TICK_MAJOR === 0 && logical > 0) {
          ctx.fillText(String(logical), px + 3, h - 2);
        }
      }
    } else {
      // Vertical
      const w = rulerWidth;
      const h = viewportLength;
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);

      // Right border line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w - 0.5, 0);
      ctx.lineTo(w - 0.5, h);
      ctx.stroke();

      // Tick marks
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'top';

      for (let logical = visibleStart; logical <= visibleEnd; logical += TICK_FINE) {
        const px = contentOffset + logical * zoom;

        let tickW: number;
        let lineW: number;
        if (logical % TICK_MAJOR === 0) {
          tickW = w; lineW = 1;
        } else if (logical % TICK_MINOR === 0) {
          tickW = w * 0.5; lineW = 0.5;
        } else {
          tickW = w * 0.25; lineW = 0.5;
        }

        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.moveTo(w, px);
        ctx.lineTo(w - tickW, px);
        ctx.stroke();

        // Label on major ticks
        if (logical % TICK_MAJOR === 0 && logical > 0) {
          ctx.save();
          ctx.translate(w - 2, px + 3);
          ctx.rotate(-Math.PI / 2);
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(logical), 0, 0);
          ctx.restore();
        }
      }
    }
  }, [orientation, length, zoom, viewportLength, contentOffset, rulerWidth]);

  useEffect(() => { draw(); }, [draw]);

  const style: React.CSSProperties =
    orientation === 'horizontal'
      ? { position: 'absolute', left: offsetX, top: offsetY - rulerWidth, zIndex: 10, pointerEvents: 'none' }
      : { position: 'absolute', left: offsetX - rulerWidth, top: offsetY, zIndex: 10, pointerEvents: 'none' };

  return <canvas ref={canvasRef} style={style} />;
}

export { RULER_PX };

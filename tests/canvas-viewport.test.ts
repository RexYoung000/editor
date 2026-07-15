import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANVAS_ZOOM_BUTTON_STEP,
  constrainViewportToFrame,
  fitCanvasFrame,
  fitCanvasViewport,
  normalizeWheelDelta,
  panViewportByWheel,
  zoomViewportAtPoint,
  zoomViewportByWheel,
} from '../src/utils/canvasViewport';

test('鼠标锚点缩放前后对应同一个画布坐标', () => {
  const viewport = { zoom: 0.4, panX: 120, panY: 80 };
  const anchor = { x: 560, y: 320 };
  const before = {
    x: (anchor.x - viewport.panX) / viewport.zoom,
    y: (anchor.y - viewport.panY) / viewport.zoom,
  };
  const next = zoomViewportAtPoint(viewport, viewport.zoom + CANVAS_ZOOM_BUTTON_STEP, anchor);
  assert.ok(Math.abs((anchor.x - next.panX) / next.zoom - before.x) < 0.000001);
  assert.ok(Math.abs((anchor.y - next.panY) / next.zoom - before.y) < 0.000001);
});

test('Mac 触控板的小幅输入产生连续低速缩放，不再固定跳 10%', () => {
  const viewport = { zoom: 0.5, panX: 100, panY: 100 };
  const next = zoomViewportByWheel(viewport, -4, 0, 800, { x: 400, y: 300 });
  assert.ok(next.zoom > 0.5);
  assert.ok(next.zoom < 0.505);
});

test('鼠标滚轮的大输入会限制单次缩放幅度', () => {
  const viewport = { zoom: 1, panX: 0, panY: 0 };
  const next = zoomViewportByWheel(viewport, -120, 0, 800, { x: 400, y: 300 });
  assert.ok(next.zoom > 1);
  assert.ok(next.zoom < 1.09);
  assert.equal(normalizeWheelDelta(-120, 0, 800), -80);
});

test('普通滚轮平移，Shift 将垂直输入转为横向平移', () => {
  const viewport = { zoom: 0.5, panX: 100, panY: 100 };
  assert.deepEqual(panViewportByWheel(viewport, 0, 20, 0, 1000, 800), { zoom: 0.5, panX: 100, panY: 80 });
  assert.deepEqual(panViewportByWheel(viewport, 0, 20, 0, 1000, 800, true), { zoom: 0.5, panX: 80, panY: 100 });
});

test('适应画布根据当前视口动态计算并居中', () => {
  const fitted = fitCanvasViewport(1200, 700, 1920, 1080);
  assert.ok(fitted.zoom > 0.5 && fitted.zoom < 0.57);
  assert.ok(Math.abs(fitted.panX - (1200 - 1920 * fitted.zoom) / 2) < 0.000001);
  assert.ok(Math.abs(fitted.panY - (700 - 1080 * fitted.zoom) / 2) < 0.000001);
});

test('固定画布窗口约束镜头，不能把内容拖出有效范围', () => {
  const frame = fitCanvasFrame(1200, 700, 1920, 1080);
  const zoomed = constrainViewportToFrame(
    { zoom: 0.8, panX: 9999, panY: -9999 },
    frame,
    1920,
    1080,
  );
  assert.equal(zoomed.panX, frame.x);
  assert.equal(zoomed.panY, frame.y + frame.height - 1080 * 0.8);

  const fitted = constrainViewportToFrame(
    { zoom: frame.fitZoom, panX: -500, panY: 500 },
    frame,
    1920,
    1080,
  );
  assert.ok(Math.abs(fitted.panX - frame.x) < 0.000001);
  assert.ok(Math.abs(fitted.panY - frame.y) < 0.000001);
});

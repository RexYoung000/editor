import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAYER_PANEL_LAYOUT,
  constrainBottomHeight,
  constrainFloatingLayerPanel,
  constrainSideWidth,
  normalizeLayerPanelLayout,
  resolveLayerPanelSnap,
} from '../src/utils/layerPanelLayout';

test('损坏或过期的图层布局会恢复为可用范围', () => {
  const normalized = normalizeLayerPanelLayout({
    mode: 'outside-window',
    open: 'yes',
    bottomHeight: 20,
    sideWidth: 999,
    floating: { x: Number.NaN, y: -80, width: 120, height: 80 },
  });

  assert.equal(normalized.mode, 'bottom');
  assert.equal(normalized.open, true);
  assert.equal(normalized.bottomHeight, 140);
  assert.equal(normalized.sideWidth, 420);
  assert.equal(normalized.floating.x, DEFAULT_LAYER_PANEL_LAYOUT.floating.x);
  assert.equal(normalized.floating.y, -80);
  assert.equal(normalized.floating.width, 240);
  assert.equal(normalized.floating.height, 180);
});

test('自由浮动面板始终完整保留在编辑器范围内', () => {
  assert.deepEqual(
    constrainFloatingLayerPanel({ x: 700, y: 500, width: 300, height: 300 }, { width: 800, height: 600 }),
    { x: 500, y: 300, width: 300, height: 300 },
  );
  assert.deepEqual(
    constrainFloatingLayerPanel({ x: 40, y: 20, width: 300, height: 300 }, { width: 180, height: 120 }),
    { x: 0, y: 0, width: 180, height: 120 },
  );
});

test('停靠尺寸在正常和极窄窗口中都保留可操作入口', () => {
  assert.equal(constrainSideWidth(300, 360), 300);
  assert.equal(constrainSideWidth(300, 180), 180);
  assert.equal(constrainSideWidth(300, 10), 36);
  assert.equal(constrainBottomHeight(224, 180), 180);
  assert.equal(constrainBottomHeight(224, 30), 36);
});

test('磁吸只在三个边缘的弱提示范围内命中', () => {
  const geometry = { sidebarRight: 240, propertyLeft: 944, workspaceHeight: 720 };
  assert.equal(resolveLayerPanelSnap({ x: 245, y: 260 }, geometry), 'left');
  assert.equal(resolveLayerPanelSnap({ x: 938, y: 260 }, geometry), 'right');
  assert.equal(resolveLayerPanelSnap({ x: 120, y: 690 }, geometry), 'bottom');
  assert.equal(resolveLayerPanelSnap({ x: 560, y: 320 }, geometry), null);
  assert.equal(resolveLayerPanelSnap({ x: 300, y: 690 }, geometry), null);
});

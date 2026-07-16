import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/context';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * 颜色选择器组件
 * 支持 Hex 和 RGBA 两种格式输入
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'hex' | 'rgba'>('hex');
  const [rgba, setRgba] = useState(() => parseColor(value));

  // 解析颜色值
  useEffect(() => {
    const parsed = parseColor(value);
    setRgba(parsed); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value]);

  // Hex 输入框变化
  const handleHexChange = (hex: string) => {
    onChange(hex);
  };

  // RGBA 输入框变化
  const handleRgbaChange = (key: 'r' | 'g' | 'b' | 'a', val: string) => {
    const num = key === 'a' ? parseFloat(val) : parseInt(val, 10);
    if (isNaN(num)) return;

    const newRgba = { ...rgba, [key]: num };
    setRgba(newRgba);

    // 转换为 hex 格式
    const hex = rgbaToHex(newRgba);
    onChange(hex);
  };

  // 颜色选择器变化
  const handleColorPickerChange = (hex: string) => {
    onChange(hex);
  };

  const hexValue = value || '#000000';

  return (
    <div className="flex items-center gap-1.5">
      {/* 颜色选择器 */}
      <input
        type="color"
        value={hexValue.substring(0, 7)} // 只取前7位（#RRGGBB）
        onChange={(e) => handleColorPickerChange(e.target.value)}
        className="w-7 h-6 rounded border border-slate-600 p-0 cursor-pointer shrink-0"
      />

      {/* 模式切换按钮 */}
      <button
        type="button"
        onClick={() => setMode(mode === 'hex' ? 'rgba' : 'hex')}
        className="px-2 h-6 text-xs bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
        title={mode === 'hex' ? t('switchToRgba') : t('switchToHex')}
      >
        {mode === 'hex' ? 'RGBA' : 'Hex'}
      </button>

      {/* Hex 输入框 */}
      {mode === 'hex' && (
        <input
          type="text"
          value={hexValue}
          onChange={(e) => handleHexChange(e.target.value)}
          className="flex-1 px-2 h-6 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          placeholder="#000000"
        />
      )}

      {/* RGBA 输入框 */}
      {mode === 'rgba' && (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="number"
            value={rgba.r}
            onChange={(e) => handleRgbaChange('r', e.target.value)}
            min="0"
            max="255"
            className="w-12 px-1 h-6 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="R"
          />
          <input
            type="number"
            value={rgba.g}
            onChange={(e) => handleRgbaChange('g', e.target.value)}
            min="0"
            max="255"
            className="w-12 px-1 h-6 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="G"
          />
          <input
            type="number"
            value={rgba.b}
            onChange={(e) => handleRgbaChange('b', e.target.value)}
            min="0"
            max="255"
            className="w-12 px-1 h-6 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="B"
          />
          <input
            type="number"
            value={rgba.a}
            onChange={(e) => handleRgbaChange('a', e.target.value)}
            min="0"
            max="1"
            step="0.01"
            className="w-12 px-1 h-6 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="A"
          />
        </div>
      )}
    </div>
  );
}

/**
 * 解析颜色值为 RGBA
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  if (!color) return { r: 0, g: 0, b: 0, a: 1 };

  // Hex 格式：#RRGGBB 或 #RRGGBBAA
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return { r: 0, g: 0, b: 0, a: 1 };
    const padded = hex.length === 3
      ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
      : hex.length < 6 ? hex.padEnd(6, '0')
      : hex;
    const r = parseInt(padded.substring(0, 2), 16);
    const g = parseInt(padded.substring(2, 4), 16);
    const b = parseInt(padded.substring(4, 6), 16);
    const a = padded.length >= 8 ? parseInt(padded.substring(6, 8), 16) / 255 : 1;
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return { r: 0, g: 0, b: 0, a: 1 };
    return { r, g, b, a };
  }

  // 默认黑色
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * RGBA 转 Hex
 */
function rgbaToHex({ r, g, b, a }: { r: number; g: number; b: number; a: number }): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // 如果 alpha 不是 1，添加 alpha 通道
  if (a < 1) {
    const alphaHex = toHex(a * 255);
    return hex + alphaHex;
  }

  return hex;
}

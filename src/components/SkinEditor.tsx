import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { generateButtonSkin, generateCheckboxSkin, generateRadioSkin, generateInputSkin, generateProgressSkin, generateTabSkin, generateVSliderSkin } from '../utils/skinGenerator';
import { useI18n } from '../i18n';

interface Props {
  layaType: string;
  currentProps: Record<string, unknown>;
  onApply: (skinData: string | Record<string, string>, params: Record<string, unknown>) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { key: 'colorBlue', bg: '#4A90D9', hover: '#5BA0E9', press: '#3A7BC8' },
  { key: 'colorGreen', bg: '#52c41a', hover: '#73d13d', press: '#389e0d' },
  { key: 'colorRed', bg: '#f5222d', hover: '#ff4d4f', press: '#cf1322' },
  { key: 'colorOrange', bg: '#fa8c16', hover: '#ffa940', press: '#d46b08' },
  { key: 'colorPurple', bg: '#722ed1', hover: '#9254de', press: '#531dab' },
  { key: 'colorGray', bg: '#8c8c8c', hover: '#a6a6a6', press: '#595959' },
];

type SkinType = 'button' | 'input' | 'check' | 'radio' | 'progress' | 'tab' | 'slider';

function getSkinType(layaType: string): SkinType {
  if (layaType === 'ScaleButton' || layaType === 'SoundButton') return 'button';
  if (layaType === 'TextInput') return 'input';
  if (layaType === 'CheckBox') return 'check';
  if (layaType === 'Radio' || layaType === 'RadioGroup') return 'radio';
  if (layaType === 'ProgressBar') return 'progress';
  if (layaType === 'Tab') return 'tab';
  if (layaType === 'VSlider') return 'slider';
  return 'button';
}

function getSkinLabel(skinType: SkinType, t: (key: string) => string): string {
  const labels: Record<SkinType, string> = {
    button: t('buttonSkinHint'),
    input: t('inputSkinHint'),
    check: t('checkSkinHint'),
    radio: t('radioSkinHint'),
    progress: t('progressSkinHint'),
    tab: t('tabSkinHint'),
    slider: t('sliderSkinHint'),
  };
  return labels[skinType];
}

export default function SkinEditor({ layaType, currentProps, onApply, onClose }: Props) {
  const { t } = useI18n();
  const skinType = getSkinType(layaType);

  const [bgColor, setBgColor] = useState((currentProps._bgColor as string) ?? '#4A90D9');
  const [hoverColor, setHoverColor] = useState((currentProps._hoverColor as string) ?? '#5BA0E9');
  const [pressColor, setPressColor] = useState((currentProps._pressColor as string) ?? '#3A7BC8');
  const [borderColor, setBorderColor] = useState((currentProps._borderColor as string) ?? '#d9d9d9');
  const [borderWidth, setBorderWidth] = useState((currentProps._borderWidth as number) ?? 0);
  const [borderRadius, setBorderRadius] = useState((currentProps._borderRadius as number) ?? 8);
  const [barColor, setBarColor] = useState((currentProps._barColor as string) ?? '#4A90D9');
  const [inactiveColor, setInactiveColor] = useState((currentProps._inactiveColor as string) ?? '#f0f0f0');

  const previewRef = useRef<HTMLCanvasElement>(null);

  const previewSize = { button: { w: 120, h: 120 }, input: { w: 200, h: 40 }, check: { w: 20, h: 60 }, radio: { w: 20, h: 60 }, progress: { w: 200, h: 30 }, tab: { w: 160, h: 72 }, slider: { w: 20, h: 100 } };
  const { w: pw, h: ph } = previewSize[skinType];

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawImg = (src: string) => { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height); img.src = src; };

    switch (skinType) {
      case 'button': drawImg(generateButtonSkin({ width: 120, height: 40, upColor: bgColor, overColor: hoverColor, downColor: pressColor, borderColor, borderWidth, radius: borderRadius })); break;
      case 'input': drawImg(generateInputSkin({ width: 200, height: 40, bgColor, borderColor, radius: borderRadius })); break;
      case 'check': drawImg(generateCheckboxSkin({ color: bgColor, borderColor })); break;
      case 'radio': drawImg(generateRadioSkin({ color: bgColor, borderColor })); break;
      case 'progress': {
        const p = generateProgressSkin({ width: 200, height: 14, bgColor, barColor });
        const img1 = new Image(); const img2 = new Image();
        img1.onload = () => { ctx.drawImage(img1, 0, 0, 200, 14); img2.src = p.bar; };
        img2.onload = () => { ctx.drawImage(img2, 0, 16, 200, 14); };
        img1.src = p.bg;
        break;
      }
      case 'tab': drawImg(generateTabSkin({ width: 80, height: 36, activeColor: bgColor, inactiveColor })); break;
      case 'slider': {
        const s = generateVSliderSkin({ trackColor: bgColor, thumbColor: barColor });
        const img1 = new Image(); const img2 = new Image();
        img1.onload = () => { ctx.drawImage(img1, 7, 0, 6, 100); img2.src = s.thumb; };
        img2.onload = () => { ctx.drawImage(img2, 2, 40, 16, 16); };
        img1.src = s.track;
        break;
      }
    }
  }, [bgColor, hoverColor, pressColor, borderColor, borderWidth, borderRadius, barColor, inactiveColor, skinType]);

  const handleApply = () => {
    const params: Record<string, unknown> = { _bgColor: bgColor, _borderColor: borderColor, _borderRadius: borderRadius, _borderWidth: borderWidth };

    switch (skinType) {
      case 'button': {
        params._hoverColor = hoverColor;
        params._pressColor = pressColor;
        const skin = generateButtonSkin({ width: 120, height: 40, upColor: bgColor, overColor: hoverColor, downColor: pressColor, borderColor, borderWidth, radius: borderRadius });
        onApply(skin, params);
        break;
      }
      case 'input': {
        const skin = generateInputSkin({ width: 200, height: 40, bgColor, borderColor, radius: borderRadius });
        onApply(skin, params);
        break;
      }
      case 'check': {
        const skin = generateCheckboxSkin({ color: bgColor, borderColor });
        onApply(skin, params);
        break;
      }
      case 'radio': {
        const skin = generateRadioSkin({ color: bgColor, borderColor });
        onApply(skin, params);
        break;
      }
      case 'progress': {
        params._barColor = barColor;
        const p = generateProgressSkin({ bgColor, barColor });
        onApply(p.bg, params);
        break;
      }
      case 'tab': {
        params._inactiveColor = inactiveColor;
        const skin = generateTabSkin({ activeColor: bgColor, inactiveColor });
        onApply(skin, params);
        break;
      }
      case 'slider': {
        params._barColor = barColor;
        const s = generateVSliderSkin({ trackColor: bgColor, thumbColor: barColor });
        onApply(s.track, params);
        break;
      }
    }
  };

  const applyPreset = (p: typeof COLOR_PRESETS[0]) => {
    setBgColor(p.bg);
    setHoverColor(p.hover);
    setPressColor(p.press);
  };

  const inputCls = 'w-full px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500';
  const colorRow = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-6 rounded border border-slate-600 p-0 cursor-pointer" />
      <input className={inputCls + ' flex-1'} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  return (
    <div
      data-keep-selection
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">{t('skinEditor')}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-[10px] text-slate-500">{getSkinLabel(skinType, t)}</div>

          <div className="bg-slate-900 rounded p-3 flex items-center justify-center">
            <canvas ref={previewRef} width={pw} height={ph} className="max-w-full" />
          </div>

          {/* 预设 */}
          <div>
            <div className="text-xs text-slate-400 mb-1">{t('presets')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((p) => (
                <button key={p.key} onClick={() => applyPreset(p)}
                  className="px-2 py-1 text-xs rounded text-white" style={{ backgroundColor: p.bg }}>
                  {t(p.key)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {colorRow(skinType === 'check' || skinType === 'radio' ? t('selectedColor') : skinType === 'tab' ? t('selectedColor') : t('bgColor'), bgColor, setBgColor)}

            {skinType === 'button' && (
              <>{colorRow(t('hoverColor'), hoverColor, setHoverColor)}{colorRow(t('pressColor'), pressColor, setPressColor)}</>
            )}

            {(skinType === 'progress' || skinType === 'slider') && colorRow(t('progressSliderColor'), barColor, setBarColor)}

            {skinType === 'tab' && colorRow(t('unselectedColor'), inactiveColor, setInactiveColor)}

            {colorRow(t('borderColor'), borderColor, setBorderColor)}

            {(skinType === 'button' || skinType === 'input') && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16 shrink-0">{t('borderWidth')}</span>
                  <input type="range" min={0} max={5} step={1} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="flex-1 accent-blue-500" />
                  <span className="text-xs text-slate-400 w-6 text-right">{borderWidth}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16 shrink-0">{t('borderRadius')}</span>
                  <input type="range" min={0} max={30} step={1} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="flex-1 accent-blue-500" />
                  <span className="text-xs text-slate-400 w-6 text-right">{borderRadius}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{t('cancel')}</button>
          <button onClick={handleApply} className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white">{t('apply')}</button>
        </div>
      </div>
    </div>
  );
}

import type { LayaObj, LayaAny } from './core';
import type { Element } from '../../types';
import { laya, classUtils, isPreviewMode, canvasRoot } from './core';
import { elementMeta } from '../../elements/elementMeta';
import { lookupBuiltinByExportPath } from '../../elements/builtinAssets';
import { readFileAsDataUrl } from '../electronFs';
import { getKeyboardPreset } from '../../elements/keyboardPresets';
import { getCachedVideoThumbnail } from '../videoThumbnail';
import { getDefaultSkins, generateButtonSkin, generateCheckboxSkin, generateRadioSkin, generateInputSkin } from '../skinGenerator';
import { resolveElementFont } from '../fontLoader';
import { getEditorCanvasFillColor, isEditorCanvasHitThrough } from '../canvasComposite';
import { isElementHidden } from '../layerState';

function dr(g: LayaAny, x: number, y: number, w: number, h: number, fill: string | null, stroke?: string, sw?: number) {
  if (stroke && sw && sw > 0) g.drawRect(x, y, w, h, fill, stroke, sw);
  else if (fill) g.drawRect(x, y, w, h, fill);
}

export function createLayaComponent(element: Element, parent?: LayaObj): LayaObj | null {
  const cu = classUtils();
  if (!cu) { console.warn('[laya-bridge] ClassUtils not ready'); return null; }

  let comp: LayaObj = null;
  const preview = isPreviewMode();

  if (element.layaType) {
    let resolvedType = element.layaType;
    if (!preview) {
      // 编辑模式下若干 sdk_baiya 组件用 Laya 内置类替代，便于占位渲染
      if (resolvedType === 'TextInput') resolvedType = 'Box';
      // DragViewBox 在编辑模式下用 Box 替代，避免真实 runtime 在
      // init 时因找不到 dragbox/dropbox 子节点而崩溃；导出时仍按原 layaType 输出
      else if (resolvedType === 'DragViewBox') resolvedType = 'Box';
      // DropObj 用 Box 替代（需要支持子 Image 叠加：skin + tipSkin 40% 透明）
      else if (resolvedType === 'DropObj') resolvedType = 'Box';
      // MatchingItem 编辑模式下用 Box 替代（支持 _itemImage 子 Image 显示；导出时仍按原 layaType 输出）
      else if (resolvedType === 'MatchingItem') resolvedType = 'Box';
      // MatchingGame 编辑模式下用 Box 替代，避免真实 runtime 的 init() 在 rightItemNames 未配置时崩溃
      // 导出时仍按原 layaType 输出
      else if (resolvedType === 'MatchingGame') resolvedType = 'Box';
      // TextArea 编辑模式下用 Label 显示文字（live 渲染，配合双击 HTML 浮层做行内编辑）
      else if (resolvedType === 'TextArea') resolvedType = 'Label';
      // SoundButton 编辑模式下用 Image 替代（类似图片组件，避免实例化真 SoundButton）
      else if (resolvedType === 'SoundButton') resolvedType = 'Image';
      // Spine 动画：编辑模式下用原生 laya.ani.bone.Skeleton，绕过 KlSkeleton1 的自动重播逻辑
      // sdk_baiya 通过 View.regComponent("Skeleton", KlSkeleton1) 覆盖了 ClassUtils，
      // 但 Laya.Skeleton / Laya.__classmap['laya.ani.bone.Skeleton'] 仍是原生类
      else if (element.type === 'Spine') {
        const w = window as LayaAny;
        const NativeSkeleton = w.Laya?.Skeleton
          || w.Laya?.__classmap?.['laya.ani.bone.Skeleton']
          || w.laya?.ani?.bone?.Skeleton;
        if (NativeSkeleton) {
          comp = new NativeSkeleton();
        } else {
          console.warn('[laya-bridge] Native Skeleton class not found, falling back to Sprite');
          comp = cu.getInstance('Sprite');
        }
      }
      // 配置了 placeholderImage 的组件 → 编辑模式用 Laya Image 渲染占位图（避免实例化真组件）
      else if (elementMeta[element.type]?.placeholderImage) resolvedType = 'Image';
    }
    if (!comp) comp = cu.getInstance(resolvedType);
  }

  if (!comp) {
    const typeMap: Record<string, string> = {
      text: 'Label', button: 'Button',
      input: preview ? 'TextInput' : 'Sprite',
      image: 'Image', rect: 'Sprite', circle: 'Sprite',
      audio: 'Sprite', video: 'Sprite', code: 'Sprite',
      selectable: 'Button', draggable: 'Sprite', chessboard: 'Sprite',
    };
    comp = cu.getInstance(typeMap[element.type] ?? 'Sprite');
  }

  if (!comp) { console.warn('[laya-bridge] Failed to create:', element.layaType ?? element.type); return null; }

  comp.x = element.x;
  comp.y = element.y;
  comp.width = element.width;
  comp.height = element.height;
  comp.name = element.name;

  if (element.layaType) {
    applyKlProps(comp, element);
  } else {
    applyKlProps(comp, element);
  }

  comp.name = element.name || element.id;
  comp.mouseEnabled = !isEditorCanvasHitThrough(element);
  if (isEditorCanvasHitThrough(element)) comp.mouseThrough = true;

  if (element.layaType && !preview) {
    // 编辑模式：移除 ScaleButton 缩放动画事件（干扰拖拽）
    if (comp.scaleBig) {
      comp.off?.('mousedown', comp, comp.scaleBig);
      comp.off?.('mouseup', comp, comp.scaleSmall);
      comp.off?.('mouseout', comp, comp.scaleSmall);
    }
  }

  // 预览模式：MatchingItem 需要为 _itemImage 创建子 Image 节点（类似导出逻辑）
  if (preview && element.type === 'MatchingItem') {
    const itemImageVal = (element.props as Record<string, unknown>)?._itemImage as string | undefined;
    if (itemImageVal && cu) {
      const itemImg = cu.getInstance('Image');
      if (itemImg) {
        itemImg.name = '_itemImg';
        itemImg.skin = itemImageVal;
        itemImg.width = element.width ?? 80;
        itemImg.height = element.height ?? 80;
        itemImg.x = 0;
        itemImg.y = 0;
        comp.addChild(itemImg);
      }
    }
  }

  (parent ?? canvasRoot()).addChild(comp);
  return comp;
}

export function applyKlProps(comp: LayaObj, element: Element): void {
  // 编辑器可见性：_editorHidden=true 时在画布上隐藏，否则使用 visible 属性（翻页组件切换页）
  if (!isPreviewMode()) {
    const elProps = element.props as Record<string, unknown>;
    if (elProps?._editorHidden === true) {
      comp.visible = false;
    } else if ('visible' in elProps) {
      // 键盘组件在编辑模式下强制显示（运行时默认隐藏，但编辑器需要看到才能编辑）
      if (element.type === 'KlBaseKeyboard') {
        comp.visible = true;
      } else {
        comp.visible = elProps.visible === true;
      }
    } else {
      comp.visible = true;
    }
  }

  if (element.opacity !== undefined) comp.alpha = element.opacity;
  if (element.rotation !== undefined) comp.rotation = element.rotation;

  // 合并 defaultProps 和 element.props（旧数据可能缺少 defaultProps 里的字段）
  const meta = elementMeta[element.type];
  const props: Record<string, unknown> = { ...(meta?.defaultProps ?? {}), ...(element.props ?? {}) };

  // 编辑态合成层直接绘制纯色，避免 1x1 图片异步加载导致遮罩不可见。
  const editorCanvasFillColor = getEditorCanvasFillColor(element);
  if (!isPreviewMode() && editorCanvasFillColor && comp.graphics) {
    comp.graphics.clear();
    comp.graphics.drawRect(0, 0, element.width, element.height, editorCanvasFillColor);
  }

  // ─── Spine 动画：编辑模式下直接用 Skeleton.load() 加载 .sk 并播放 ───
  const urlStr = typeof props.url === 'string' ? props.url : '';
  const isUrlSk = /\.sk(\?|$)/i.test(urlStr);
  if (!isPreviewMode() && element.type === 'Spine') {
    if (isUrlSk && urlStr) {
      const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
      const animName = (props.currAniName as string) ?? '';
      const animList = Array.isArray(props._animationList) ? (props._animationList as string[]) : [];
      if (courseId && comp.load) {
        const forgeLocalUrl = `forge-local://${courseId}/${urlStr}`;
        if (comp._lastSkUrl !== forgeLocalUrl) {
          comp._lastSkUrl = forgeLocalUrl;
          comp._lastAnimName = animName;
          const L = laya();
          const handler = L.Handler.create(null, () => {
            const idx = animList.indexOf(animName);
            try { comp.play(idx >= 0 ? idx : 0, true); } catch { /* ignore */ }
          });
          comp.load(forgeLocalUrl, handler, 0);
        } else if (comp._lastAnimName !== animName && animList.length > 0) {
          comp._lastAnimName = animName;
          const idx = animList.indexOf(animName);
          try {
            comp.play(idx >= 0 ? idx : 0, true);
            if (comp._spinePaused) comp.paused();
          } catch { /* ignore */ }
        }
      }
    }
    // Spine 元素不走通用 props 处理（避免 url/stopAt/isLoop 等属性触发 Skeleton 内部机制）
    comp.mouseEnabled = false;
    return;
  }

  // 编辑模式下，配置了 placeholderImage 的组件用 Laya Image + 占位图渲染（不写回 element.props，避免污染导出）
  // .sk 文件不是图片，无法在编辑器里直接渲染——视同 skin 为空，触发 placeholderImage 分支
  const skinStr = typeof props.skin === 'string' ? props.skin : '';
  const isSkinNonImage = /\.sk(\?|$)/i.test(skinStr);
  if (!isPreviewMode() && meta?.placeholderImage && (!props.skin || isSkinNonImage)) {
    // 前景图覆盖占位图（SpeechSelectableObj 等组件：设了 _foregroundSkin 就用它做 skin）
    if (props._foregroundSkin) {
      props.skin = props._foregroundSkin;
    } else if (element.type === 'Video') {
      const videoUrl = (props.videoUrl as string) ?? '';
      if (videoUrl) {
        const cached = getCachedVideoThumbnail(videoUrl);
        if (cached) {
          props.skin = cached;
        } else {
          props.skin = meta.placeholderImage;
        }
      } else {
        props.skin = meta.placeholderImage;
      }
    } else {
      // 键盘组件：根据 _keyboardPreset.id 动态选择预设缩略图
      const presetId = (props._keyboardPreset as { id?: string } | undefined)?.id;
      if (presetId) {
        const preset = getKeyboardPreset(presetId);
        props.skin = preset?.thumbnail ?? meta.placeholderImage;
      } else {
        props.skin = meta.placeholderImage;
      }
    }
  }

  // 自定义皮肤：上传的 PNG 优先于 _bgColor 生成
  const isCustomUpload = props.skin && typeof props.skin === 'string'
    && !props.skin.startsWith('share/comp/') && !props.skin.startsWith('data:image');
  const hasSkinEdit = !isCustomUpload && (props._bgColor || props._borderColor);
  let generatedSkin: string | null = null;
  if (hasSkinEdit) {
    const layaType = element.layaType;
    if (layaType === 'ScaleButton') {
      generatedSkin = generateButtonSkin({
        width: element.width,
        height: Math.round(element.height / (Number(props.stateNum) || 3)),
        upColor: (props._bgColor as string) ?? '#4A90D9',
        overColor: (props._hoverColor as string) ?? '#5BA0E9',
        downColor: (props._pressColor as string) ?? '#3A7BC8',
        borderColor: (props._borderColor as string) ?? undefined,
        borderWidth: (props._borderWidth as number) ?? 0,
        radius: (props._borderRadius as number) ?? 8,
      });
    } else if (layaType === 'TextInput') {
      generatedSkin = generateInputSkin({
        width: element.width,
        height: element.height,
        bgColor: (props._bgColor as string) ?? '#ffffff',
        borderColor: (props._borderColor as string) ?? '#d9d9d9',
        radius: (props._borderRadius as number) ?? 4,
      });
    } else if (layaType === 'CheckBox') {
      generatedSkin = generateCheckboxSkin({
        color: (props._bgColor as string) ?? '#4A90D9',
        borderColor: (props._borderColor as string) ?? '#999999',
      });
    } else if (layaType === 'Radio') {
      generatedSkin = generateRadioSkin({
        color: (props._bgColor as string) ?? '#4A90D9',
        borderColor: (props._borderColor as string) ?? '#999999',
      });
    }
  } else if (props.skin && typeof props.skin === 'string' && props.skin.startsWith('share/comp/')) {
    // 没有自定义字段，用默认生成的皮肤
    const skins = getDefaultSkins();
    const skinMap: Record<string, string> = {
      'share/comp/button.png': skins.button,
      'share/comp/checkbox.png': skins.checkbox,
      'share/comp/radio.png': skins.radio,
      'share/comp/radiogroup.png': skins.radiogroup,
      'share/comp/textinput.png': skins.textinput,
      'share/comp/progress.png': skins.progress,
      'share/comp/tab.png': skins.tab,
      'share/comp/vslider.png': skins.vslider,
    };
    if (skinMap[props.skin]) props.skin = skinMap[props.skin];
  } else if (!isPreviewMode() && typeof props.skin === 'string') {
    // 内置资源：编辑模式下按 export path 反查 src，重写为 /builtin/<src> 让 dev server 可加载
    const builtin = lookupBuiltinByExportPath(props.skin);
    if (builtin) props.skin = `/builtin/${builtin.src}`;
  }
  const skinToApply = generatedSkin ?? props.skin;
  if (props) {
    // stateNum 和 sizeGrid 必须在 skin 之前设置，因为 skin 赋值会触发 changeClips 渲染
    if (props.stateNum !== undefined) { try { comp.stateNum = props.stateNum; } catch { /* ignore */ } }
    if (props.sizeGrid !== undefined) { try { comp.sizeGrid = props.sizeGrid; } catch { /* ignore */ } }
    if (skinToApply !== undefined) {
      try {
        // images/ 路径：Electron IPC 转 base64 data URL 后再加载（异步，不阻塞其他属性）
        if (typeof skinToApply === 'string' && skinToApply.startsWith('images/')) {
          const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
          if (courseId) {
            readFileAsDataUrl(courseId, skinToApply).then(dataUrl => {
              if (dataUrl) {
                const L = laya();
                if (L?.loader) {
                  L.loader.load([{ url: dataUrl, type: 'image' }], L.Handler.create(null, () => {
                    try { comp.skin = dataUrl; } catch { /* ignore */ }
                  }));
                } else {
                  comp.skin = dataUrl;
                }
              }
            });
          }
        } else {
          // data:image / /builtin/ / /uploads/ 这类编辑器实际 URL，ScaleButton 等组件 changeClips 时
          // 会同步查 Laya 缓存，没预加载就 "lose skin"。统一先 loader.load 再赋值。
          const needsPreload = typeof skinToApply === 'string' && (
            skinToApply.startsWith('data:image') ||
            skinToApply.startsWith('/builtin/') ||
            skinToApply.startsWith('/uploads/')
          );
          if (needsPreload) {
            const L = laya();
            if (L?.loader) {
              L.loader.load([{ url: skinToApply, type: 'image' }], L.Handler.create(null, () => {
                try { comp.skin = skinToApply; } catch { /* ignore */ }
              }));
            } else {
              comp.skin = skinToApply;
            }
          } else {
            comp.skin = skinToApply;
          }
        }
      } catch { /* ignore */ }
    }
    for (const [key, value] of Object.entries(props)) {
      if (key === 'skin' || key === 'tipSkin' || key === 'stateNum' || key === 'sizeGrid' || key.startsWith('_') || (key === 'visible' && !isPreviewMode()) || key === 'isHide') continue;
      if (value === undefined || value === null) continue;
      try { comp[key] = value; } catch { /* ignore */ }
    }
  }

  // NewTextArea 编辑模式下被替换成 Label,需要把字体 face 写到 comp.font。
  if (!isPreviewMode() && element.type === 'NewTextArea') {
    try { comp.font = 'FZLanTingHei'; } catch { /* ignore */ }
    const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
    if (courseId) {
      const fontLocalPath = (props.fontLocalPath as string | undefined) ?? '';
      const fontLibraryId = (props.fontLibraryId as string | undefined) ?? '';
      resolveElementFont(courseId, fontLocalPath, fontLibraryId)
        .then((name) => { try { comp.font = name; } catch { /* ignore */ } })
        .catch(() => {});
    }
  }

  // DropObj 编辑模式：用 Box 渲染，手动管理 skin + tipSkin 两个子 Image
  if (!isPreviewMode() && element.type === 'DropObj') {
    const cu = classUtils();
    const L = laya();
    if (cu) {
      const skinVal = props?.skin as string | undefined;
      const tipSkinVal = props?.tipSkin as string | undefined;
      const placeholderUrl = meta?.placeholderImage ?? '';

      const applySkinToImg = (img: LayaAny, src: string, alpha: number) => {
        img.alpha = alpha;
        if (typeof src === 'string' && src.startsWith('images/')) {
          const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
          if (courseId) {
            readFileAsDataUrl(courseId, src).then(dataUrl => {
              if (dataUrl && L?.loader) {
                L.loader.load([{ url: dataUrl, type: 'image' }], L.Handler.create(null, () => {
                  try {
                    img.skin = dataUrl;
                    const tex = img.source || img._bitmap;
                    const iw = tex?.sourceWidth || tex?.width || img.width || 0;
                    const ih = tex?.sourceHeight || tex?.height || img.height || 0;
                    if (iw > 0 && ih > 0) { img.x = Math.round((element.width - iw) / 2); img.y = Math.round((element.height - ih) / 2); }
                  } catch { /* ignore */ }
                }));
              } else if (dataUrl) {
                img.skin = dataUrl;
              }
            });
          }
        } else {
          const needsPreload = src.startsWith('data:image') || src.startsWith('/builtin/') || src.startsWith('/uploads/');
          if (needsPreload && L?.loader) {
            L.loader.load([{ url: src, type: 'image' }], L.Handler.create(null, () => {
              try {
                img.skin = src;
                const tex = img.source || img._bitmap;
                const iw = tex?.sourceWidth || tex?.width || img.width || 0;
                const ih = tex?.sourceHeight || tex?.height || img.height || 0;
                if (iw > 0 && ih > 0) { img.x = Math.round((element.width - iw) / 2); img.y = Math.round((element.height - ih) / 2); }
              } catch { /* ignore */ }
            }));
          } else {
            img.skin = src;
          }
        }
      };

      // skin 子 Image（放置区皮肤）— 保持图片原始尺寸，居中对齐
      let skinImg = (comp._childs ?? comp._children)?.find((c: LayaAny) => c.name === '_skinImg');
      const skinSrc = skinVal || placeholderUrl;
      if (skinSrc) {
        if (!skinImg) {
          skinImg = cu.getInstance('Image');
          if (skinImg) { skinImg.name = '_skinImg'; comp.addChild(skinImg); }
        }
        if (skinImg) {
          applySkinToImg(skinImg, skinSrc, 1);
        }
      } else if (skinImg) {
        comp.removeChild(skinImg);
      }

      // tipSkin 子 Image（放置区提示图，40% 透明）— 保持图片原始尺寸，居中对齐
      let tipImg = (comp._childs ?? comp._children)?.find((c: LayaAny) => c.name === '_tipOverlay');
      if (tipSkinVal) {
        if (!tipImg) {
          tipImg = cu.getInstance('Image');
          if (tipImg) { tipImg.name = '_tipOverlay'; comp.addChild(tipImg); }
        }
        if (tipImg) {
          applySkinToImg(tipImg, tipSkinVal, 0.4);
        }
      } else if (tipImg) {
        comp.removeChild(tipImg);
      }

      // _placedPreview 子 Image（放置后预览图，仅编辑器可见，不导出）— 保持图片原始尺寸，居中对齐
      const placedPreviewVal = props?._placedPreview as string | undefined;
      let placedImg = (comp._childs ?? comp._children)?.find((c: LayaAny) => c.name === '_placedPreviewImg');
      if (placedPreviewVal) {
        if (!placedImg) {
          placedImg = cu.getInstance('Image');
          if (placedImg) { placedImg.name = '_placedPreviewImg'; comp.addChild(placedImg); }
        }
        if (placedImg) {
          applySkinToImg(placedImg, placedPreviewVal, 1);
        }
      } else if (placedImg) {
        comp.removeChild(placedImg);
      }
    }
  }

  // MatchingItem 编辑模式：用 Box 渲染，_itemImage 作为子 Image 显示
  if (!isPreviewMode() && element.type === 'MatchingItem') {
    const cu = classUtils();
    const L = laya();
    if (cu) {
      const itemImageVal = props?._itemImage as string | undefined;
      let itemImg = (comp._childs ?? comp._children)?.find((c: LayaAny) => c.name === '_itemImg');

      if (itemImageVal) {
        if (!itemImg) {
          itemImg = cu.getInstance('Image');
          if (itemImg) { itemImg.name = '_itemImg'; comp.addChild(itemImg); }
        }
        if (itemImg) {
          const applyItemImage = (src: string) => {
            const needsPreload = src.startsWith('data:image') || src.startsWith('/builtin/') || src.startsWith('/uploads/');
            if (needsPreload && L?.loader) {
              L.loader.load([{ url: src, type: 'image' }], L.Handler.create(null, () => {
                try {
                  itemImg.skin = src;
                  // 同步图片尺寸为 MatchingItem 的宽高
                  itemImg.width = element.width ?? 80;
                  itemImg.height = element.height ?? 80;
                } catch { /* ignore */ }
              }));
            } else {
              try {
                itemImg.skin = src;
                // 同步图片尺寸为 MatchingItem 的宽高
                itemImg.width = element.width ?? 80;
                itemImg.height = element.height ?? 80;
              } catch { /* ignore */ }
            }
          };
          // images/ 路径：Electron IPC 转 data URL
          if (itemImageVal.startsWith('images/')) {
            const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
            if (courseId) {
              readFileAsDataUrl(courseId, itemImageVal).then(dataUrl => {
                if (dataUrl) applyItemImage(dataUrl);
              });
            }
          } else {
            applyItemImage(itemImageVal);
          }
          // 清除占位图（graphics）：有图片后不再需要占位
          if (comp.graphics) comp.graphics.clear();
        }
      } else if (itemImg) {
        comp.removeChild(itemImg);
      }
    }
  }

  // 没有 skin 且没有子节点的容器类组件，用 graphics 占位
  const hasSkin = props?.skin;
  const hasChildren = (comp._childs ?? comp._children) && (comp._childs ?? comp._children).length > 0;
  // MatchingItem：有 _itemImage 时不画占位（子 Image 节点可能正在异步加载）
  const hasItemImage = element.type === 'MatchingItem' && props?._itemImage;
  // TextArea 编辑态被替换成 Label，靠自身渲染文字，不要叠灰底占位
  const isTextAreaEdit = !isPreviewMode() && element.layaType === 'TextArea';
  // DragViewBox / DragDropBox / DragDragBox 全屏透明容器，不画占位背景
  const isDragViewBox = element.layaType === 'DragViewBox' || element.type === 'DragDropBox' || element.type === 'DragDragBox';
  // MatchBox（连线题中间层 Box）也是全屏透明容器，不画占位背景
  const isMatchBox = element.type === 'Box' && element.name === '_matchBox';
  // NewBrushSprite 画笔容器：编辑器里不画占位背景和"画笔区域"文字
  const isNewBrushSprite = element.type === 'NewBrushSprite';
  if (!hasSkin && !editorCanvasFillColor && !hasChildren && !hasItemImage && !isTextAreaEdit && !isDragViewBox && !isMatchBox && !isNewBrushSprite) {
    drawPlaceholder(comp, element);
  }
}

export function applyEditorLayerVisibility(comp: LayaObj, element: Element, elements: Element[]): void {
  if (isPreviewMode()) return;
  const elementMap = new Map(elements.map((item) => [item.id, item]));
  if (isElementHidden(element, elementMap)) {
    comp.visible = false;
    return;
  }
  const props = element.props as Record<string, unknown>;
  if (element.type === 'KlBaseKeyboard') {
    comp.visible = true;
  } else if ('visible' in props) {
    comp.visible = props.visible === true;
  } else {
    comp.visible = true;
  }
}

export function drawPlaceholder(comp: LayaObj, element: Element): void {
  const g = comp.graphics;
  if (!g) return;
  g.clear();
  const w = element.width, h = element.height;
  const layaType = element.layaType ?? '';

  const placeholders: Record<string, { bg: string | null; border: string; text: string }> = {
    'DragObj':      { bg: '#fff3e0', border: '#ff9800', text: '拖拽对象' },
    'DropObj':      { bg: '#e8f5e9', border: '#4caf50', text: '放置区域' },
    'Box':          { bg: '#f5f5f5', border: '#bdbdbd', text: '容器' },
    'HBox':         { bg: '#e3f2fd', border: '#64b5f6', text: '水平布局' },
    'VBox':         { bg: '#e8f5e9', border: '#66bb6a', text: '垂直布局' },
    'Panel':        { bg: '#fff3e0', border: '#ffb74d', text: '面板' },
    'List':         { bg: '#fce4ec', border: '#ef5350', text: '列表' },
    'ViewStack':    { bg: '#f3e5f5', border: '#ab47bc', text: '视图堆栈' },
    'ChoiceBox':    { bg: '#e8eaf6', border: '#5c6bc0', text: '选择容器' },
    'KlInputImage': { bg: '#fff8e1', border: '#ffa000', text: '输入框' },
    'DragView':     { bg: '#fff3e0', border: '#ff9800', text: '拖拽容器' },
    'DragViewBox':  { bg: null, border: '#ff9800', text: '拖拽容器' },
    'MatchingGame': { bg: null, border: '#00acc1', text: '' },
    'MatchingItem': { bg: '#e0f7fa', border: '#00acc1', text: '连线项' },
    'OneStrokeGame':{ bg: '#e0f2f1', border: '#26a69a', text: '一笔画' },
    'OneStrokeItem':{ bg: '#e0f2f1', border: '#26a69a', text: '一笔画项' },
    'MazeView':     { bg: '#efebe9', border: '#8d6e63', text: '迷宫' },
    'MazeMoveObj':  { bg: '#ffccbc', border: '#ff5722', text: '迷宫对象' },
    'MazeGoalObj':  { bg: '#c8e6c9', border: '#43a047', text: '迷宫目标' },
    'BrushSprite':    { bg: '#fafafa', border: '#616161', text: '画板' },
    'NewBrushSprite': { bg: '#e3f2fd', border: '#1976d2', text: '画笔区域' },
    'BrushDrawBtn':   { bg: '#fff3e0', border: '#fb8c00', text: '画笔开关' },
    'BrushClearBtn':  { bg: '#fce4ec', border: '#d81b60', text: '画笔清空' },
    'TwinkleBox':     { bg: '#fffde7', border: '#fdd835', text: '闪烁' },
    'CountDown':    { bg: '#ffebee', border: '#e53935', text: '倒计时' },
    'PriviewGuideFinger': { bg: '#e1f5fe', border: '#03a9f4', text: '引导' },
    'ImageScaleTime':     { bg: '#f1f8e9', border: '#7cb342', text: '图片缩放' },
    'KlChangeColorBox':   { bg: '#fce4ec', border: '#e91e63', text: '颜色滤镜' },
    'KlBaseKeyboard':     { bg: '#eceff1', border: '#546e7a', text: '键盘' },
    'KlKey':        { bg: '#eceff1', border: '#546e7a', text: '按键' },
    'Image':        { bg: '#f1f5f9', border: '#cbd5e1', text: '图片' },
  };
  const p = placeholders[layaType] ?? placeholders[element.type];
  if (!p) return;
  dr(g, 0, 0, w, h, p.bg, p.border, 1);
  if (g.fillText) g.fillText(p.text, w / 2, h / 2 - 8, '13px Arial', p.border, 'center');
}


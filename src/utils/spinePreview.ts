export interface SpinePreviewObject {
  play: (animation: number, loop: boolean, force?: boolean) => void;
  paused: () => void;
  once?: (event: string, caller: unknown, listener: () => void) => void;
  _forgePreviewToken?: number;
  _spinePaused?: boolean;
}

export function resolveSpineAnimationIndex(
  props: Record<string, unknown>,
  animationName: string,
): number {
  const url = typeof props.url === 'string' ? props.url : '';
  const skFiles = Array.isArray(props._skFiles)
    ? props._skFiles as Array<{ url?: unknown; animations?: unknown }>
    : [];
  const source = skFiles.find((file) => file.url === url);
  const sourceAnimations = Array.isArray(source?.animations)
    ? source.animations.filter((name): name is string => typeof name === 'string')
    : [];
  const sourceIndex = sourceAnimations.indexOf(animationName);
  if (sourceIndex >= 0) return sourceIndex;

  const visibleAnimations = Array.isArray(props._animationList)
    ? props._animationList.filter((name): name is string => typeof name === 'string')
    : [];
  const visibleIndex = visibleAnimations.indexOf(animationName);
  return visibleIndex >= 0 ? visibleIndex : 0;
}

export function pauseSpineAtFirstFrame(obj: SpinePreviewObject, animationIndex: number): void {
  obj.play(animationIndex, true, true);
  obj.paused();
  obj._spinePaused = true;
}

export function playSpineOnce(obj: SpinePreviewObject, animationIndex: number): void {
  const token = (obj._forgePreviewToken ?? 0) + 1;
  obj._forgePreviewToken = token;
  obj._spinePaused = false;

  obj.once?.('stopped', obj, () => {
    if (obj._forgePreviewToken !== token) return;
    pauseSpineAtFirstFrame(obj, animationIndex);
  });
  obj.play(animationIndex, false, true);
}

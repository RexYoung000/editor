export type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'info') {
  window.dispatchEvent(new CustomEvent('forge:toast', { detail: { message, type } }));
}

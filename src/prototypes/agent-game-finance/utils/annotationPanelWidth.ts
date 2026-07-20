import { useEffect } from 'react';

const ANNOTATION_HOST_ID = '__axhub_annotation_host__';
const STYLE_ID = 'agf-annotation-panel-width';
const PANEL_SELECTOR = '[data-axhub-annotation-panel-target="true"]';

export const ANNOTATION_PANEL_WIDTH = 560;

function patchPanelElements(root: ParentNode, width: number): void {
  root.querySelectorAll(PANEL_SELECTOR).forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.setProperty('width', `${width}px`, 'important');
    }
  });
}

function injectAnnotationPanelWidth(width: number): ShadowRoot | null {
  const host = document.getElementById(ANNOTATION_HOST_ID);
  const shadow = host?.shadowRoot;
  if (!shadow) return null;

  let style = shadow.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    shadow.append(style);
  }

  style.textContent = `${PANEL_SELECTOR} { width: ${width}px !important; }`;
  patchPanelElements(shadow, width);
  return shadow;
}

/** @axhub/annotation 批注气泡在 Shadow DOM 内，需注入样式才能覆盖默认 380px 宽 */
export function useAnnotationPanelWidth(enabled: boolean, width = ANNOTATION_PANEL_WIDTH): void {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let shadowObserver: MutationObserver | null = null;

    const bindShadow = (shadow: ShadowRoot) => {
      shadowObserver?.disconnect();
      patchPanelElements(shadow, width);
      shadowObserver = new MutationObserver(() => patchPanelElements(shadow, width));
      shadowObserver.observe(shadow, { childList: true, subtree: true });
    };

    const apply = () => {
      const shadow = injectAnnotationPanelWidth(width);
      if (shadow) bindShadow(shadow);
    };

    apply();
    const docObserver = new MutationObserver(apply);
    docObserver.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      docObserver.disconnect();
      shadowObserver?.disconnect();
    };
  }, [enabled, width]);
}

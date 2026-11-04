import type { ElementLocator } from '@axhub/annotation';
import type { RefObject } from 'react';

const FOREGROUND_LAYER_SELECTOR = '.agf-drawer, .agf-modal';

function queryLocator(locator: ElementLocator): Element | null {
  const selectors = Array.isArray(locator.selectors)
    ? locator.selectors.map((selector) => String(selector || '').trim()).filter(Boolean)
    : [];
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element instanceof Element) return element;
    } catch {
      // ignore invalid selector
    }
  }
  return null;
}

export function createAnnotationElementResolver(overlayOpenRef: RefObject<boolean>) {
  return (locator: ElementLocator): Element | null => {
    const element = queryLocator(locator);
    if (!element) return null;
    if (overlayOpenRef.current && !element.closest(FOREGROUND_LAYER_SELECTOR)) {
      return null;
    }
    return element;
  };
}

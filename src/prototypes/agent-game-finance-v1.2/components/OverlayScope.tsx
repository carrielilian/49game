import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

interface OverlayScopeValue {
  overlayOpenRef: React.RefObject<boolean>;
  registerOverlay: () => () => void;
}

const OverlayScopeContext = createContext<OverlayScopeValue | null>(null);

function refreshAnnotationMarkers() {
  window.__AXHUB_ANNOTATION_RUNTIME__?.refresh();
}

/** 立即刷新 + 下一帧再刷新，避免抽屉开关与 DOM 不同步导致批注丢失 */
function scheduleAnnotationRefresh() {
  refreshAnnotationMarkers();
  requestAnimationFrame(() => {
    refreshAnnotationMarkers();
  });
}

function syncOverlayOpenRef(overlayCountRef: React.RefObject<number>, overlayOpenRef: React.RefObject<boolean>) {
  overlayOpenRef.current = overlayCountRef.current > 0;
}

export function OverlayScopeProvider({ children }: { children: React.ReactNode }) {
  const overlayCountRef = useRef(0);
  const overlayOpenRef = useRef(false);

  const registerOverlay = useCallback(() => {
    overlayCountRef.current += 1;
    syncOverlayOpenRef(overlayCountRef, overlayOpenRef);
    scheduleAnnotationRefresh();
    return () => {
      overlayCountRef.current = Math.max(0, overlayCountRef.current - 1);
      syncOverlayOpenRef(overlayCountRef, overlayOpenRef);
      scheduleAnnotationRefresh();
    };
  }, []);

  const value = useMemo(
    () => ({ overlayOpenRef, registerOverlay }),
    [registerOverlay],
  );

  return (
    <OverlayScopeContext.Provider value={value}>
      {children}
    </OverlayScopeContext.Provider>
  );
}

export function useOverlayScope() {
  const context = useContext(OverlayScopeContext);
  if (!context) {
    throw new Error('useOverlayScope must be used within OverlayScopeProvider');
  }
  return context;
}

export function useRegisterOverlay(open: boolean) {
  const { registerOverlay } = useOverlayScope();
  useLayoutEffect(() => {
    if (!open) return undefined;
    return registerOverlay();
  }, [open, registerOverlay]);
}

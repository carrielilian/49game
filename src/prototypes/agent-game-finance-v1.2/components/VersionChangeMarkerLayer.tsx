import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VersionChange } from '../content/versionChanges';
import { getVisiblePageChanges } from '../content/versionChanges';
import { VersionChangeTypeBadge } from './VersionChangeCenter';

interface MarkerPosition {
  change: VersionChange;
  top: number;
  left: number;
}

interface VersionChangeMarkerLayerProps {
  changes: VersionChange[];
  pageId: string;
  visible: boolean;
  onOpenChange: (change: VersionChange) => void;
}

export function VersionChangeMarkerLayer({
  changes,
  pageId,
  visible,
  onOpenChange,
}: VersionChangeMarkerLayerProps) {
  const [markers, setMarkers] = useState<MarkerPosition[]>([]);

  useEffect(() => {
    if (!visible) {
      setMarkers([]);
      return undefined;
    }
    const update = () => {
      const next = getVisiblePageChanges(changes, pageId).flatMap((change) => {
        if (!change.targetAnnotationId) return [];
        const target = document.querySelector<HTMLElement>(
          `[data-annotation-id="${change.targetAnnotationId}"]`,
        );
        if (!target) return [];
        const rect = target.getBoundingClientRect();
        return [{ change, top: Math.max(8, rect.top - 10), left: Math.min(window.innerWidth - 92, rect.right + 6) }];
      });
      setMarkers((current) => {
        const unchanged = current.length === next.length && current.every((item, index) => (
          item.change.id === next[index]?.change.id
          && item.top === next[index]?.top
          && item.left === next[index]?.left
        ));
        return unchanged ? current : next;
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [changes, pageId, visible]);

  if (!visible || markers.length === 0) return null;
  return createPortal(
    <>
      {markers.map(({ change, top, left }) => (
        <button
          key={change.id}
          type="button"
          className="agf-change-marker"
          style={{ top, left }}
          title={`${change.requirementId}：${change.title}`}
          onClick={() => onOpenChange(change)}
        >
          <VersionChangeTypeBadge type={change.type} />
        </button>
      ))}
    </>,
    document.body,
  );
}

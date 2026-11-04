import React from 'react';

interface AnnotationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AnnotationToggle({ checked, onChange }: AnnotationToggleProps) {
  return (
    <label className="agf-annotation-toggle">
      <span className="agf-annotation-toggle__label">批注</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="显示或隐藏需求说明批注"
        className={`agf-annotation-toggle__switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}

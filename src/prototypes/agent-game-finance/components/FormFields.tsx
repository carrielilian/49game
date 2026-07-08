import React from 'react';

export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="agf-form-item">
      <label className="agf-form-label">{label}</label>
      <input className="agf-form-input" readOnly value={value} />
    </div>
  );
}

export function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="agf-form-section-title">{children}</h4>;
}

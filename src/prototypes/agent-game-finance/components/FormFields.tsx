import React from 'react';

export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="agf-form-item agf-form-item--readonly">
      <label className="agf-form-label agf-form-label--readonly">{label}</label>
      <div className="agf-form-readonly-value">{value}</div>
    </div>
  );
}

export function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="agf-form-section-title">{children}</h4>;
}

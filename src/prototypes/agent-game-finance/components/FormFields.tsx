import React from 'react';

export function ReadonlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`agf-form-item agf-form-item--readonly${multiline ? ' agf-form-item--readonly-multi' : ''}`}>
      <label className="agf-form-label">{label}</label>
      <div className={`agf-form-readonly-value${multiline ? ' agf-form-readonly-value--multi' : ''}`}>{value}</div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="agf-form-error">{message}</div>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="agf-form-hint">{children}</p>;
}

export function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="agf-form-section-title">{children}</h4>;
}

/** value 为小数（0.3 = 30%）；界面输入 0–100 整数 */
export function PercentInput({
  label,
  required,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  value: number;
  onChange: (decimal: number) => void;
  error?: string;
}) {
  const display = Number.isFinite(value) ? String(Math.round(value * 100)) : '';
  return (
    <div className="agf-form-item">
      <label className={`agf-form-label${required ? ' agf-form-label--required' : ''}`}>{label}</label>
      <div className="agf-form-field">
        <div className="agf-input-affix">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="agf-form-input"
            value={display}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange(NaN);
                return;
              }
              const n = Math.min(100, Math.max(0, Math.round(Number(raw))));
              onChange(n / 100);
            }}
          />
          <span className="agf-input-affix__suffix">%</span>
        </div>
        <FieldError message={error} />
        <p className="agf-form-hint">请输入0-100的整数</p>
      </div>
    </div>
  );
}

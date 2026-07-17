import React from 'react';
import type { ContractCurrency } from '../data/types';
import { currencySymbol, formatMoney } from '../utils/settlement';

export { currencySymbol };

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

/** 只读金额：左侧币种符号 + 右侧数值（与 CurrencyInput 前缀样式一致） */
export function ReadonlyCurrencyField({
  label,
  amount,
  currency,
  unset,
}: {
  label: string;
  amount: number;
  currency: ContractCurrency;
  /** 未填预付等场景显示 `-`，不带币种前缀 */
  unset?: boolean;
}) {
  return (
    <div className="agf-form-item agf-form-item--readonly">
      <label className="agf-form-label">{label}</label>
      <div className="agf-form-field">
        {unset ? (
          <div className="agf-form-readonly-value">-</div>
        ) : (
          <div className="agf-input-affix agf-input-affix--prefix">
            <span className="agf-input-affix__prefix">{currencySymbol(currency)}</span>
            <input className="agf-form-input" readOnly value={formatMoney(amount)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** 复合型金额输入：左侧币种符号 + 右侧数字输入 */
export function CurrencyInput({
  currency,
  value,
  onChange,
  onBlur,
  placeholder = '请输入',
}: {
  currency: ContractCurrency;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="agf-input-affix agf-input-affix--prefix">
      <span className="agf-input-affix__prefix">{currencySymbol(currency)}</span>
      <input
        className="agf-form-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) onChange(v);
        }}
        onBlur={onBlur}
      />
    </div>
  );
}

/** 复合型百分数输入框：右侧 % 后缀 */
export function PercentAffixInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="agf-input-affix">
      <input
        className="agf-form-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="agf-input-affix__suffix">%</span>
    </div>
  );
}

function decimalToPercentDisplay(rate: number): string {
  if (!Number.isFinite(rate)) return '';
  const p = rate * 100;
  if (Number.isInteger(p) || Math.abs(p - Math.round(p)) < 1e-9) return String(Math.round(p));
  return String(parseFloat(p.toFixed(2)));
}

/** 扣税点手输：value 为小数（0.06 = 6%）；界面输入百分数，最多两位小数 */
export function DecimalPercentInput({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (decimal: number) => void;
  error?: string;
}) {
  return (
    <>
      <PercentAffixInput
        value={decimalToPercentDisplay(value)}
        onChange={(raw) => {
          if (raw === '') {
            onChange(NaN);
            return;
          }
          if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
          const n = parseFloat(raw);
          if (Number.isNaN(n) || n < 0 || n > 100) return;
          onChange(n / 100);
        }}
      />
      <FieldError message={error} />
    </>
  );
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
        <PercentAffixInput
          value={display}
          onChange={(raw) => {
            if (raw === '') {
              onChange(NaN);
              return;
            }
            if (!/^\d+$/.test(raw)) return;
            const n = Math.min(100, Math.max(0, parseInt(raw, 10)));
            onChange(n / 100);
          }}
        />
        <FieldHint>请输入0-100的整数</FieldHint>
        <FieldError message={error} />
      </div>
    </div>
  );
}

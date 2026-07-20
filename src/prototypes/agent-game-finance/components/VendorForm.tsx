import React from 'react';
import type { Vendor } from '../data/types';

type VendorFormData = Omit<Vendor, 'id'>;

export type VendorFieldErrors = Partial<Record<keyof VendorFormData, string>>;

interface VendorFormProps {
  form: VendorFormData;
  setForm: React.Dispatch<React.SetStateAction<VendorFormData>>;
  vendorId?: string;
  errors?: VendorFieldErrors;
  clearError?: (key: keyof VendorFormData) => void;
}

const BANK_OPTIONS = ['中国工商银行', '招商银行', '建设银行', '农业银行', '中国银行', '交通银行', '浦发银行', '民生银行'];
const LOCATION_OPTIONS = ['北京市', '上海市', '广东省', '浙江省', '四川省', '湖北省', '江苏省'];
const INVOICE_OPTIONS = ['增值税专用发票（6%）', '增值税专用发票（3%）', '增值税专用发票（1%）', '普通发票', '其他'];

export const VENDOR_REQUIRED: { key: keyof VendorFormData; label: string }[] = [
  { key: 'name', label: '厂商名称' },
  { key: 'invoiceInfo', label: '发票信息' },
  { key: 'accountName', label: '开户名称' },
  { key: 'bank', label: '开户银行' },
  { key: 'bankLocation', label: '开户银行所在地' },
  { key: 'branch', label: '支行名称' },
  { key: 'cardNumber', label: '银行卡号' },
];

export function validateVendorForm(form: VendorFormData): VendorFieldErrors {
  const errors: VendorFieldErrors = {};
  for (const { key, label } of VENDOR_REQUIRED) {
    if (!String(form[key] ?? '').trim()) errors[key] = `${label}不能为空`;
  }
  return errors;
}

function GridLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className={required ? 'agf-form-grid__label agf-form-grid__label--required' : 'agf-form-grid__label'}>
      {children}
    </span>
  );
}

function GridInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <input
        className="agf-form-grid__input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <div className="agf-form-grid__error">{error}</div>}
    </div>
  );
}

function GridSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <select className="agf-form-grid__input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <div className="agf-form-grid__error">{error}</div>}
    </div>
  );
}

export function VendorForm({ form, setForm, vendorId, errors = {}, clearError }: VendorFormProps) {
  const set = (key: keyof VendorFormData) => (value: string) => {
    clearError?.(key);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <section className="agf-form-grid-section">
        <h4 className="agf-form-grid-section__title">厂商信息</h4>
        <table className="agf-form-grid">
          <thead>
            <tr>
              <th><GridLabel>厂商ID</GridLabel></th>
              <th><GridLabel required>厂商名称</GridLabel></th>
              <th><GridLabel>联系人</GridLabel></th>
              <th><GridLabel>手机</GridLabel></th>
              <th><GridLabel>邮箱</GridLabel></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><div className="agf-form-grid__readonly">{vendorId ?? '-'}</div></td>
              <td><GridInput value={form.name} onChange={set('name')} error={errors.name} /></td>
              <td><GridInput value={form.contact} onChange={set('contact')} error={errors.contact} /></td>
              <td><GridInput value={form.phone} onChange={set('phone')} error={errors.phone} /></td>
              <td><GridInput value={form.email} onChange={set('email')} error={errors.email} /></td>
            </tr>
            <tr>
              <th colSpan={3}><GridLabel>单位地址</GridLabel></th>
              <th colSpan={2}><GridLabel required>发票信息</GridLabel></th>
            </tr>
            <tr>
              <td colSpan={3}><GridInput value={form.address} onChange={set('address')} error={errors.address} /></td>
              <td colSpan={2}><GridSelect value={form.invoiceInfo} onChange={set('invoiceInfo')} options={INVOICE_OPTIONS} error={errors.invoiceInfo} /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="agf-form-grid-section">
        <h4 className="agf-form-grid-section__title">银行信息</h4>
        <table className="agf-form-grid">
          <thead>
            <tr>
              <th><GridLabel required>开户名称</GridLabel></th>
              <th><GridLabel required>开户银行</GridLabel></th>
              <th><GridLabel required>开户银行所在地</GridLabel></th>
              <th><GridLabel required>支行名称</GridLabel></th>
              <th><GridLabel required>银行卡号</GridLabel></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><GridInput value={form.accountName} onChange={set('accountName')} error={errors.accountName} /></td>
              <td><GridSelect value={form.bank} onChange={set('bank')} options={BANK_OPTIONS} error={errors.bank} /></td>
              <td><GridSelect value={form.bankLocation} onChange={set('bankLocation')} options={LOCATION_OPTIONS} error={errors.bankLocation} /></td>
              <td><GridInput value={form.branch} onChange={set('branch')} error={errors.branch} /></td>
              <td><GridInput value={form.cardNumber} onChange={set('cardNumber')} error={errors.cardNumber} /></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export const EMPTY_VENDOR_FORM: VendorFormData = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  invoiceInfo: '',
  accountName: '',
  bank: '',
  bankLocation: '',
  branch: '',
  cardNumber: '',
};

export function vendorToForm(v: Vendor): VendorFormData {
  const { id: _id, ...rest } = v;
  return rest;
}

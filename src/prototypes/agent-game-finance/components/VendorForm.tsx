import React from 'react';
import type { Vendor } from '../data/types';

type VendorFormData = Omit<Vendor, 'id'>;

interface VendorFormProps {
  form: VendorFormData;
  setForm: React.Dispatch<React.SetStateAction<VendorFormData>>;
  vendorId?: string;
}

const BANK_OPTIONS = ['中国工商银行', '招商银行', '建设银行', '农业银行', '中国银行', '交通银行', '浦发银行', '民生银行'];
const LOCATION_OPTIONS = ['北京市', '上海市', '广东省', '浙江省', '四川省', '湖北省', '江苏省'];
const INVOICE_OPTIONS = ['增值税专用发票（6%）', '增值税专用发票（3%）', '增值税专用发票（1%）', '其他'];

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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="agf-form-grid__input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function GridSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select className="agf-form-grid__input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export function VendorForm({ form, setForm, vendorId }: VendorFormProps) {
  const set = (key: keyof VendorFormData) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <section className="agf-form-grid-section">
        <h4 className="agf-form-grid-section__title">厂商信息</h4>
        <table className="agf-form-grid">
          <thead>
            <tr>
              <th><GridLabel>厂商ID</GridLabel></th>
              <th><GridLabel required>厂商名称（公司名称）</GridLabel></th>
              <th><GridLabel required>联系人</GridLabel></th>
              <th><GridLabel required>手机</GridLabel></th>
              <th><GridLabel required>邮箱</GridLabel></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><div className="agf-form-grid__readonly">{vendorId ?? '-'}</div></td>
              <td><GridInput value={form.name} onChange={set('name')} /></td>
              <td><GridInput value={form.contact} onChange={set('contact')} /></td>
              <td><GridInput value={form.phone} onChange={set('phone')} /></td>
              <td><GridInput value={form.email} onChange={set('email')} /></td>
            </tr>
            <tr>
              <th colSpan={3}><GridLabel required>单位地址</GridLabel></th>
              <th colSpan={2}><GridLabel required>发票信息</GridLabel></th>
            </tr>
            <tr>
              <td colSpan={3}><GridInput value={form.address} onChange={set('address')} /></td>
              <td colSpan={2}><GridSelect value={form.invoiceInfo} onChange={set('invoiceInfo')} options={INVOICE_OPTIONS} /></td>
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
              <th><GridLabel>开户银行所在地</GridLabel></th>
              <th><GridLabel required>支行名称</GridLabel></th>
              <th><GridLabel required>银行卡号</GridLabel></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><GridInput value={form.accountName} onChange={set('accountName')} /></td>
              <td><GridSelect value={form.bank} onChange={set('bank')} options={BANK_OPTIONS} /></td>
              <td><GridSelect value={form.bankLocation} onChange={set('bankLocation')} options={LOCATION_OPTIONS} /></td>
              <td><GridInput value={form.branch} onChange={set('branch')} /></td>
              <td><GridInput value={form.cardNumber} onChange={set('cardNumber')} /></td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
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

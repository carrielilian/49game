import React, { useState } from 'react';
import { ColumnFilter } from '../components/ColumnFilter';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import {
  EMPTY_VENDOR_FORM,
  VendorForm,
  validateVendorForm,
  vendorToForm,
  type VendorFieldErrors,
} from '../components/VendorForm';
import { useAppStore } from '../data/store';
import type { Vendor } from '../data/types';
import { INVOICE_INFO_FILTER_OPTIONS } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';

export function VendorListPage() {
  const { scopedVendors, addVendor, updateVendor } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);
  const [errors, setErrors] = useState<VendorFieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const filtered = scopedVendors.filter((v) => {
    if (!matchesListSearch(search, { vendorId: v.id, vendorName: v.name })) return false;
    if (invoiceFilter && v.invoiceInfo !== invoiceFilter) return false;
    return true;
  });

  const clearError = (key: keyof typeof EMPTY_VENDOR_FORM) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_VENDOR_FORM); setErrors({}); setAddOpen(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm(vendorToForm(v));
    setErrors({});
    setEditOpen(true);
  };

  const showIncompleteToast = () => setToast({ message: '请完善所有信息', type: 'error' });

  const handleAdd = () => {
    const next = validateVendorForm(form);
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    addVendor(form);
    setAddOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };
  const handleEdit = () => {
    if (!editing) return;
    const next = validateVendorForm(form);
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    updateVendor({ ...editing, ...form });
    setEditOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  return (
    <div className="agf-card">
      <div data-annotation-id="vendor-list-query">
        <FilterBar
          actions={(
            <button
              type="button"
              className="agf-btn agf-btn--primary"
              data-annotation-id="vendor-list-add"
              onClick={openAdd}
            >
              添加厂商
            </button>
          )}
        >
          <ListSearchFields mode="vendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id="vendor-list-table">
        <DataTable
          rowKey={(r) => r.id}
          data={filtered}
          columns={[
            { key: 'id', title: '厂商ID', render: (r) => r.id },
            { key: 'name', title: '厂商名称', render: (r) => r.name },
            {
              key: 'invoice',
              title: '发票信息',
              header: (
                <span data-annotation-id="vendor-list-invoice-col">
                  <ColumnFilter
                    title="发票信息"
                    filter={{
                      type: 'select',
                      value: invoiceFilter,
                      onChange: setInvoiceFilter,
                      options: INVOICE_INFO_FILTER_OPTIONS,
                    }}
                  />
                </span>
              ),
              render: (r) => r.invoiceInfo,
            },
            {
              key: 'ops',
              title: '操作',
              render: (r) => (
                <div className="agf-actions">
                  <button
                    type="button"
                    className="agf-btn agf-btn--link"
                    data-annotation-id="vendor-list-edit"
                    onClick={() => openEdit(r)}
                  >
                    编辑
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Drawer title="添加厂商" open={addOpen} onClose={() => setAddOpen(false)} width={1175}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setAddOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleAdd}>确定</button></>}>
        <div data-annotation-id="vendor-list-add-form">
          <VendorForm form={form} setForm={setForm} errors={errors} clearError={clearError} />
        </div>
      </Drawer>
      <Drawer title="编辑厂商" open={editOpen} onClose={() => setEditOpen(false)} width={1175}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setEditOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleEdit}>保存</button></>}>
        <div data-annotation-id="vendor-list-edit-form">
          <VendorForm form={form} setForm={setForm} vendorId={editing?.id} errors={errors} clearError={clearError} />
        </div>
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

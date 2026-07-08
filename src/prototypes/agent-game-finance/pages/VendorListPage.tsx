import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Drawer } from '../components/Modal';
import { EMPTY_VENDOR_FORM, VendorForm, vendorToForm } from '../components/VendorForm';
import { useAppStore } from '../data/store';
import type { Vendor } from '../data/types';

export function VendorListPage() {
  const { vendors, addVendor, updateVendor } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);

  const filtered = vendors.filter((v) => !keyword || v.name.includes(keyword) || v.id.includes(keyword));

  const openAdd = () => { setEditing(null); setForm(EMPTY_VENDOR_FORM); setAddOpen(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm(vendorToForm(v));
    setEditOpen(true);
  };

  const handleAdd = () => { addVendor(form); setAddOpen(false); };
  const handleEdit = () => { if (editing) updateVendor({ ...editing, ...form }); setEditOpen(false); };

  return (
    <div className="agf-card">
      <FilterBar
        actions={<button type="button" className="agf-btn agf-btn--primary" onClick={openAdd}>添加厂商</button>}
      >
        <input className="agf-input" placeholder="厂商ID / 厂商名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={filtered}
        columns={[
          { key: 'id', title: '厂商ID', render: (r) => r.id },
          { key: 'name', title: '厂商名称（公司名称）', render: (r) => r.name },
          { key: 'invoice', title: '发票信息', render: (r) => r.invoiceInfo },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openEdit(r)}>编辑</button>
            </div>
          ) },
        ]}
      />
      <Drawer title="添加厂商" open={addOpen} onClose={() => setAddOpen(false)} width={1175}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setAddOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleAdd}>确定</button></>}>
        <VendorForm form={form} setForm={setForm} />
      </Drawer>
      <Drawer title="编辑厂商" open={editOpen} onClose={() => setEditOpen(false)} width={1175}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setEditOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleEdit}>保存</button></>}>
        <VendorForm form={form} setForm={setForm} vendorId={editing?.id} />
      </Drawer>
    </div>
  );
}

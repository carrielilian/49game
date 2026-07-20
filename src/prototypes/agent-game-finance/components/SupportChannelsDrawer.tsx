import React, { useEffect, useState } from 'react';
import { FieldError, FieldHint, FormSectionTitle, ReadonlyField } from './FormFields';
import { Drawer, Toast, type ToastType } from './Modal';
import type { FormulaChannel, FormulaConfig } from '../data/types';

type FieldErrors = Record<string, string>;

function validateChannelsForm(channels: FormulaChannel[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const ch of channels) {
    if (ch.type !== 'internal') continue;
    if (ch.enabled && !ch.channelGameId?.trim()) {
      errors[`channel-${ch.id}`] = '渠道游戏ID不能为空';
    }
  }
  return errors;
}

interface SupportChannelsDrawerProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
  vendorName: string;
  formula?: FormulaConfig;
  onSave: (formula: FormulaConfig) => void;
  formAnnotationId?: string;
}

export function SupportChannelsDrawer({
  open,
  onClose,
  gameId,
  gameName,
  vendorName,
  formula,
  onSave,
  formAnnotationId,
}: SupportChannelsDrawerProps) {
  const [editing, setEditing] = useState<FormulaConfig | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (open && formula) {
      setEditing({ ...formula, channels: formula.channels.map((c) => ({ ...c })) });
      setErrors({});
    }
  }, [open, formula]);

  const clearError = (key: string) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const updateChannel = (index: number, patch: Partial<FormulaChannel>) => {
    if (!editing) return;
    const ch = editing.channels[index];
    if (patch.enabled === false) clearError(`channel-${ch.id}`);
    const channels = [...editing.channels];
    channels[index] = { ...ch, ...patch };
    setEditing({ ...editing, channels });
  };

  const saveChannels = () => {
    if (!editing) return;
    const next = validateChannelsForm(editing.channels);
    if (Object.keys(next).length) {
      setErrors(next);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    onSave(editing);
    onClose();
    setToast({ message: '提交成功', type: 'success' });
  };

  return (
    <>
      <Drawer
        title="支持渠道"
        open={open}
        onClose={onClose}
        large
        footer={(
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={onClose}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={saveChannels}>保存</button>
          </>
        )}
      >
        {editing && (
          <div data-annotation-id={formAnnotationId}>
            <div className="agf-form-readonly-grid agf-channel-drawer-meta">
              <ReadonlyField label="游戏ID / 游戏名称" value={`${gameId} / ${gameName}`} />
              <ReadonlyField label="厂商名称" value={vendorName} />
            </div>
            <FormSectionTitle>内部渠道</FormSectionTitle>
            <FieldHint>请勾选支持的内部渠道，并填写该渠道下对应的游戏ID</FieldHint>
            {editing.channels.map((ch, i) => ch.type !== 'internal' ? null : (
              <div key={ch.id} className="agf-channel-row">
                <label className="agf-channel-row__check">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => updateChannel(i, { enabled: e.target.checked })}
                  />
                </label>
                <span className="agf-channel-row__name">{ch.name}</span>
                <div className="agf-channel-row__field">
                  <input
                    className="agf-form-input"
                    placeholder="渠道游戏ID"
                    value={ch.channelGameId ?? ''}
                    onChange={(e) => {
                      clearError(`channel-${ch.id}`);
                      updateChannel(i, { channelGameId: e.target.value });
                    }}
                  />
                  <FieldError message={errors[`channel-${ch.id}`]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}

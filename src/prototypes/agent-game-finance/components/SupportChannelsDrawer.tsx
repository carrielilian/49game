import React, { useEffect, useState } from 'react';
import { FieldError, FieldHint, FormSectionTitle, ReadonlyField } from './FormFields';
import { Drawer, Toast, type ToastType } from './Modal';
import type { BusinessType, FormulaChannel, FormulaConfig } from '../data/types';

type FieldErrors = Record<string, string>;

const CHANNEL_GROUPS_BY_BUSINESS: Record<BusinessType, {
  agency: string[];
  distribution: string[];
}> = {
  '4399': {
    agency: ['游戏盒付费', '游戏盒内购', '49广告联盟'],
    distribution: ['快爆付费', '快爆内购', '快爆小游戏广告'],
  },
  快爆: {
    agency: ['快爆付费', '快爆内购', '快爆小游戏广告'],
    distribution: ['游戏盒付费', '游戏盒内购', '49广告联盟'],
  },
};

const CHANNEL_CATEGORIES_BY_BUSINESS: Record<BusinessType, {
  agency: string;
  distribution: string;
}> = {
  '4399': {
    agency: '游戏盒',
    distribution: '快爆',
  },
  快爆: {
    agency: '快爆',
    distribution: '游戏盒',
  },
};

function normalizeChannelGameIds(value: string | undefined): string {
  return (value ?? '').split(',').map((id) => id.trim()).filter(Boolean).join(',');
}

function validateChannelsForm(channels: FormulaChannel[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const ch of channels) {
    if (ch.type !== 'internal') continue;
    if (!ch.enabled) continue;
    const value = ch.channelGameId?.trim() ?? '';
    if (!value) {
      errors[`channel-${ch.id}`] = '渠道游戏ID不能为空';
    } else if (value.includes('，')) {
      errors[`channel-${ch.id}`] = '多个游戏ID请使用英文逗号,分隔';
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
  businessType: BusinessType;
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
  businessType,
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
    const normalizedChannels = editing.channels.map((channel) => ({
      ...channel,
      channelGameId: channel.channelGameId == null
        ? undefined
        : normalizeChannelGameIds(channel.channelGameId),
    }));
    const next = validateChannelsForm(normalizedChannels);
    if (Object.keys(next).length) {
      setErrors(next);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    onSave({ ...editing, channels: normalizedChannels });
    onClose();
    setToast({ message: '提交成功', type: 'success' });
  };

  const renderChannelGroup = (title: string, categoryName: string, channelNames: string[]) => (
    <>
      <FormSectionTitle>{title}</FormSectionTitle>
      <FieldHint>请勾选支持的{title}，并填写对应的渠道游戏ID；多个游戏ID请使用英文逗号,分隔</FieldHint>
      <div className="agf-channel-category">{categoryName}</div>
      {editing?.channels.map((ch, i) => (
        ch.type !== 'internal' || !channelNames.includes(ch.name) ? null : (
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
                placeholder="多个游戏ID请用英文逗号,分隔"
                value={ch.channelGameId ?? ''}
                onChange={(e) => {
                  clearError(`channel-${ch.id}`);
                  updateChannel(i, { channelGameId: e.target.value });
                }}
                onBlur={(e) => updateChannel(i, { channelGameId: normalizeChannelGameIds(e.target.value) })}
              />
              <FieldError message={errors[`channel-${ch.id}`]} />
            </div>
          </div>
        )
      ))}
    </>
  );

  return (
    <>
      <Drawer
        title="渠道映射"
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
            {renderChannelGroup(
              '自有渠道',
              CHANNEL_CATEGORIES_BY_BUSINESS[businessType].agency,
              CHANNEL_GROUPS_BY_BUSINESS[businessType].agency,
            )}
            {renderChannelGroup(
              '外部渠道',
              CHANNEL_CATEGORIES_BY_BUSINESS[businessType].distribution,
              CHANNEL_GROUPS_BY_BUSINESS[businessType].distribution,
            )}
          </div>
        )}
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}

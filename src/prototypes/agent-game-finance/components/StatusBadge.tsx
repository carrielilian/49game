import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'muted';

interface StatusBadgeProps {
  text: string;
  variant?: BadgeVariant;
}

const VARIANT_MAP: Record<string, BadgeVariant> = {
  '已申请': 'success',
  '已付款': 'success',
  '已上线': 'success',
  '合作中': 'success',
  '待付款': 'warning',
  '未申请': 'warning',
  '合作终止': 'danger',
  '未上线': 'muted',
};

export function StatusBadge({ text, variant }: StatusBadgeProps) {
  const v = variant ?? VARIANT_MAP[text] ?? 'muted';
  return <span className={`agf-badge agf-badge--${v}`}>{text}</span>;
}

import React, { useEffect } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  large?: boolean;
  xl?: boolean;
  plain?: boolean;
}

export function Modal({ title, open, onClose, children, footer, large, xl, plain }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="agf-overlay" onClick={onClose} role="presentation">
      <div className={`agf-modal${xl ? ' agf-modal--xl' : large ? ' agf-modal--lg' : ''}${plain ? ' agf-modal--plain' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="agf-modal__header">
          <span>{title}</span>
          <button type="button" className="agf-modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="agf-modal__body">{children}</div>
        {footer && <div className="agf-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

interface DrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  large?: boolean;
  width?: number;
}

export function Drawer({ title, open, onClose, children, footer, large, width }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="agf-overlay" onClick={onClose} role="presentation" />
      <div
        className={`agf-drawer${large ? ' agf-drawer--lg' : ''}`}
        style={width ? { width: `${width}px` } : undefined}
        role="dialog"
      >
        <div className="agf-drawer__header">
          <span>{title}</span>
          <button type="button" className="agf-modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="agf-drawer__body">{children}</div>
        {footer && <div className="agf-drawer__footer">{footer}</div>}
      </div>
    </>
  );
}

export type ToastType = 'error' | 'success';

export function Toast({
  message,
  onDone,
  type,
}: {
  message: string;
  onDone: () => void;
  type: ToastType;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`agf-toast${type === 'error' ? ' agf-toast--error' : ''}${type === 'success' ? ' agf-toast--success' : ''}`}>
      {type === 'error' && (
        <span className="agf-toast__icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#F56C6C" />
            <path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {type === 'success' && (
        <span className="agf-toast__icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#67C23A" />
            <path d="M4.8 8.2l2.2 2.2 4.2-4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span>{message}</span>
    </div>
  );
}

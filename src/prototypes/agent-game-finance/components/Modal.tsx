import React, { useEffect } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  large?: boolean;
}

export function Modal({ title, open, onClose, children, footer, large }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="agf-overlay" onClick={onClose} role="presentation">
      <div className={`agf-modal${large ? ' agf-modal--lg' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog">
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

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="agf-toast">{message}</div>;
}

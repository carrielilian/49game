import React, { useState } from 'react';
import { Drawer } from './Modal';
import { useAppStore } from '../data/store';
import { formatMoney } from '../utils/settlement';

interface SettlementLetterDrawerProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  amount: number;
}

export function SettlementLetterDrawer({ open, onClose, vendorId, amount }: SettlementLetterDrawerProps) {
  const { getVendor } = useAppStore();
  const vendor = getVendor(vendorId);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [rate, setRate] = useState('7.25');

  const handleDownload = () => {
    const blob = new Blob([lang === 'zh' ? '结算函 PDF 模拟内容' : 'Settlement Letter PDF Mock'], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lang === 'zh' ? `结算函_${vendor?.name ?? vendorId}.pdf` : `Settlement_${vendorId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer
      title="结算函"
      open={open}
      onClose={onClose}
      large
      footer={
        <>
          <button type="button" className="agf-btn agf-btn--default" onClick={onClose}>关闭</button>
          <button type="button" className="agf-btn agf-btn--primary" onClick={handleDownload}>下载 PDF</button>
        </>
      }
    >
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className={`agf-tab${lang === 'zh' ? ' agf-tab--active' : ''}`} style={{ border: 'none', padding: '6px 12px' }} onClick={() => setLang('zh')}>中文</button>
        <button type="button" className={`agf-tab${lang === 'en' ? ' agf-tab--active' : ''}`} style={{ border: 'none', padding: '6px 12px' }} onClick={() => setLang('en')}>English</button>
        <label style={{ marginLeft: 'auto', fontSize: 13 }}>
          汇率：
          <input className="agf-input" style={{ width: 80, marginLeft: 8 }} value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
      </div>
      <div className="agf-letter">
        {lang === 'zh' ? (
          <>
            <h2>结算函</h2>
            <p>致：{vendor?.name}</p>
            <p>根据双方合作协议，现就代理游戏收入结算如下：</p>
            <p>结算金额：人民币 {formatMoney(amount)} 元</p>
            <p>（折合 USD {formatMoney(amount / parseFloat(rate || '7.25'))}，汇率 {rate}）</p>
            <p>收款银行：{vendor?.bank} {vendor?.branch}</p>
            <p>账号：{vendor?.cardNumber}</p>
            <p style={{ marginTop: 32 }}>请贵司确认后盖章回传，并开具相应发票。</p>
            <p style={{ textAlign: 'right', marginTop: 48 }}>代理游戏财务平台<br />{new Date().toLocaleDateString('zh-CN')}</p>
          </>
        ) : (
          <>
            <h2>Settlement Letter</h2>
            <p>To: {vendor?.name}</p>
            <p>Per our agency agreement, settlement details are as follows:</p>
            <p>Settlement Amount: CNY {formatMoney(amount)}</p>
            <p>(Equivalent USD {formatMoney(amount / parseFloat(rate || '7.25'))}, Rate: {rate})</p>
            <p>Bank: {vendor?.bank} {vendor?.branch}</p>
            <p>Account: {vendor?.cardNumber}</p>
            <p style={{ marginTop: 32 }}>Please confirm, stamp and return with invoice.</p>
            <p style={{ textAlign: 'right', marginTop: 48 }}>Game Finance Platform<br />{new Date().toLocaleDateString('en-US')}</p>
          </>
        )}
      </div>
    </Drawer>
  );
}

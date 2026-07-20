import React, { useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell, renderCurrencyTotals } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { ColumnSort } from '../components/ColumnSort';
import { CurrencyInput, FieldError, FieldHint, ReadonlyField } from '../components/FormFields';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { SupportChannelsDrawer } from '../components/SupportChannelsDrawer';
import { VendorSearchSelect } from '../components/VendorSearchSelect';
import { useAppStore } from '../data/store';
import type { Contract, ContractCurrency, CooperationContent, Game, GameOperationLog, GamePayer } from '../data/types';
import {
  GAME_PAYER_OPTIONS,
  OPERATION_STATUS_FILTER_OPTIONS,
  GAME_PAYER_FILTER_OPTIONS,
} from '../utils/columnFilters';
import { formatPaidDisplay, getPaidAmount } from '../utils/contractLog';
import { resolveContractCurrency } from '../utils/currencySnapshot';
import { downloadCsv } from '../utils/listExport';
import { formatCurrencyMoney, formatDateTime, formatOptionalCurrencyMoney } from '../utils/settlement';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';

const COOPERATION_OPTIONS: CooperationContent[] = ['游戏代理金', '预付分成款', '委托开发费'];
const PAYMENT_CURRENCY_OPTIONS: ContractCurrency[] = ['人民币', '美金'];

const PAID_FIELD_META: Record<CooperationContent, { key: keyof ContractAmountFields; label: string; hint: string }> = {
  游戏代理金: { key: 'paidAgencyFee', label: '已付游戏代理金', hint: '请输入目前已支付的游戏代理金' },
  预付分成款: { key: 'paidPrepayment', label: '已付预付分成款', hint: '请输入目前已支付的预付分成款' },
  委托开发费: { key: 'paidDevelopmentFee', label: '已付委托开发费', hint: '请输入目前已支付的委托开发费' },
};

type ContractAmountFields = {
  contractAmount: string;
  paidAgencyFee: string;
  paidPrepayment: string;
  paidDevelopmentFee: string;
};

const EMPTY_CONTRACT_AMOUNTS: ContractAmountFields = {
  contractAmount: '',
  paidAgencyFee: '',
  paidPrepayment: '',
  paidDevelopmentFee: '',
};

function formatContractAmount(value: number): string {
  return value.toFixed(2);
}

function contractAmountToField(c: Pick<Contract, 'contractAmount' | 'contractNumber'>): string {
  if (c.contractAmount == null || Number.isNaN(c.contractAmount)) return '';
  if (c.contractAmount === 0 && !c.contractNumber.trim()) return '';
  return formatContractAmount(c.contractAmount);
}

function parseContractAmount(value: string): number {
  return Math.round(parseFloat(value.trim()) * 100) / 100;
}

function validateContractAmount(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label}不能为空`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return `${label}精确至小数点后两位`;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return `${label}不能小于0`;
  return undefined;
}

function normalizeContractAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || validateContractAmount(trimmed, '金额')) return trimmed;
  return formatContractAmount(parseFloat(trimmed));
}

const EMPTY_GAME: Omit<Game, 'id' | 'createdAt'> = {
  name: '', onlineName: '', vendorId: '', manager: '', payer: undefined, license: '有', remark: '',
  launchDate: '', operationStatus: '未上线', cooperationStatus: '合作中',
};

type GameFormData = Omit<Game, 'id' | 'createdAt'>;

const ADD_GAME_REQUIRED: { key: keyof GameFormData; label: string }[] = [
  { key: 'onlineName', label: '游戏名称' },
  { key: 'name', label: '合同游戏名称' },
  { key: 'vendorId', label: '归属厂商' },
  { key: 'payer', label: '付款方' },
  { key: 'license', label: '版号' },
  { key: 'operationStatus', label: '运营状态' },
];

const EDIT_GAME_REQUIRED: { key: keyof GameFormData; label: string }[] = [
  { key: 'onlineName', label: '游戏名称' },
  { key: 'name', label: '合同游戏名称' },
  { key: 'payer', label: '付款方' },
  { key: 'license', label: '版号' },
  { key: 'operationStatus', label: '运营状态' },
];

type FieldErrors = Record<string, string>;

function validateGameForm(
  form: GameFormData,
  required: { key: keyof GameFormData; label: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const { key, label } of required) {
    const v = form[key];
    if (v == null || (typeof v === 'string' && !v.trim())) errors[key] = `${label}不能为空`;
  }
  return errors;
}

function renderGameLogAction(log: GameOperationLog) {
  if (log.action === '添加游戏') return '添加游戏';
  if (log.action === '合同变更' && log.detail) {
    return <span className="agf-log-detail">{log.detail}</span>;
  }
  if (log.status) return <StatusBadge text={log.status} />;
  return log.action;
}

type PaidSortKey = 'paidAgencyFee' | 'paidPrepayment' | 'paidDevelopmentFee';

const PAID_SORT_META: Record<PaidSortKey, { content: CooperationContent }> = {
  paidAgencyFee: { content: '游戏代理金' },
  paidPrepayment: { content: '预付分成款' },
  paidDevelopmentFee: { content: '委托开发费' },
};

const AMOUNT_CELL = 'agf-table__cell--right';

const GAME_LIST_EXPORT_HEADERS = [
  '付款方',
  '游戏ID',
  '游戏名称',
  '合同游戏名称',
  '厂商ID',
  '厂商名称',
  '已付游戏代理金',
  '已付预付分成款',
  '已付委托开发费',
  '运营状态',
] as const;

function sumPaidByCurrency(
  games: Game[],
  contractByGameId: Map<string, Contract>,
  key: PaidSortKey,
  content: CooperationContent,
  getContractCurrency: (game: Game) => ContractCurrency | undefined,
): Partial<Record<ContractCurrency, number>> {
  const totals: Partial<Record<ContractCurrency, number>> = {};
  for (const game of games) {
    const amount = getPaidAmount(contractByGameId.get(game.id), key, content);
    if (!amount) continue;
    const currency = getContractCurrency(game);
    if (!currency) continue;
    totals[currency] = (totals[currency] ?? 0) + amount;
  }
  return totals;
}

function buildGameListSummaryRow(
  games: Game[],
  contractByGameId: Map<string, Contract>,
  getContractCurrency: (game: Game) => ContractCurrency | undefined,
): React.ReactNode {
  return (
    <tr className="agf-table__summary-row" data-annotation-id="game-list-summary">
      <td>查询总计</td>
      <td />
      <td />
      <td />
      <td />
      <td className={AMOUNT_CELL}>
        {renderCurrencyTotals(sumPaidByCurrency(games, contractByGameId, 'paidAgencyFee', '游戏代理金', getContractCurrency))}
      </td>
      <td className={AMOUNT_CELL}>
        {renderCurrencyTotals(sumPaidByCurrency(games, contractByGameId, 'paidPrepayment', '预付分成款', getContractCurrency))}
      </td>
      <td className={AMOUNT_CELL}>
        {renderCurrencyTotals(sumPaidByCurrency(games, contractByGameId, 'paidDevelopmentFee', '委托开发费', getContractCurrency))}
      </td>
      <td />
      <td />
    </tr>
  );
}

function GameNameFields({ form, set, errors }: {
  form: GameFormData;
  set: (key: keyof GameFormData, value: string) => void;
  errors: FieldErrors;
}) {
  return (
    <>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">游戏名称</label>
        <div className="agf-form-field">
          <input className="agf-form-input" value={form.onlineName} onChange={(e) => set('onlineName', e.target.value)} />
          <FieldHint>游戏上线后所使用的正式名称</FieldHint>
          <FieldError message={errors.onlineName} />
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">合同游戏名称</label>
        <div className="agf-form-field">
          <input className="agf-form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <FieldHint>签约合同所使用的游戏名称</FieldHint>
          <FieldError message={errors.name} />
        </div>
      </div>
    </>
  );
}

function PayerField({ value, onChange, error }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="agf-form-item">
      <label className="agf-form-label agf-form-label--required">付款方</label>
      <div className="agf-form-field">
        <select className="agf-form-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">请选择</option>
          {GAME_PAYER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function ManagerField({ form, set, errors }: {
  form: GameFormData;
  set: (key: keyof GameFormData, value: string) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="agf-form-item"><label className="agf-form-label">游戏负责人</label>
      <div className="agf-form-field">
        <input className="agf-form-input" value={form.manager} onChange={(e) => set('manager', e.target.value)} />
        <FieldError message={errors.manager} />
      </div>
    </div>
  );
}

function LicenseField({ form, setForm, name, error, clearError }: {
  form: GameFormData;
  setForm: React.Dispatch<React.SetStateAction<GameFormData>>;
  name: string;
  error?: string;
  clearError: () => void;
}) {
  const setLicense = (license: GameFormData['license']) => {
    clearError();
    setForm({ ...form, license });
  };
  return (
    <div className="agf-form-item">
      <label className="agf-form-label agf-form-label--required">版号</label>
      <div className="agf-form-field">
        <div className="agf-radio-group">
          <label className="agf-radio-item"><input type="radio" name={name} checked={form.license === '有'} onChange={() => setLicense('有')} />有</label>
          <label className="agf-radio-item"><input type="radio" name={name} checked={form.license === '无'} onChange={() => setLicense('无')} />无</label>
        </div>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function AddGameForm({ form, setForm, vendors, errors, clearError }: {
  form: GameFormData;
  setForm: React.Dispatch<React.SetStateAction<GameFormData>>;
  vendors: { id: string; name: string }[];
  errors: FieldErrors;
  clearError: (key: string) => void;
}) {
  const set = (key: keyof GameFormData, value: string) => {
    clearError(key);
    setForm({ ...form, [key]: value });
  };
  return (
    <>
      <GameNameFields form={form} set={set} errors={errors} />
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">归属厂商</label>
        <div className="agf-form-field">
          <VendorSearchSelect
            value={form.vendorId}
            vendors={vendors}
            onChange={(vendorId) => set('vendorId', vendorId)}
          />
          <FieldError message={errors.vendorId} />
        </div>
      </div>
      <PayerField
        value={form.payer ?? ''}
        error={errors.payer}
        onChange={(value) => {
          clearError('payer');
          setForm({ ...form, payer: (value || undefined) as GamePayer | undefined });
        }}
      />
      <ManagerField form={form} set={set} errors={errors} />
      <LicenseField
        form={form}
        setForm={setForm}
        name="license"
        error={errors.license}
        clearError={() => clearError('license')}
      />
      <div className="agf-form-item">
        <label className="agf-form-label agf-form-label--required">运营状态</label>
        <div className="agf-form-field">
          <div className="agf-radio-group">
            <label className="agf-radio-item"><input type="radio" name="add-operationStatus" checked={form.operationStatus === '未上线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '未上线' }); }} />未上线</label>
            <label className="agf-radio-item"><input type="radio" name="add-operationStatus" checked={form.operationStatus === '已上线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '已上线' }); }} />已上线</label>
          </div>
          <FieldError message={errors.operationStatus} />
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
    </>
  );
}

function EditGameForm({ form, setForm, editing, getVendorName, errors, clearError }: {
  form: GameFormData;
  setForm: React.Dispatch<React.SetStateAction<GameFormData>>;
  editing: Game;
  getVendorName: (id: string) => string;
  errors: FieldErrors;
  clearError: (key: string) => void;
}) {
  const set = (key: keyof GameFormData, value: string) => {
    clearError(key);
    setForm({ ...form, [key]: value });
  };
  return (
    <>
      <ReadonlyField label="游戏ID" value={editing.id} />
      <GameNameFields form={form} set={set} errors={errors} />
      <ReadonlyField label="归属厂商" value={`${editing.vendorId} / ${getVendorName(editing.vendorId)}`} />
      <PayerField
        value={form.payer ?? ''}
        error={errors.payer}
        onChange={(value) => {
          clearError('payer');
          setForm({ ...form, payer: (value || undefined) as GamePayer | undefined });
        }}
      />
      <ManagerField form={form} set={set} errors={errors} />
      <LicenseField
        form={form}
        setForm={setForm}
        name="edit-license"
        error={errors.license}
        clearError={() => clearError('license')}
      />
      <div className="agf-form-item">
        <label className="agf-form-label agf-form-label--required">运营状态</label>
        <div className="agf-form-field">
          <div className="agf-radio-group">
            <label className="agf-radio-item"><input type="radio" name="edit-operationStatus" checked={form.operationStatus === '未上线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '未上线' }); }} />未上线</label>
            <label className="agf-radio-item"><input type="radio" name="edit-operationStatus" checked={form.operationStatus === '已上线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '已上线' }); }} />已上线</label>
          </div>
          <FieldError message={errors.operationStatus} />
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
    </>
  );
}

export function GameListPage() {
  const {
    scopedGames,
    scopedVendors,
    contracts,
    formulas,
    gameLogs,
    addGame,
    updateGame,
    updateContract,
    updateFormula,
    getVendorName,
    getVendor,
    getGame,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [payerFilter, setPayerFilter] = useState('');
  const [opStatus, setOpStatus] = useState('');
  const [sortKey, setSortKey] = useState<PaidSortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contractDrawer, setContractDrawer] = useState(false);
  const [channelDrawer, setChannelDrawer] = useState(false);
  const [channelGameId, setChannelGameId] = useState('');
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState(EMPTY_GAME);
  const [contractForm, setContractForm] = useState<Contract | null>(null);
  const [contractAmountFields, setContractAmountFields] = useState<ContractAmountFields>(EMPTY_CONTRACT_AMOUNTS);
  const [contractErrors, setContractErrors] = useState<FieldErrors>({});
  const [selectedGameId, setSelectedGameId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const contractByGameId = useMemo(
    () => new Map(contracts.map((c) => [c.gameId, c])),
    [contracts],
  );

  const filtered = scopedGames.filter((g) => {
    if (!matchesListSearch(search, {
      gameId: g.id,
      gameName: g.onlineName,
      contractName: g.name,
      vendorId: g.vendorId,
      vendorName: getVendorName(g.vendorId),
    })) return false;
    if (payerFilter && g.payer !== payerFilter) return false;
    if (opStatus && g.operationStatus !== opStatus) return false;
    return true;
  });

  const togglePaidSort = (key: PaidSortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('desc');
  };

  const tableData = useMemo(() => {
    const list = [...filtered];
    if (sortKey) {
      const { content } = PAID_SORT_META[sortKey];
      list.sort((a, b) => {
        const av = getPaidAmount(contractByGameId.get(a.id), sortKey, content);
        const bv = getPaidAmount(contractByGameId.get(b.id), sortKey, content);
        const diff = av - bv;
        return sortOrder === 'asc' ? diff : -diff;
      });
      return list;
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filtered, sortKey, sortOrder, contractByGameId]);

  const getPaidCellText = (game: Game, key: PaidSortKey, content: CooperationContent): string => {
    const c = contractByGameId.get(game.id);
    const text = c ? formatPaidDisplay(c, key, content) : '-';
    if (text === '-') return '-';
    return formatOptionalCurrencyMoney(parseFloat(text), resolveContractCurrency(c));
  };

  const renderPaidCell = (game: Game, key: PaidSortKey, content: CooperationContent) =>
    getPaidCellText(game, key, content);

  const getContractCurrencyForGame = (game: Game): ContractCurrency | undefined =>
    resolveContractCurrency(contractByGameId.get(game.id));

  const trailingRow = tableData.length > 0
    ? buildGameListSummaryRow(tableData, contractByGameId, getContractCurrencyForGame)
    : undefined;

  const handleExport = () => {
    const rows = tableData.map((g) => [
      g.payer,
      g.id,
      g.onlineName,
      g.name,
      g.vendorId,
      getVendorName(g.vendorId),
      getPaidCellText(g, 'paidAgencyFee', '游戏代理金'),
      getPaidCellText(g, 'paidPrepayment', '预付分成款'),
      getPaidCellText(g, 'paidDevelopmentFee', '委托开发费'),
      g.operationStatus,
    ]);
    downloadCsv(`游戏管理-${formatDateTime().slice(0, 10)}.csv`, [...GAME_LIST_EXPORT_HEADERS], rows);
    setToast({ message: '导出成功', type: 'success' });
  };

  const paidSortConfig = (key: PaidSortKey) => ({
    active: sortKey === key,
    order: sortOrder,
    onToggle: () => togglePaidSort(key),
  });

  const clearError = (key: string) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const clearContractError = (key: string) => setContractErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const openAdd = () => { setForm(EMPTY_GAME); setErrors({}); setAddOpen(true); };
  const openEdit = (g: Game) => {
    const { id: _id, createdAt: _createdAt, ...rest } = g;
    setEditing(g);
    setForm(rest);
    setErrors({});
    setEditOpen(true);
  };
  const openContract = (gameId: string) => {
    const game = getGame(gameId);
    const c = contracts.find((x) => x.gameId === gameId) ?? {
      gameId,
      contractNumber: '',
      cooperationContents: [] as CooperationContent[],
      supplementalNote: '',
      cooperationStatus: '合作中' as const,
    };
    setContractForm({
      ...c,
      cooperationContents: c.cooperationContents ?? [],
      cooperationStatus: c.cooperationStatus ?? game?.cooperationStatus ?? '合作中',
    });
    setContractAmountFields({
      contractAmount: contractAmountToField(c),
      paidAgencyFee: c.cooperationContents?.includes('游戏代理金')
        ? formatContractAmount(c.paidAgencyFee ?? 0) : '',
      paidPrepayment: c.cooperationContents?.includes('预付分成款')
        ? formatContractAmount(c.paidPrepayment ?? 0) : '',
      paidDevelopmentFee: c.cooperationContents?.includes('委托开发费')
        ? formatContractAmount(c.paidDevelopmentFee ?? 0) : '',
    });
    setContractErrors({});
    setContractDrawer(true);
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };
  const openChannels = (gameId: string) => {
    if (formulas.find((x) => x.gameId === gameId)) {
      setChannelGameId(gameId);
      setChannelDrawer(true);
    }
  };

  const showIncompleteToast = () => setToast({ message: '请完善所有信息', type: 'error' });

  const handleAdd = () => {
    const next = validateGameForm(form, ADD_GAME_REQUIRED);
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    addGame(form);
    setAddOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };
  const handleEdit = () => {
    if (!editing) return;
    const next = validateGameForm(form, EDIT_GAME_REQUIRED);
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    updateGame({ ...editing, ...form, vendorId: editing.vendorId });
    setEditOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };
  const toggleCooperationContent = (item: CooperationContent, checked: boolean) => {
    if (!contractForm) return;
    const meta = PAID_FIELD_META[item];
    const nextContents = checked
      ? [...contractForm.cooperationContents, item]
      : contractForm.cooperationContents.filter((x) => x !== item);
    setContractForm({ ...contractForm, cooperationContents: nextContents });
    if (!checked) {
      clearContractError(meta.key);
      clearContractError('cooperationContents');
      setContractAmountFields((prev) => ({ ...prev, [meta.key]: '' }));
    }
  };

  const saveContract = () => {
    if (!contractForm) return;
    const nextErrors: FieldErrors = {};
    if (!contractForm.contractNumber.trim()) nextErrors.contractNumber = '合同编号不能为空';
    if (!contractForm.currency) nextErrors.currency = '支付币种不能为空';
    if (!contractForm.cooperationContents.length) {
      nextErrors.cooperationContents = '合作内容不能为空';
    }

    const contractAmountErr = validateContractAmount(contractAmountFields.contractAmount, '合同金额');
    if (contractAmountErr) nextErrors.contractAmount = contractAmountErr;

    for (const item of contractForm.cooperationContents) {
      const { key, label } = PAID_FIELD_META[item];
      const err = validateContractAmount(contractAmountFields[key], label);
      if (err) nextErrors[key] = err;
    }

    if (!contractForm.cooperationStatus) {
      nextErrors.cooperationStatus = '合作状态不能为空';
    }

    if (Object.keys(nextErrors).length) {
      setContractErrors(nextErrors);
      showIncompleteToast();
      return;
    }

    const normalizedAmounts = {
      contractAmount: formatContractAmount(parseContractAmount(contractAmountFields.contractAmount)),
      paidAgencyFee: contractForm.cooperationContents.includes('游戏代理金')
        ? formatContractAmount(parseContractAmount(contractAmountFields.paidAgencyFee)) : '',
      paidPrepayment: contractForm.cooperationContents.includes('预付分成款')
        ? formatContractAmount(parseContractAmount(contractAmountFields.paidPrepayment)) : '',
      paidDevelopmentFee: contractForm.cooperationContents.includes('委托开发费')
        ? formatContractAmount(parseContractAmount(contractAmountFields.paidDevelopmentFee)) : '',
    };
    setContractAmountFields((prev) => ({ ...prev, ...normalizedAmounts }));

    updateContract({
      ...contractForm,
      contractNumber: contractForm.contractNumber.trim(),
      contractAmount: parseContractAmount(normalizedAmounts.contractAmount),
      paidAgencyFee: contractForm.cooperationContents.includes('游戏代理金')
        ? parseContractAmount(normalizedAmounts.paidAgencyFee) : undefined,
      paidPrepayment: contractForm.cooperationContents.includes('预付分成款')
        ? parseContractAmount(normalizedAmounts.paidPrepayment) : undefined,
      paidDevelopmentFee: contractForm.cooperationContents.includes('委托开发费')
        ? parseContractAmount(normalizedAmounts.paidDevelopmentFee) : undefined,
    });
    setContractDrawer(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const logs = useMemo(() => gameLogs
    .filter((l) => l.gameId === selectedGameId)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  [gameLogs, selectedGameId]);
  const contractGame = contractForm ? getGame(contractForm.gameId) : null;
  const contractCurrency = contractForm?.currency;
  const logGame = selectedGameId ? getGame(selectedGameId) : null;
  const channelGame = channelGameId ? getGame(channelGameId) : null;
  const channelFormula = channelGameId ? formulas.find((x) => x.gameId === channelGameId) : undefined;

  return (
    <div className="agf-card">
      <div data-annotation-id="game-list-query">
        <FilterBar
          actions={(
            <button
              type="button"
              className="agf-btn agf-btn--primary"
              data-annotation-id="game-list-add"
              onClick={openAdd}
            >
              添加游戏
            </button>
          )}
        >
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} showContractName />
          <button
            type="button"
            className="agf-btn agf-btn--primary"
            data-annotation-id="game-list-export"
            onClick={handleExport}
          >
            导出
          </button>
        </FilterBar>
      </div>
      <div data-annotation-id="game-list-table">
        <DataTable
          rowKey={(r) => r.id}
          data={tableData}
          trailingRow={trailingRow}
          columns={[
            {
              key: 'payer',
              title: '付款方',
              header: (
                <span data-annotation-id="game-list-payer-col">
                  <ColumnFilter
                    title="付款方"
                    filter={{
                      type: 'select',
                      value: payerFilter,
                      onChange: setPayerFilter,
                      options: GAME_PAYER_FILTER_OPTIONS,
                    }}
                  />
                </span>
              ),
              render: (r) => r.payer ?? '-',
            },
            { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.onlineName} sub={r.id} /> },
            { key: 'contractName', title: '合同游戏名称', render: (r) => r.name },
            { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
            { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidAgencyFee',
              title: '已付游戏代理金',
              header: (
                <span data-annotation-id="game-list-paid-cols">
                  <ColumnSort title="已付游戏代理金" sort={paidSortConfig('paidAgencyFee')} />
                </span>
              ),
              sort: paidSortConfig('paidAgencyFee'),
              render: (r) => renderPaidCell(r, 'paidAgencyFee', '游戏代理金'),
            },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidPrepayment',
              title: '已付预付分成款',
              sort: paidSortConfig('paidPrepayment'),
              render: (r) => renderPaidCell(r, 'paidPrepayment', '预付分成款'),
            },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidDevelopmentFee',
              title: '已付委托开发费',
              sort: paidSortConfig('paidDevelopmentFee'),
              render: (r) => renderPaidCell(r, 'paidDevelopmentFee', '委托开发费'),
            },
            {
              key: 'op',
              title: '运营状态',
              header: (
                <span data-annotation-id="game-list-op-status">
                  <ColumnFilter
                    title="运营状态"
                    filter={{
                      type: 'select',
                      value: opStatus,
                      onChange: setOpStatus,
                      options: OPERATION_STATUS_FILTER_OPTIONS,
                    }}
                  />
                </span>
              ),
              render: (r) => <StatusBadge text={r.operationStatus} />,
            },
            {
              key: 'ops',
              title: '操作',
              render: (r) => (
                <div className="agf-actions">
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-list-edit" onClick={() => openEdit(r)}>编辑</button>
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-list-contract" onClick={() => openContract(r.id)}>合同管理</button>
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-list-channels" onClick={() => openChannels(r.id)}>支持渠道</button>
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-list-logs" onClick={() => openLogs(r.id)}>操作记录</button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Drawer title="添加游戏" open={addOpen} onClose={() => setAddOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setAddOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleAdd}>确定</button></>}>
        <div data-annotation-id="game-list-add-form">
          <AddGameForm form={form} setForm={setForm} vendors={scopedVendors} errors={errors} clearError={clearError} />
        </div>
      </Drawer>
      <Drawer title="编辑游戏" open={editOpen} onClose={() => setEditOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setEditOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleEdit}>保存</button></>}>
        {editing && (
          <div data-annotation-id="game-list-edit-form">
            <EditGameForm form={form} setForm={setForm} editing={editing} getVendorName={getVendorName} errors={errors} clearError={clearError} />
          </div>
        )}
      </Drawer>
      <Drawer title="合同管理" open={contractDrawer} onClose={() => setContractDrawer(false)}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setContractDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveContract}>保存</button></>}>
        {contractForm && contractGame && (
          <div data-annotation-id="game-list-contract-form">
            <ReadonlyField label="游戏ID / 游戏名称" value={`${contractGame.id} / ${contractGame.onlineName}`} />
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">合同编号</label>
              <div className="agf-form-field">
                <input
                  className="agf-form-input"
                  value={contractForm.contractNumber}
                  onChange={(e) => {
                    clearContractError('contractNumber');
                    setContractForm({ ...contractForm, contractNumber: e.target.value });
                  }}
                />
                <FieldError message={contractErrors.contractNumber} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">支付币种</label>
              <div className="agf-form-field">
                <div className="agf-radio-group">
                  {PAYMENT_CURRENCY_OPTIONS.map((opt) => (
                    <label key={opt} className="agf-radio-item">
                      <input
                        type="radio"
                        name="contractCurrency"
                        checked={contractForm.currency === opt}
                        onChange={() => {
                          clearContractError('currency');
                          setContractForm({ ...contractForm, currency: opt });
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                <FieldError message={contractErrors.currency} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">合同金额</label>
              <div className="agf-form-field">
                <CurrencyInput
                  currency={contractCurrency}
                  value={contractAmountFields.contractAmount}
                  onChange={(v) => {
                    clearContractError('contractAmount');
                    setContractAmountFields({ ...contractAmountFields, contractAmount: v });
                  }}
                  onBlur={() => setContractAmountFields((prev) => ({
                    ...prev,
                    contractAmount: normalizeContractAmount(prev.contractAmount),
                  }))}
                />
                <FieldError message={contractErrors.contractAmount} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">合作内容</label>
              <div className="agf-form-field">
                <div className="agf-checkbox-group">
                  {COOPERATION_OPTIONS.map((opt) => (
                    <label key={opt} className="agf-checkbox-item">
                      <input
                        type="checkbox"
                        checked={contractForm.cooperationContents.includes(opt)}
                        onChange={(e) => toggleCooperationContent(opt, e.target.checked)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                <FieldError message={contractErrors.cooperationContents} />
              </div>
            </div>
            {contractForm.cooperationContents.map((item) => {
              const { key, label, hint } = PAID_FIELD_META[item];
              return (
                <div key={item} className="agf-form-item">
                  <label className="agf-form-label agf-form-label--required">{label}</label>
                  <div className="agf-form-field">
                    <CurrencyInput
                      currency={contractCurrency}
                      value={contractAmountFields[key]}
                      onChange={(v) => {
                        clearContractError(key);
                        setContractAmountFields({ ...contractAmountFields, [key]: v });
                      }}
                      onBlur={() => setContractAmountFields((prev) => ({
                        ...prev,
                        [key]: normalizeContractAmount(prev[key]),
                      }))}
                    />
                    <FieldHint>{hint}</FieldHint>
                    <FieldError message={contractErrors[key]} />
                  </div>
                </div>
              );
            })}
            <div className="agf-form-item">
              <label className="agf-form-label">补充说明</label>
              <textarea
                className="agf-form-textarea"
                value={contractForm.supplementalNote}
                onChange={(e) => setContractForm({ ...contractForm, supplementalNote: e.target.value })}
              />
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">合作状态</label>
              <div className="agf-form-field">
                <div className="agf-radio-group">
                  <label className="agf-radio-item"><input type="radio" name="contract-cooperationStatus" checked={contractForm.cooperationStatus === '合作中'} onChange={() => { clearContractError('cooperationStatus'); setContractForm({ ...contractForm, cooperationStatus: '合作中' }); }} />合作中</label>
                  <label className="agf-radio-item"><input type="radio" name="contract-cooperationStatus" checked={contractForm.cooperationStatus === '合作终止'} onChange={() => { clearContractError('cooperationStatus'); setContractForm({ ...contractForm, cooperationStatus: '合作终止' }); }} />合作终止</label>
                </div>
                <FieldError message={contractErrors.cooperationStatus} />
              </div>
            </div>
          </div>
        )}
      </Drawer>
      {channelGame && (
        <SupportChannelsDrawer
          open={channelDrawer}
          onClose={() => setChannelDrawer(false)}
          gameId={channelGame.id}
          gameName={channelGame.onlineName}
          vendorName={getVendorName(channelGame.vendorId)}
          formula={channelFormula}
          onSave={updateFormula}
          formAnnotationId="game-list-channels-form"
        />
      )}
      <Drawer title="操作记录" open={logDrawer} onClose={() => setLogDrawer(false)}>
        <div data-annotation-id="game-list-logs-drawer">
        {logGame && (
          <div className="agf-drawer-meta">游戏ID / 游戏名称：{logGame.id} / {logGame.onlineName}</div>
        )}
        {logs.length === 0 ? <div className="agf-empty">暂无操作记录</div> : (
          <div className="agf-table-wrap">
            <table className="agf-table">
              <thead><tr><th>操作人</th><th>操作时间</th><th>操作</th></tr></thead>
              <tbody>{logs.map((l) => (
                <tr key={l.id}><td>{l.operator}</td><td>{l.time}</td><td>{renderGameLogAction(l)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
        </div>
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell, renderCurrencyTotals } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { CurrencyInput, FieldError, FieldHint, ReadonlyField } from '../components/FormFields';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
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

type ContractContentAmountKey = 'agencyFee' | 'prepaymentAmount' | 'developmentFee';
type PaidAmountKey = 'paidAgencyFee' | 'paidPrepayment' | 'paidDevelopmentFee';

const CONTRACT_FIELD_META: Record<CooperationContent, { key: ContractContentAmountKey; label: string; hint: string }> = {
  游戏代理金: { key: 'agencyFee', label: '游戏代理金', hint: '请输入合同约定的游戏代理金' },
  预付分成款: { key: 'prepaymentAmount', label: '预付分成款', hint: '请输入合同约定的预付分成款' },
  委托开发费: { key: 'developmentFee', label: '委托开发费', hint: '请输入合同约定的委托开发费' },
};

const PAID_FIELD_META: Record<CooperationContent, {
  key: PaidAmountKey;
  contractKey: ContractContentAmountKey;
  label: string;
  contractLabel: string;
  hint: string;
}> = {
  游戏代理金: { key: 'paidAgencyFee', contractKey: 'agencyFee', label: '已付游戏代理金', contractLabel: '游戏代理金', hint: '请输入目前已支付的游戏代理金' },
  预付分成款: { key: 'paidPrepayment', contractKey: 'prepaymentAmount', label: '已付预付分成款', contractLabel: '预付分成款', hint: '请输入目前已支付的预付分成款' },
  委托开发费: { key: 'paidDevelopmentFee', contractKey: 'developmentFee', label: '已付委托开发费', contractLabel: '委托开发费', hint: '请输入目前已支付的委托开发费' },
};

type ContractAmountFields = {
  contractAmount: string;
  agencyFee: string;
  prepaymentAmount: string;
  developmentFee: string;
};

type PaidAmountFields = {
  paidAgencyFee: string;
  paidPrepayment: string;
  paidDevelopmentFee: string;
};

const EMPTY_CONTRACT_AMOUNTS: ContractAmountFields = {
  contractAmount: '',
  agencyFee: '',
  prepaymentAmount: '',
  developmentFee: '',
};

const EMPTY_PAID_AMOUNTS: PaidAmountFields = {
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

function validatePaidAmount(
  value: string,
  label: string,
  savedValue: number | undefined,
  contractValue: number | undefined,
  contractLabel: string,
): string | undefined {
  const amountError = validateContractAmount(value, label);
  if (amountError) return amountError;
  if (
    contractValue != null
    && Number.isFinite(contractValue)
    && parseContractAmount(value) > contractValue
  ) {
    return `${label}不能大于合同约定的${contractLabel}`;
  }
  if (
    savedValue != null
    && Number.isFinite(savedValue)
    && parseContractAmount(value) < savedValue
  ) {
    return '本次提交金额需大于等于历史金额';
  }
  return undefined;
}

function normalizeContractAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || validateContractAmount(trimmed, '金额')) return trimmed;
  return formatContractAmount(parseFloat(trimmed));
}

const EMPTY_GAME: Omit<Game, 'id' | 'createdAt'> = {
  name: '', onlineName: '', englishName: '', vendorId: '', manager: '', payer: undefined, license: '有', remark: '',
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

function validateUniqueGameName(
  gameName: string,
  games: Game[],
  currentGameId?: string,
): string | undefined {
  const normalizedName = gameName.trim();
  if (!normalizedName) return undefined;
  const duplicated = games.some(
    (game) => game.id !== currentGameId && game.onlineName.trim() === normalizedName,
  );
  return duplicated ? '游戏名称已存在' : undefined;
}

function renderGameLogAction(log: GameOperationLog) {
  if (log.action === '添加游戏') return '添加游戏';
  if (log.action === '合同变更' && log.detail) {
    return <span className="agf-log-detail">{log.detail}</span>;
  }
  if (log.action === '运营状态' && log.status) return `变更运营状态：${log.status}`;
  if (log.action === '合作状态' && log.status) return `变更合作状态：${log.status}`;
  return log.action;
}

type PaidSortKey = 'paidAgencyFee' | 'paidPrepayment' | 'paidDevelopmentFee';

const AMOUNT_CELL = 'agf-table__cell--right';

const GAME_LIST_EXPORT_HEADERS = [
  '游戏ID',
  '游戏名称',
  '合同游戏名称',
  '厂商ID',
  '厂商名称',
  '已付游戏代理金',
  '已付预付分成款',
  '已付委托开发费',
  '付款方',
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
      <div className="agf-form-item"><label className="agf-form-label">游戏英文名称</label>
        <div className="agf-form-field">
          <input className="agf-form-input" value={form.englishName ?? ''} onChange={(e) => set('englishName', e.target.value)} />
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
            <label className="agf-radio-item"><input type="radio" name="add-operationStatus" checked={form.operationStatus === '已下线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '已下线' }); }} />已下线</label>
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
      <ReadonlyField label="付款方" value={editing.payer ?? '-'} />
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
            <label className="agf-radio-item"><input type="radio" name="edit-operationStatus" checked={form.operationStatus === '已下线'} onChange={() => { clearError('operationStatus'); setForm({ ...form, operationStatus: '已下线' }); }} />已下线</label>
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
    games,
    scopedGames,
    scopedVendors,
    contracts,
    gameLogs,
    addGame,
    updateGame,
    updateContract,
    getVendorName,
    getGame,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [payerFilter, setPayerFilter] = useState('');
  const [opStatus, setOpStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contractDrawer, setContractDrawer] = useState(false);
  const [paidDrawer, setPaidDrawer] = useState(false);
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState(EMPTY_GAME);
  const [contractForm, setContractForm] = useState<Contract | null>(null);
  const [contractAmountFields, setContractAmountFields] = useState<ContractAmountFields>(EMPTY_CONTRACT_AMOUNTS);
  const [contractErrors, setContractErrors] = useState<FieldErrors>({});
  const [paidContract, setPaidContract] = useState<Contract | null>(null);
  const [paidAmountFields, setPaidAmountFields] = useState<PaidAmountFields>(EMPTY_PAID_AMOUNTS);
  const [paidErrors, setPaidErrors] = useState<FieldErrors>({});
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
      vendorId: g.vendorId,
      vendorName: getVendorName(g.vendorId),
    })) return false;
    if (payerFilter && g.payer !== payerFilter) return false;
    if (opStatus && g.operationStatus !== opStatus) return false;
    return true;
  });

  const tableData = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filtered],
  );

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
      g.id,
      g.onlineName,
      g.name,
      g.vendorId,
      getVendorName(g.vendorId),
      getPaidCellText(g, 'paidAgencyFee', '游戏代理金'),
      getPaidCellText(g, 'paidPrepayment', '预付分成款'),
      getPaidCellText(g, 'paidDevelopmentFee', '委托开发费'),
      g.payer,
      g.operationStatus,
    ]);
    downloadCsv(`游戏管理-${formatDateTime().slice(0, 10)}.csv`, [...GAME_LIST_EXPORT_HEADERS], rows);
    setToast({ message: '导出成功', type: 'success' });
  };

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

  const clearPaidError = (key: string) => setPaidErrors((prev) => {
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
      agencyFee: c.cooperationContents?.includes('游戏代理金')
        ? formatContractAmount(c.agencyFee ?? 0) : '',
      prepaymentAmount: c.cooperationContents?.includes('预付分成款')
        ? formatContractAmount(c.prepaymentAmount ?? 0) : '',
      developmentFee: c.cooperationContents?.includes('委托开发费')
        ? formatContractAmount(c.developmentFee ?? 0) : '',
    });
    setContractErrors({});
    setContractDrawer(true);
  };
  const openPaidItems = (gameId: string) => {
    const c = contracts.find((x) => x.gameId === gameId);
    if (!c?.cooperationContents.length) {
      setToast({ message: '请先维护合同信息', type: 'error' });
      return;
    }
    setPaidContract(c);
    setPaidAmountFields({
      paidAgencyFee: c.cooperationContents.includes('游戏代理金')
        ? formatContractAmount(c.paidAgencyFee ?? 0) : '',
      paidPrepayment: c.cooperationContents.includes('预付分成款')
        ? formatContractAmount(c.paidPrepayment ?? 0) : '',
      paidDevelopmentFee: c.cooperationContents.includes('委托开发费')
        ? formatContractAmount(c.paidDevelopmentFee ?? 0) : '',
    });
    setPaidErrors({});
    setPaidDrawer(true);
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };
  const showIncompleteToast = () => setToast({ message: '请完善所有信息', type: 'error' });

  const handleAdd = () => {
    const next = validateGameForm(form, ADD_GAME_REQUIRED);
    const duplicateNameError = validateUniqueGameName(form.onlineName, games);
    if (duplicateNameError) next.onlineName = duplicateNameError;
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    addGame(form);
    setAddOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };
  const handleEdit = () => {
    if (!editing) return;
    const next = validateGameForm(form, EDIT_GAME_REQUIRED);
    const duplicateNameError = validateUniqueGameName(form.onlineName, games, editing.id);
    if (duplicateNameError) next.onlineName = duplicateNameError;
    if (Object.keys(next).length) { setErrors(next); showIncompleteToast(); return; }
    updateGame({ ...editing, ...form, vendorId: editing.vendorId, payer: editing.payer });
    setEditOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };
  const toggleCooperationContent = (item: CooperationContent, checked: boolean) => {
    if (!contractForm) return;
    const existingContract = contractByGameId.get(contractForm.gameId);
    if (!checked && existingContract?.cooperationContents.includes(item)) return;
    const contractMeta = CONTRACT_FIELD_META[item];
    const paidMeta = PAID_FIELD_META[item];
    const nextContents = checked
      ? [...contractForm.cooperationContents, item]
      : contractForm.cooperationContents.filter((x) => x !== item);
    setContractForm({
      ...contractForm,
      cooperationContents: nextContents,
      ...(checked ? {} : { [contractMeta.key]: undefined, [paidMeta.key]: undefined }),
    });
    if (!checked) {
      clearContractError(contractMeta.key);
      clearContractError('cooperationContents');
      setContractAmountFields((prev) => ({ ...prev, [contractMeta.key]: '' }));
    }
  };

  const saveContract = () => {
    if (!contractForm) return;
    const existingContract = contractByGameId.get(contractForm.gameId);
    const nextErrors: FieldErrors = {};
    if (!contractForm.contractNumber.trim()) nextErrors.contractNumber = '合同编号不能为空';
    if (!contractForm.currency) nextErrors.currency = '支付币种不能为空';
    if (!contractForm.cooperationContents.length) {
      nextErrors.cooperationContents = '合作内容不能为空';
    }
    const removedSubmittedContent = existingContract?.cooperationContents.some(
      (item) => !contractForm.cooperationContents.includes(item),
    );
    if (removedSubmittedContent) {
      nextErrors.cooperationContents = '已提交的合作内容不可取消';
    }

    const contractAmountErr = validateContractAmount(contractAmountFields.contractAmount, '合同金额');
    if (contractAmountErr) nextErrors.contractAmount = contractAmountErr;

    for (const item of contractForm.cooperationContents) {
      const { key, label } = CONTRACT_FIELD_META[item];
      const err = validateContractAmount(contractAmountFields[key], label);
      if (err) {
        nextErrors[key] = err;
        continue;
      }
      const paidMeta = PAID_FIELD_META[item];
      const paidAmount = existingContract?.[paidMeta.key];
      if (paidAmount != null && parseContractAmount(contractAmountFields[key]) < paidAmount) {
        nextErrors[key] = `${label}不能小于${paidMeta.label}`;
      }
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
      agencyFee: contractForm.cooperationContents.includes('游戏代理金')
        ? formatContractAmount(parseContractAmount(contractAmountFields.agencyFee)) : '',
      prepaymentAmount: contractForm.cooperationContents.includes('预付分成款')
        ? formatContractAmount(parseContractAmount(contractAmountFields.prepaymentAmount)) : '',
      developmentFee: contractForm.cooperationContents.includes('委托开发费')
        ? formatContractAmount(parseContractAmount(contractAmountFields.developmentFee)) : '',
    };
    setContractAmountFields((prev) => ({ ...prev, ...normalizedAmounts }));

    updateContract({
      ...contractForm,
      contractNumber: contractForm.contractNumber.trim(),
      currency: existingContract?.currency ?? contractForm.currency,
      contractAmount: parseContractAmount(normalizedAmounts.contractAmount),
      agencyFee: contractForm.cooperationContents.includes('游戏代理金')
        ? parseContractAmount(normalizedAmounts.agencyFee) : undefined,
      prepaymentAmount: contractForm.cooperationContents.includes('预付分成款')
        ? parseContractAmount(normalizedAmounts.prepaymentAmount) : undefined,
      developmentFee: contractForm.cooperationContents.includes('委托开发费')
        ? parseContractAmount(normalizedAmounts.developmentFee) : undefined,
      paidAgencyFee: contractForm.cooperationContents.includes('游戏代理金')
        ? contractForm.paidAgencyFee : undefined,
      paidPrepayment: contractForm.cooperationContents.includes('预付分成款')
        ? contractForm.paidPrepayment : undefined,
      paidDevelopmentFee: contractForm.cooperationContents.includes('委托开发费')
        ? contractForm.paidDevelopmentFee : undefined,
    });
    setContractDrawer(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const savePaidItems = () => {
    if (!paidContract) return;
    const nextErrors: FieldErrors = {};
    for (const item of paidContract.cooperationContents) {
      const { key, contractKey, label, contractLabel } = PAID_FIELD_META[item];
      const err = validatePaidAmount(
        paidAmountFields[key],
        label,
        paidContract[key],
        paidContract[contractKey],
        contractLabel,
      );
      if (err) nextErrors[key] = err;
    }
    if (Object.keys(nextErrors).length) {
      setPaidErrors(nextErrors);
      showIncompleteToast();
      return;
    }

    const normalizedAmounts: PaidAmountFields = {
      paidAgencyFee: paidContract.cooperationContents.includes('游戏代理金')
        ? formatContractAmount(parseContractAmount(paidAmountFields.paidAgencyFee)) : '',
      paidPrepayment: paidContract.cooperationContents.includes('预付分成款')
        ? formatContractAmount(parseContractAmount(paidAmountFields.paidPrepayment)) : '',
      paidDevelopmentFee: paidContract.cooperationContents.includes('委托开发费')
        ? formatContractAmount(parseContractAmount(paidAmountFields.paidDevelopmentFee)) : '',
    };
    setPaidAmountFields(normalizedAmounts);
    updateContract({
      ...paidContract,
      paidAgencyFee: paidContract.cooperationContents.includes('游戏代理金')
        ? parseContractAmount(normalizedAmounts.paidAgencyFee) : undefined,
      paidPrepayment: paidContract.cooperationContents.includes('预付分成款')
        ? parseContractAmount(normalizedAmounts.paidPrepayment) : undefined,
      paidDevelopmentFee: paidContract.cooperationContents.includes('委托开发费')
        ? parseContractAmount(normalizedAmounts.paidDevelopmentFee) : undefined,
    });
    setPaidDrawer(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const logs = useMemo(() => gameLogs
    .filter((l) => l.gameId === selectedGameId)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  [gameLogs, selectedGameId]);
  const contractGame = contractForm ? getGame(contractForm.gameId) : null;
  const contractCurrency = contractForm?.currency;
  const savedContract = contractForm ? contractByGameId.get(contractForm.gameId) : undefined;
  const contractCurrencyLocked = Boolean(savedContract?.currency);
  const paidGame = paidContract ? getGame(paidContract.gameId) : null;
  const logGame = selectedGameId ? getGame(selectedGameId) : null;

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
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
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
            { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.onlineName} sub={r.id} /> },
            { key: 'contractName', title: '合同游戏名称', render: (r) => r.name },
            { key: 'vendor', title: '厂商ID / 厂商名称', render: (r) => <DualCell main={getVendorName(r.vendorId)} sub={r.vendorId} /> },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidAgencyFee',
              title: '已付游戏代理金',
              header: <span data-annotation-id="game-list-paid-cols">已付游戏代理金</span>,
              render: (r) => renderPaidCell(r, 'paidAgencyFee', '游戏代理金'),
            },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidPrepayment',
              title: '已付预付分成款',
              render: (r) => renderPaidCell(r, 'paidPrepayment', '预付分成款'),
            },
            {
              ...COL_ALIGN_RIGHT,
              key: 'paidDevelopmentFee',
              title: '已付委托开发费',
              render: (r) => renderPaidCell(r, 'paidDevelopmentFee', '委托开发费'),
            },
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
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-list-paid-items" onClick={() => openPaidItems(r.id)}>已付款项</button>
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
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setEditOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleEdit}>确定</button></>}>
        {editing && (
          <div data-annotation-id="game-list-edit-form">
            <EditGameForm form={form} setForm={setForm} editing={editing} getVendorName={getVendorName} errors={errors} clearError={clearError} />
          </div>
        )}
      </Drawer>
      <Drawer title="合同管理" open={contractDrawer} onClose={() => setContractDrawer(false)}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setContractDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveContract}>确定</button></>}>
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
              {contractCurrencyLocked ? (
                <ReadonlyField label="支付币种" value={contractForm.currency ?? '-'} />
              ) : (
                <>
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
                </>
              )}
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
                        disabled={savedContract?.cooperationContents.includes(opt)}
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
              const { key, label, hint } = CONTRACT_FIELD_META[item];
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
      <Drawer title="已付款项" open={paidDrawer} onClose={() => setPaidDrawer(false)}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setPaidDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={savePaidItems}>确定</button></>}>
        {paidContract && paidGame && (
          <div data-annotation-id="game-list-paid-items-form">
            <ReadonlyField label="游戏ID / 游戏名称" value={`${paidGame.id} / ${paidGame.onlineName}`} />
            <ReadonlyField label="合同编号" value={paidContract.contractNumber || '-'} />
            {paidContract.cooperationContents.map((item) => {
              const { key, label, hint } = PAID_FIELD_META[item];
              return (
                <div key={item} className="agf-form-item">
                  <label className="agf-form-label agf-form-label--required">{label}</label>
                  <div className="agf-form-field">
                    <CurrencyInput
                      currency={paidContract.currency}
                      value={paidAmountFields[key]}
                      onChange={(v) => {
                        clearPaidError(key);
                        setPaidAmountFields({ ...paidAmountFields, [key]: v });
                      }}
                      onBlur={() => setPaidAmountFields((prev) => ({
                        ...prev,
                        [key]: normalizeContractAmount(prev[key]),
                      }))}
                    />
                    <FieldHint>{hint}</FieldHint>
                    <FieldError message={paidErrors[key]} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
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

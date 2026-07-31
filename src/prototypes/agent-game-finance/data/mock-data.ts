import type {
  BusinessType,
  Contract,
  CooperationContent,
  ContractCurrency,
  FormulaConfig,
  Game,
  GameBalance,
  GameOperationLog,
  GamePaymentRequest,
  FormulaOperationLog,
  SettlementRecord,
  Vendor,
  ExchangeRateRecord,
} from './types';
import { deriveGameBalances } from '../utils/balance';
import { resolveFollowInvoiceTax } from '../utils/invoiceTax';
import { buildGamePaymentApplySnapshot } from '../utils/gamePaymentApplySnapshot';
import {
  calcRecordSettlementIncome,
  getSettlementChannelOwnership,
  getSettlementFormulaText,
} from '../utils/settlement';

const BT4399 = '4399' as const satisfies BusinessType;
const BTKB = '快爆' as const satisfies BusinessType;

/** 银行五字段不全（验收「未填写银行信息」拦截） */
const VENDOR_INCOMPLETE_BANK = new Set(['4008']);

function vendorWithPrepayment(v: Vendor): Vendor {
  const bankIncomplete = VENDOR_INCOMPLETE_BANK.has(v.id);
  return {
    ...v,
    ...(bankIncomplete ? { cardNumber: '' } : {}),
  };
}

/** 游戏历史已抵扣分成款 mock */
const GAME_HISTORICAL_DEDUCTIONS: Partial<Record<string, number>> = {
  '100001': 0,
  '100002': 0,
  '100003': 0,
  '100005': 10000, // 美金合同：120000 - 历史10000 - 本次2776.29 = 107223.71
  '100006': 95000, // 美金合同：申请前仅剩5000
  '100009': 0,
  '100010': 0,
  '300001': 0,
  '300003': 0,
  '300004': 0,
};

/** 游戏付费设置 mock（付款设置 — 分成付款公司等） */
const GAME_SHARE_PAYMENT: Partial<Record<string, Pick<Game, 'sharePaymentCompany' | 'sharePaymentCurrency'>>> = {
  '100001': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币' },
  '100002': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币' },
  '100003': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币' },
  '100005': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金' },
  '100006': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金' },
  '100007': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金' },
  '100009': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币' },
  '100010': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金' },
  '300001': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币' },
  '300003': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金' },
  '300004': { sharePaymentCompany: '游家时代', sharePaymentCurrency: '人民币' },
};

function gameWithPaymentSettings(g: Game): Game {
  const historicalDeduction = GAME_HISTORICAL_DEDUCTIONS[g.id] ?? g.historicalDeduction;
  const sharePayment = GAME_SHARE_PAYMENT[g.id];
  return {
    ...g,
    ...(historicalDeduction != null ? { historicalDeduction } : {}),
    ...(sharePayment ?? {}),
  };
}

export const INITIAL_VENDORS: Vendor[] = [
  vendorWithPrepayment({ id: '4001', businessType: BT4399, name: '星辉互动科技有限公司', contact: '张伟', phone: '13800138001', email: 'zhangwei@xinghui.com', address: '北京市朝阳区望京SOHO T3', invoiceInfo: '增值税专用发票（6%）', accountName: '星辉互动科技有限公司', bank: '中国工商银行', bankLocation: '北京市', branch: '朝阳支行', cardNumber: '6222123412341234' }),
  vendorWithPrepayment({ id: '4002', businessType: BT4399, name: '幻境游戏工作室', contact: '李娜', phone: '13900139002', email: 'lina@huanjing.com', address: '上海市浦东新区张江高科技园区', invoiceInfo: '增值税专用发票（3%）', accountName: '幻境游戏工作室', bank: '招商银行', bankLocation: '上海市', branch: '张江支行', cardNumber: '6214567856785678' }),
  vendorWithPrepayment({ id: '4003', businessType: BT4399, name: '雷霆网络科技', contact: '王强', phone: '13700137003', email: 'wangqiang@leiting.com', address: '深圳市南山区科技园南区', invoiceInfo: '增值税专用发票（6%）', accountName: '雷霆网络科技有限公司', bank: '建设银行', bankLocation: '广东省', branch: '科技园支行', cardNumber: '6227901290129012' }),
  vendorWithPrepayment({ id: '4004', businessType: BT4399, name: '梦想互娱', contact: '陈静', phone: '13600136004', email: 'chenjing@mengxiang.com', address: '广州市天河区珠江新城', invoiceInfo: '增值税专用发票（6%）', accountName: '梦想互娱有限公司', bank: '农业银行', bankLocation: '广东省', branch: '天河支行', cardNumber: '6228345634563456' }),
  vendorWithPrepayment({ id: '4005', businessType: BT4399, name: '像素工坊', contact: '刘洋', phone: '13500135005', email: 'liuyang@pixel.com', address: '杭州市西湖区文三路', invoiceInfo: '增值税专用发票（3%）', accountName: '像素工坊', bank: '中国银行', bankLocation: '浙江省', branch: '文三路支行', cardNumber: '6216789078907890' }),
  vendorWithPrepayment({ id: '4006', businessType: BT4399, name: '云端游创', contact: '赵敏', phone: '13400134006', email: 'zhaomin@cloudgame.com', address: '成都市高新区天府大道', invoiceInfo: '增值税专用发票（6%）', accountName: '云端游创科技有限公司', bank: '交通银行', bankLocation: '四川省', branch: '天府支行', cardNumber: '6222234523452345' }),
  vendorWithPrepayment({ id: '4007', businessType: BT4399, name: '灵动科技', contact: '孙涛', phone: '13300133007', email: 'suntao@lingdong.com', address: '武汉市洪山区光谷软件园', invoiceInfo: '增值税专用发票（3%）', accountName: '灵动科技有限公司', bank: '浦发银行', bankLocation: '湖北省', branch: '光谷支行', cardNumber: '6225678967896789' }),
  vendorWithPrepayment({ id: '4008', businessType: BT4399, name: '极客游戏', contact: '周雪', phone: '13200132008', email: 'zhouxue@geekgame.com', address: '南京市鼓楼区新街口', invoiceInfo: '增值税专用发票（6%）', accountName: '极客游戏有限公司', bank: '民生银行', bankLocation: '江苏省', branch: '新街口支行', cardNumber: '6226012301230123' }),
  vendorWithPrepayment({ id: '8001', businessType: BTKB, name: '快爆星辰科技', contact: '林峰', phone: '13100131001', email: 'linfeng@kbstar.com', address: '厦门市思明区软件园二期', invoiceInfo: '增值税专用发票（6%）', accountName: '快爆星辰科技有限公司', bank: '兴业银行', bankLocation: '福建省', branch: '软件园支行', cardNumber: '6229098765432109' }),
  vendorWithPrepayment({ id: '8002', businessType: BTKB, name: '极速互娱', contact: '黄悦', phone: '13100131002', email: 'huangyue@jisu.com', address: '长沙市岳麓区麓谷企业广场', invoiceInfo: '增值税专用发票（3%）', accountName: '极速互娱工作室', bank: '长沙银行', bankLocation: '湖南省', branch: '麓谷支行', cardNumber: '6214567890123456' }),
  vendorWithPrepayment({ id: '8003', businessType: BTKB, name: '爆趣游戏', contact: '何亮', phone: '13100131003', email: 'heliang@baoqu.com', address: '西安市高新区锦业路', invoiceInfo: '增值税专用发票（6%）', accountName: '爆趣游戏有限公司', bank: '西安银行', bankLocation: '陕西省', branch: '高新支行', cardNumber: '6225887654321098' }),
];

export const INITIAL_GAMES: Game[] = [
  gameWithPaymentSettings({ id: '100001', name: '星际探险', onlineName: '星际探险OL', englishName: 'Star Explorer Online', vendorId: '4001', launchDate: '2024-03-15', manager: '张明', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-01T09:00:00' }),
  gameWithPaymentSettings({ id: '100002', name: '魔法王国', onlineName: '魔法王国', englishName: 'Magic Kingdom', vendorId: '4001', launchDate: '2024-06-20', manager: '李华', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-10T10:00:00' }),
  gameWithPaymentSettings({ id: '100003', name: '赛车狂飙', onlineName: '赛车狂飙', englishName: 'Racing Storm', vendorId: '4002', launchDate: '2024-01-10', manager: '王芳', payer: '纯游', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-15T11:00:00' }),
  gameWithPaymentSettings({ id: '100004', name: '塔防英雄', onlineName: '塔防英雄', vendorId: '4002', launchDate: '2024-08-05', manager: '赵强', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-01T09:30:00' }),
  gameWithPaymentSettings({ id: '100005', name: '消消乐大师', onlineName: '消消乐大师', englishName: 'Candy Pop Master', vendorId: '4003', launchDate: '2023-11-20', manager: '陈静', payer: '游乐', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-20T14:00:00' }),
  gameWithPaymentSettings({ id: '100006', name: '武侠江湖', onlineName: '武侠江湖', englishName: 'Martial World', vendorId: '4003', launchDate: '2024-09-01', manager: '刘洋', payer: '4399', license: '有', operationStatus: '未上线', cooperationStatus: '合作中', createdAt: '2024-05-08T16:00:00' }),
  gameWithPaymentSettings({ id: '100007', name: '宠物乐园', onlineName: '宠物乐园', vendorId: '4004', launchDate: '2024-04-18', manager: '周敏', payer: '纯游', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-05-20T10:00:00' }),
  gameWithPaymentSettings({ id: '100008', name: '策略争霸', onlineName: '策略争霸', vendorId: '4004', launchDate: '2024-07-12', manager: '吴磊', payer: '游戏之家', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-01T11:30:00' }),
  gameWithPaymentSettings({ id: '100009', name: '音乐节奏', onlineName: '音乐节奏', vendorId: '4005', launchDate: '2024-02-28', manager: '郑雪', payer: '游乐', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-15T09:00:00' }),
  gameWithPaymentSettings({ id: '100010', name: '射击精英', onlineName: '射击精英', englishName: 'Elite Shooter', vendorId: '4006', launchDate: '2024-05-08', manager: '孙涛', payer: '香港4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-07-01T15:00:00' }),
  gameWithPaymentSettings({ id: '100011', name: '卡牌对决', onlineName: '卡牌对决', vendorId: '4007', launchDate: '2024-10-15', manager: '钱伟', payer: '游戏之家', license: '无', operationStatus: '未上线', cooperationStatus: '合作终止', createdAt: '2024-08-10T10:30:00' }),
  gameWithPaymentSettings({ id: '100012', name: '农场物语', onlineName: '农场物语', vendorId: '4008', launchDate: '2024-03-22', manager: '冯丽', payer: '游家时代', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-09-01T13:00:00' }),
  gameWithPaymentSettings({ id: '300001', name: '爆裂跑酷', onlineName: '爆裂跑酷OL', englishName: 'Blazing Runner Online', vendorId: '8001', launchDate: '2024-04-10', manager: '林峰', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-05T09:00:00' }),
  gameWithPaymentSettings({ id: '300002', name: '休闲消除', onlineName: '休闲消除', vendorId: '8001', launchDate: '2024-07-20', manager: '苏婷', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-05-12T11:00:00' }),
  gameWithPaymentSettings({ id: '300003', name: '枪战王者', onlineName: '枪战王者', englishName: 'Gun King', vendorId: '8002', launchDate: '2024-05-15', manager: '黄悦', payer: '纯游', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-20T14:30:00' }),
  gameWithPaymentSettings({ id: '300004', name: '农场大亨', onlineName: '农场大亨OL', vendorId: '8003', launchDate: '2024-08-01', manager: '何亮', payer: '游家时代', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-07-25T16:00:00' }),
];

/** 合同支付币种 mock：厂商 4003 下游戏为美金 */
const CONTRACT_CURRENCY_BY_VENDOR: Partial<Record<string, ContractCurrency>> = {
  '4003': '美金',
};

export const INITIAL_CONTRACTS: Contract[] = INITIAL_GAMES.map((g, i) => {
  const paidAgencyFee = [80000, 50000, 30000, 60000, 90000, 45000, 20000, 70000, 35000, 55000, 15000, 40000, 48000, 32000, 55000, 38000][i];
  const paidPrepayment = [120000, 200000, 80000, 50000, 150000, 60000, 80000, 90000, 45000, 120000, 35000, 65000, 95000, 28000, 42000, 60000][i];
  const paidDevelopmentFee = [120000, 80000, 100000, 100000, 150000, 90000, 60000, 110000, 70000, 95000, 85000, 85000, 88000, 65000, 72000, 50000][i];
  const cooperationContents: CooperationContent[] = ['游戏代理金', '预付分成款', '委托开发费'];
  return {
    gameId: g.id,
    currency: CONTRACT_CURRENCY_BY_VENDOR[g.vendorId] ?? '人民币',
    contractNumber: `HT-${g.id}`,
    contractAmount: [580000, 430000, 230000, 460000, 690000, 345000, 250000, 550000, 285000, 485000, 135000, 360000, 428000, 272000, 495000, 318000][i],
    cooperationContents,
    agencyFee: paidAgencyFee * 2,
    prepaymentAmount: paidPrepayment * 2,
    developmentFee: paidDevelopmentFee * 2,
    paidAgencyFee,
    paidPrepayment,
    paidDevelopmentFee,
    supplementalNote: ['标准代理合同，按月结算', '含独家代理条款', '联运分成按季度核对', '委托开发+联运', '预付分成按月抵扣'][i % 5],
    cooperationStatus: g.cooperationStatus,
  };
});

/** 游戏管理批注验收：100012 合同未勾选预付分成款，列表「已付预付分成款」列展示「-」 */
function enrichGameListAnnotationDemo() {
  const contract100012 = INITIAL_CONTRACTS.find((c) => c.gameId === '100012');
  if (contract100012) {
    contract100012.cooperationContents = ['游戏代理金', '委托开发费'];
    contract100012.prepaymentAmount = undefined;
    contract100012.paidPrepayment = undefined;
  }
}
enrichGameListAnnotationDemo();

/** 将重点演示游戏的合同预付设置收敛为清晰、可复算的场景。 */
function enrichPaymentScenarioContracts() {
  const contract100005 = INITIAL_CONTRACTS.find((c) => c.gameId === '100005');
  if (contract100005) {
    contract100005.paidPrepayment = 120000;
    contract100005.prepaymentAmount = 240000;
  }
  const contract100006 = INITIAL_CONTRACTS.find((c) => c.gameId === '100006');
  if (contract100006) {
    contract100006.paidPrepayment = 100000;
    contract100006.prepaymentAmount = 200000;
  }
  const contract100007 = INITIAL_CONTRACTS.find((c) => c.gameId === '100007');
  if (contract100007) {
    contract100007.cooperationContents = ['游戏代理金', '委托开发费'];
    contract100007.prepaymentAmount = undefined;
    contract100007.paidPrepayment = undefined;
  }
  // 明确选择“有预付分成款”但尚未维护已付预付，用于申请付款拦截场景。
  const contract100009 = INITIAL_CONTRACTS.find((c) => c.gameId === '100009');
  if (contract100009) {
    contract100009.prepaymentAmount = 90000;
    contract100009.paidPrepayment = undefined;
  }
}
enrichPaymentScenarioContracts();

/** 付款设置「有无预付分成款」默认与合同已付款项中的预付金额保持一致。 */
function enrichGameHasPrepayment() {
  const contractMap = new Map(INITIAL_CONTRACTS.map((contract) => [contract.gameId, contract]));
  for (const game of INITIAL_GAMES) {
    const paidPrepayment = contractMap.get(game.id)?.paidPrepayment;
    Object.assign(game, {
      hasPrepayment: game.id === '100009'
        ? true
        : paidPrepayment != null && !Number.isNaN(paidPrepayment),
    });
  }
}
enrichGameHasPrepayment();

const INTERNAL_CHANNELS = [
  '快爆付费',
  '快爆内购',
  '游戏盒付费',
  '游戏盒内购',
  '快爆小游戏广告',
  '49广告联盟',
];
const EXTERNAL_CHANNELS = ['小米', '荣耀', '华为', '爱九游', 'vivo', 'oppo', 'B站', 'TapTap', '应用宝', 'ios', 'Steam'];

function makeFormula(gameId: string, vendorId: string): FormulaConfig {
  const vendor = INITIAL_VENDORS.find((v) => v.id === vendorId);
  const invoice = vendor?.invoiceInfo ?? '';
  const tax = resolveFollowInvoiceTax(invoice, 0, vendor?.taxPoint);
  return {
    gameId,
    internalTaxMode: '跟随发票',
    internalTax: tax,
    internalChannelFee: 0.05,
    internalShare: 0.5,
    externalTaxMode: '跟随发票',
    externalTax: tax,
    externalChannelFee: 0,
    externalShare: 0.45,
    channels: [
      ...INTERNAL_CHANNELS.map((name, i) => ({
        id: `ic${i}`,
        name,
        type: 'internal' as const,
        enabled: i < 3,
        channelGameId: i === 0 ? `${gameId}-IC1,${gameId}-IC1-B` : `${gameId}-IC${i + 1}`,
      })),
      ...EXTERNAL_CHANNELS.map((name, i) => ({ id: `ec${i}`, name, type: 'external' as const, enabled: i < 2, channelGameId: `${gameId}-EC${i + 1}` })),
    ],
  };
}

/** 游戏管理新增游戏时同步的空结算公式（未配置） */
export function createEmptyFormula(gameId: string): FormulaConfig {
  return {
    gameId,
    internalTaxMode: '跟随发票',
    internalTax: NaN,
    internalChannelFee: NaN,
    internalShare: NaN,
    externalTaxMode: '跟随发票',
    externalTax: NaN,
    externalChannelFee: NaN,
    externalShare: NaN,
    channels: [
      ...INTERNAL_CHANNELS.map((name, i) => ({ id: `ic${i}`, name, type: 'internal' as const, enabled: false })),
      ...EXTERNAL_CHANNELS.map((name, i) => ({ id: `ec${i}`, name, type: 'external' as const, enabled: false })),
    ],
  };
}

export function isFormulaConfigured(f: FormulaConfig | undefined): boolean {
  if (!f) return false;
  return [
    f.internalTax, f.internalChannelFee, f.internalShare,
    f.externalTax, f.externalChannelFee, f.externalShare,
  ].every(Number.isFinite);
}

export const INITIAL_FORMULAS: FormulaConfig[] = INITIAL_GAMES.map((g) =>
  g.id === '100011' ? createEmptyFormula(g.id) : makeFormula(g.id, g.vendorId),
);

export const INITIAL_SETTLEMENTS: SettlementRecord[] = [
  { id: 'S001', type: 'external', incomeTime: '2026-06', gameId: '100001', channel: '小米', grossRevenue: 128000, settlementAmount: 128000, settlementIncome: 57600, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-01 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S002', type: 'internal', incomeTime: '2026-06', gameId: '100001', channel: '快爆付费', grossRevenue: 256000, settlementAmount: 243200, settlementIncome: 121600, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S003', type: 'internal', incomeTime: '2026-06', gameId: '100003', channel: '快爆内购', grossRevenue: 89000, settlementAmount: 81559.6, settlementIncome: 40779.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4002' },
  { id: 'S004', type: 'external', incomeTime: '2026-06', gameId: '100005', channel: '华为', grossRevenue: 40444.44, settlementAmount: 40444.44, settlementIncome: 18200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4003' },
  { id: 'S005', type: 'internal', incomeTime: '2026-07', gameId: '100001', channel: '快爆付费', grossRevenue: 280000, settlementAmount: 266000, settlementIncome: 133000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4001' },
  { id: 'S006', type: 'internal', incomeTime: '2026-07', gameId: '100007', channel: '游戏盒付费', grossRevenue: 65000, settlementAmount: 61750, settlementIncome: 30875, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4004' },
  { id: 'S007', type: 'refund', incomeTime: '2026-06', gameId: '100005', channel: '快爆内购', grossRevenue: 12000, settlementAmount: 11400, settlementIncome: 5700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4003' },
  { id: 'S010', type: 'internal', incomeTime: '2026-06', gameId: '100002', channel: '快爆付费', grossRevenue: 168000, settlementAmount: 159600, settlementIncome: 79800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S011', type: 'external', incomeTime: '2026-06', gameId: '100010', channel: 'ios', grossRevenue: 320000, settlementAmount: 320000, settlementIncome: 144000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4006' },
  { id: 'S012', type: 'internal', incomeTime: '2026-06', gameId: '100008', channel: '游戏盒付费', grossRevenue: 72000, settlementAmount: 68400, settlementIncome: 34200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4004' },
  { id: 'S013', type: 'internal', incomeTime: '2026-06', gameId: '100009', channel: '快爆内购', grossRevenue: 54000, settlementAmount: 49485.6, settlementIncome: 24742.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4005' },
  { id: 'S014', type: 'external', incomeTime: '2026-06', gameId: '100012', channel: '荣耀', grossRevenue: 96000, settlementAmount: 96000, settlementIncome: 43200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4008' },
  { id: 'S015', type: 'internal', incomeTime: '2026-07', gameId: '100002', channel: '快爆付费', grossRevenue: 192000, settlementAmount: 182400, settlementIncome: 91200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4001' },
  { id: 'S016', type: 'external', incomeTime: '2026-07', gameId: '100005', channel: 'vivo', grossRevenue: 380000, settlementAmount: 380000, settlementIncome: 171000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4003' },
  { id: 'S017', type: 'internal', incomeTime: '2026-07', gameId: '100003', channel: '快爆内购', grossRevenue: 105000, settlementAmount: 96222, settlementIncome: 48111, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4002' },
  { id: 'S018', type: 'internal', incomeTime: '2026-07', gameId: '100009', channel: '快爆付费', grossRevenue: 48000, settlementAmount: 43987.2, settlementIncome: 21993.6, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4005' },
  { id: 'S019', type: 'external', incomeTime: '2026-07', gameId: '100010', channel: 'oppo', grossRevenue: 295000, settlementAmount: 295000, settlementIncome: 132750, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4006' },
  { id: 'S020', type: 'refund', incomeTime: '2026-07', gameId: '100001', channel: '快爆付费', grossRevenue: 8000, settlementAmount: 7600, settlementIncome: 3800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S021', type: 'internal', incomeTime: '2026-07', gameId: '100012', channel: '游戏盒付费', grossRevenue: 58000, settlementAmount: 55100, settlementIncome: 27550, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4008' },
  { id: 'S009', type: 'external', incomeTime: '2026-07', gameId: '100010', channel: 'B站', grossRevenue: 88000, settlementAmount: 88000, settlementIncome: 39600, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4006' },
  // 厂商收入「申请付款」验收：余额 > 0，无待付款，银行/预付齐全
  { id: 'S022', type: 'internal', incomeTime: '2026-07', gameId: '100008', channel: '游戏盒内购', grossRevenue: 1157895, settlementAmount: 1100000, settlementIncome: 550000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4004' },
  { id: 'S023', type: 'external', incomeTime: '2026-07', gameId: '100009', channel: 'TapTap', grossRevenue: 688889, settlementAmount: 688889, settlementIncome: 310000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4005' },
  { id: 'S024', type: 'internal', incomeTime: '2026-07', gameId: '100010', channel: '快爆付费', grossRevenue: 736842, settlementAmount: 700000, settlementIncome: 350000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4006' },
  { id: 'S025', type: 'external', incomeTime: '2026-07', gameId: '100012', channel: '应用宝', grossRevenue: 577778, settlementAmount: 577778, settlementIncome: 260000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '4008' },
  // 补充覆盖：塔防英雄收入、合作终止游戏历史余额、银行不全厂商
  { id: 'S026', type: 'internal', incomeTime: '2026-07', gameId: '100004', channel: '快爆付费', grossRevenue: 142000, settlementAmount: 134900, settlementIncome: 0, formulaText: '', paymentApplyStatus: '未申请', settled: false, vendorId: '4002' },
  { id: 'S027', type: 'internal', incomeTime: '2026-07', gameId: '100011', channel: '游戏盒付费', grossRevenue: 52000, settlementAmount: 49400, settlementIncome: 0, formulaText: '', paymentApplyStatus: '未申请', settled: false, vendorId: '4007' },
  { id: 'S028', type: 'external', incomeTime: '2026-07', gameId: '100006', channel: '爱九游', grossRevenue: 196000, settlementAmount: 196000, settlementIncome: 88200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 12:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4003' },
  // 快爆业务结算样例
  { id: 'S301', type: 'internal', incomeTime: '2026-06', gameId: '300001', channel: '快爆付费', grossRevenue: 198000, settlementAmount: 188100, settlementIncome: 94050, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8001' },
  { id: 'S302', type: 'external', incomeTime: '2026-06', gameId: '300001', channel: 'ios', grossRevenue: 220000, settlementAmount: 220000, settlementIncome: 99000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8001' },
  { id: 'S303', type: 'internal', incomeTime: '2026-06', gameId: '300003', channel: '快爆内购', grossRevenue: 86000, settlementAmount: 78779.2, settlementIncome: 39389.6, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8002' },
  { id: 'S304', type: 'external', incomeTime: '2026-07', gameId: '300002', channel: 'Steam', grossRevenue: 156000, settlementAmount: 156000, settlementIncome: 0, formulaText: '', paymentApplyStatus: '未申请', settled: false, vendorId: '8001' },
  { id: 'S305', type: 'internal', incomeTime: '2026-07', gameId: '300004', channel: '游戏盒付费', grossRevenue: 92000, settlementAmount: 87400, settlementIncome: 43700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '8003' },
  { id: 'S306', type: 'refund', incomeTime: '2026-07', gameId: '300003', channel: '快爆付费', grossRevenue: 5000, settlementAmount: 4750, settlementIncome: 2375, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8002' },
  // 结算函退款验收：同产品连续月 / 单产品 / 多游戏
  { id: 'S029', type: 'refund', incomeTime: '2026-06', gameId: '100001', channel: '快爆付费', grossRevenue: 15000, settlementAmount: 14250, settlementIncome: 7500, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S031', type: 'refund', incomeTime: '2026-06', gameId: '100002', channel: '快爆内购', grossRevenue: 22000, settlementAmount: 20900, settlementIncome: 11000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 11:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4001' },
  { id: 'S032', type: 'refund', incomeTime: '2026-07', gameId: '100003', channel: '快爆内购', grossRevenue: 18000, settlementAmount: 16524, settlementIncome: 8280, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 11:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '4002' },
  { id: 'S033', type: 'refund', incomeTime: '2026-06', gameId: '300001', channel: '快爆内购', grossRevenue: 10000, settlementAmount: 9160, settlementIncome: 5000, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 12:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8001' },
  { id: 'S034', type: 'refund', incomeTime: '2026-07', gameId: '300001', channel: '快爆内购', grossRevenue: 12000, settlementAmount: 10992, settlementIncome: 6000, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 12:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8001' },
  { id: 'S035', type: 'refund', incomeTime: '2026-07', gameId: '300004', channel: '游戏盒付费', grossRevenue: 3500, settlementAmount: 3325, settlementIncome: 1750, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 13:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '8003' },
  { id: 'S307', type: 'internal', incomeTime: '2026-07', gameId: '300001', channel: '快爆内购', grossRevenue: 178000, settlementAmount: 163016, settlementIncome: 81508, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-06 12:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '8001' },
];

/** 让历史退款样例同步现行“两段公式”口径，原型打开即可直接验收。 */
function enrichRefundSettlementExamples() {
  for (const record of INITIAL_SETTLEMENTS) {
    if (record.type !== 'refund') continue;
    const vendor = INITIAL_VENDORS.find((item) => item.id === record.vendorId);
    const formula = INITIAL_FORMULAS.find((item) => item.gameId === record.gameId);
    const sourceOwnership = getSettlementChannelOwnership(record, vendor);
    // 自有渠道读取财务中心原始退款；发行渠道保留财务中心已计算后的来源金额。
    if (sourceOwnership === 'own') record.settlementAmount = record.grossRevenue;
    record.formulaText = getSettlementFormulaText(formula, vendor, 'external', '退款金额');
    record.settlementIncome = calcRecordSettlementIncome(record, formula, vendor);
  }
}
enrichRefundSettlementExamples();

/** 汇率表：每月末（最后工作日）从外部接口同步；标记付款按申请时间的「上个月」取 rate */
export const INITIAL_EXCHANGE_RATES: ExchangeRateRecord[] = [
  { month: '2026-04', rate: 7.162, fetchDate: '2026-04-30' },
  { month: '2026-05', rate: 7.185, fetchDate: '2026-05-29' },
  { month: '2026-06', rate: 7.21, fetchDate: '2026-06-30' },
];

function calcLinkedSettlementNet(settlementIds: string[]): number {
  const net = INITIAL_SETTLEMENTS
    .filter((record) => settlementIds.includes(record.id) && record.settled)
    .reduce((sum, record) => (
      record.type === 'refund'
        ? sum - record.settlementIncome
        : sum + record.settlementIncome
    ), 0);
  return Math.round(net * 100) / 100;
}

function makeRawPayment(
  payment: Omit<GamePaymentRequest, 'pendingAmount'> & { settlementIds: string[] },
): GamePaymentRequest {
  return {
    ...payment,
    pendingAmount: calcLinkedSettlementNet(payment.settlementIds),
  };
}

const RAW_GAME_PAYMENTS: GamePaymentRequest[] = [
  // 完整闭环：收入+退款 → 申请 → 预付部分抵扣 → 已付款。
  makeRawPayment({
    id: 'GP001', gameId: '100001', status: '已付款', applyTime: '2026-07-08 10:20:15',
    payTime: '2026-07-18 14:30:00', payBank: '4399',
    receiptInfo: '星辉互动科技有限公司 6222123412341234',
    settlementLetter: '结算函_星际探险OL.pdf', invoice: '发票_星际探险OL.pdf',
    remark: '【闭环】收入+退款、预付部分抵扣、已付款', settlementIds: ['S001', 'S002', 'S029'],
  }),
  // 预付全额抵扣：完整付款设置，实际付款为0并已完成付款。
  makeRawPayment({
    id: 'GP002', gameId: '100002', status: '已付款', applyTime: '2026-07-10 11:05:30',
    actualAmount: 0, payTime: '2026-07-20 11:30:00',
    remark: '【预付全抵】实际付款为0', settlementIds: ['S010', 'S031'],
  }),
  // 美金重点场景：120000 - 历史10000 - 本次2776.29 = 107223.71。
  makeRawPayment({
    id: 'GP005', gameId: '100005', status: '未付款', applyTime: '2026-07-30 10:00:00',
    exchangeRateDate: '2026-07-30', exchangeRate: 6.5555,
    remark: '【美金历史抵扣】剩余应为$107,223.71', settlementIds: ['S004'],
  }),
  // 美金预付接近耗尽：申请前仅剩5000，本次抵扣后归零并产生实付。
  makeRawPayment({
    id: 'GP006', gameId: '100006', status: '未付款', applyTime: '2026-07-12 15:45:00',
    exchangeRateDate: '2026-06-30', exchangeRate: 7.21,
    remark: '【美金预付耗尽】历史已抵扣95000、申请前剩余5000', settlementIds: ['S028'],
  }),
  // 无预付且付款币种为美金：展示人民币实付与实际付款美金。
  makeRawPayment({
    id: 'GP007', gameId: '100007', status: '已付款', applyTime: '2026-07-09 10:15:00',
    exchangeRateDate: '2026-06-30', exchangeRate: 7.21,
    actualAmount: 30875, actualAmountUsd: 4282.25, payTime: '2026-07-19 16:00:00',
    payBank: '纯游（美元）', receiptInfo: '梦想互娱有限公司 6228345634563456',
    settlementLetter: '结算函_宠物乐园.pdf',
    remark: '【无预付·美金付款】同时展示人民币与美金实付', settlementIds: ['S006'],
  }),
  // 快爆业务完整闭环；保留后续未申请收入，便于演示再次申请。
  makeRawPayment({
    id: 'GP301', gameId: '300001', status: '已付款', applyTime: '2026-07-14 16:30:00',
    actualAmount: 0, payTime: '2026-07-24 15:00:00', payBank: '4399',
    settlementLetter: '结算函_爆裂跑酷OL.pdf',
    remark: '【快爆闭环】已付款并保留下一周期可申请余额', settlementIds: ['S301', 'S033'],
  }),
  // 快爆业务待付款：收入和退款合并出函。
  makeRawPayment({
    id: 'GP303', gameId: '300003', status: '未付款', applyTime: '2026-07-15 15:00:00',
    exchangeRateDate: '2026-06-30', exchangeRate: 7.21,
    remark: '【快爆待付款】收入+退款、付款币种美金', settlementIds: ['S303', 'S306'],
  }),
  // 普通人民币待付款：单月收入扣除退款。
  makeRawPayment({
    id: 'GP304', gameId: '300004', status: '未付款', applyTime: '2026-07-16 09:30:00',
    remark: '【普通待付款】单月收入+退款、人民币付款', settlementIds: ['S305', 'S035'],
  }),
];

/** 付款申请状态由付款记录反向同步，确保每条已申请明细只属于一笔付款。 */
function syncSettlementPaymentApplyStatus() {
  const appliedIds = new Set(RAW_GAME_PAYMENTS.flatMap((payment) => payment.settlementIds ?? []));
  for (const record of INITIAL_SETTLEMENTS) {
    record.paymentApplyStatus = appliedIds.has(record.id) ? '已申请' : '未申请';
  }
}
syncSettlementPaymentApplyStatus();

function mockGetGameName(id: string): string {
  const g = INITIAL_GAMES.find((x) => x.id === id);
  return g?.onlineName ?? g?.name ?? id;
}

function enrichGamePayments(items: GamePaymentRequest[]): GamePaymentRequest[] {
  const enrichedById = new Map<string, GamePaymentRequest>();
  const processed: GamePaymentRequest[] = [];
  const chronological = [...items].sort((a, b) => a.applyTime.localeCompare(b.applyTime));

  for (const p of chronological) {
    const game = INITIAL_GAMES.find((g) => g.id === p.gameId);
    if (!game) {
      enrichedById.set(p.id, p);
      processed.push(p);
      continue;
    }
    const vendor = INITIAL_VENDORS.find((v) => v.id === game.vendorId);
    if (!vendor) {
      enrichedById.set(p.id, p);
      processed.push(p);
      continue;
    }
    const contract = INITIAL_CONTRACTS.find((c) => c.gameId === p.gameId);
    const { applySnapshot, letterSnapshot } = buildGamePaymentApplySnapshot({
      gameId: p.gameId,
      pendingAmount: p.pendingAmount,
      applyTime: p.applyTime,
      settlementIds: p.settlementIds ?? [],
      game,
      vendor,
      contract,
      settlements: INITIAL_SETTLEMENTS,
      gamePayments: processed,
      exchangeRates: INITIAL_EXCHANGE_RATES,
      games: INITIAL_GAMES,
      getGameName: mockGetGameName,
      exchangeRateDate: p.exchangeRateDate,
      exchangeRate: p.exchangeRate,
    });
    const next: GamePaymentRequest = {
      ...p,
      actualAmount: p.actualAmount
        ?? (p.status === '已付款' ? letterSnapshot.letterPayAmount : undefined),
      prepaymentDeductionAmount: applySnapshot.prepaymentDeductionAmount,
      applySnapshot,
      letterSnapshot: p.letterSnapshot ?? letterSnapshot,
    };
    enrichedById.set(p.id, next);
    processed.push(next);
  }

  return items.map((payment) => enrichedById.get(payment.id) ?? payment);
}

export const INITIAL_GAME_PAYMENTS = enrichGamePayments(RAW_GAME_PAYMENTS);

/** 开发期闭环自检：避免演示数据在后续调整中出现重复引用或金额漂移。 */
function validateMockDataClosure() {
  const settlementById = new Map(INITIAL_SETTLEMENTS.map((record) => [record.id, record]));
  const referenced = new Set<string>();
  for (const payment of INITIAL_GAME_PAYMENTS) {
    const linked = payment.settlementIds ?? [];
    for (const settlementId of linked) {
      if (referenced.has(settlementId)) throw new Error(`Mock结算明细重复申请：${settlementId}`);
      referenced.add(settlementId);
      const settlement = settlementById.get(settlementId);
      if (!settlement) throw new Error(`Mock付款引用不存在的结算明细：${settlementId}`);
      if (settlement.gameId !== payment.gameId) throw new Error(`Mock付款与结算游戏不一致：${payment.id}/${settlementId}`);
      if (!settlement.settled) throw new Error(`Mock付款引用未结算明细：${payment.id}/${settlementId}`);
    }
    const expectedPending = calcLinkedSettlementNet(linked);
    if (Math.abs(expectedPending - payment.pendingAmount) > 0.01) {
      throw new Error(`Mock待付款金额不闭环：${payment.id}`);
    }
  }
  for (const settlement of INITIAL_SETTLEMENTS) {
    const expected = referenced.has(settlement.id) ? '已申请' : '未申请';
    if (settlement.paymentApplyStatus !== expected) {
      throw new Error(`Mock申请状态不闭环：${settlement.id}`);
    }
  }
  const historyScenario = INITIAL_GAME_PAYMENTS.find((payment) => payment.id === 'GP005');
  if (Math.abs((historyScenario?.applySnapshot?.remainingPrepaymentAfterApply ?? 0) - 107223.71) > 0.01) {
    throw new Error('Mock美金历史抵扣场景不闭环：GP005');
  }

  const contractByGameId = new Map(INITIAL_CONTRACTS.map((contract) => [contract.gameId, contract]));
  for (const game of INITIAL_GAMES) {
    const hasCompany = Boolean(game.sharePaymentCompany);
    const hasCurrency = Boolean(game.sharePaymentCurrency);
    if (hasCompany !== hasCurrency) throw new Error(`Mock付款设置不完整：${game.id}`);
    const hasSavedPaymentSettings = hasCompany && hasCurrency;
    const hasPrepayment = game.hasPrepayment
      ?? (contractByGameId.get(game.id)?.paidPrepayment != null);
    if (hasSavedPaymentSettings && hasPrepayment && !Number.isFinite(game.historicalDeduction)) {
      throw new Error(`Mock历史已抵扣未保存：${game.id}`);
    }
  }
  for (const payment of INITIAL_GAME_PAYMENTS) {
    const game = INITIAL_GAMES.find((item) => item.id === payment.gameId);
    if (!game?.sharePaymentCompany || !game.sharePaymentCurrency) {
      throw new Error(`Mock付款记录缺少完整付款设置：${payment.id}`);
    }
  }
  const unconfiguredScenario = INITIAL_GAMES.find((game) => game.id === '100008');
  if (unconfiguredScenario?.sharePaymentCurrency || unconfiguredScenario?.sharePaymentCompany) {
    throw new Error('Mock 100008 应保持付款设置未提交状态');
  }
}
validateMockDataClosure();

export const INITIAL_GAME_BALANCES: GameBalance[] = deriveGameBalances(
  INITIAL_SETTLEMENTS, INITIAL_GAMES, INITIAL_GAME_PAYMENTS, INITIAL_CONTRACTS,
);

export const INITIAL_GAME_LOGS: GameOperationLog[] = [
  { id: 'GL000', gameId: '100001', operator: '张明', time: '2024-03-01 09:00:00', action: '添加游戏' },
  { id: 'GL001', gameId: '100001', operator: '张明', time: '2024-03-15 10:30:00', action: '运营状态', status: '已上线' },
  { id: 'GL004', gameId: '100001', operator: '张明', time: '2024-06-01 14:20:00', action: '合作状态', status: '合作中' },
  { id: 'GL005', gameId: '100001', operator: '张明', time: '2024-06-02 09:15:00', action: '合同变更', detail: '"已付游戏代理金"变更为"￥546.00"\n"已付预付分成款"变更为"-"' },
  { id: 'GL003', gameId: '100006', operator: '刘洋', time: '2024-09-01 11:00:00', action: '合作状态', status: '合作中' },
  { id: 'GL002', gameId: '100006', operator: '刘洋', time: '2024-09-05 11:00:00', action: '运营状态', status: '未上线' },
  { id: 'GL006', gameId: '100011', operator: '钱伟', time: '2025-11-01 10:00:00', action: '合作状态', status: '合作终止' },
  { id: 'GL007', gameId: '100011', operator: '钱伟', time: '2025-11-02 14:30:00', action: '运营状态', status: '未上线' },
  // 100012 农场物语：游戏管理批注验收样例（列表默认首行）
  { id: 'GL011', gameId: '100012', operator: '冯丽', time: '2024-09-01 13:00:00', action: '添加游戏' },
  { id: 'GL010', gameId: '100012', operator: '冯丽', time: '2024-09-06 10:30:00', action: '运营状态', status: '已上线' },
  { id: 'GL009', gameId: '100012', operator: '冯丽', time: '2024-09-12 14:00:00', action: '合作状态', status: '合作中' },
  { id: 'GL008', gameId: '100012', operator: '冯丽', time: '2024-10-15 09:20:00', action: '合同变更', detail: '"已付游戏代理金"变更为"￥40,000.00"\n"已付委托开发费"变更为"￥85,000.00"' },
];

export const INITIAL_FORMULA_LOGS: FormulaOperationLog[] = [
  { id: 'FL001', gameId: '100001', operator: '财务-王丽', time: '2024-03-01 09:00:00', formulaText: '自有渠道：待结算金额*（1-5%-0%）*50%\n外部渠道：待结算金额*（1-0%-0%）*45%' },
];

export { INTERNAL_CHANNELS, EXTERNAL_CHANNELS };

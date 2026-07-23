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
  PaymentRequest,
  SettlementRecord,
  Vendor,
  VendorBalance,
  ExchangeRateRecord,
} from './types';
import { deriveBalances, deriveGameBalances } from '../utils/balance';
import { resolveFollowInvoiceTax } from '../utils/invoiceTax';
import { buildSettlementLetterSnapshot } from '../utils/settlementLetterSnapshot';
import { buildGamePaymentApplySnapshot } from '../utils/gamePaymentApplySnapshot';

const BT4399 = '4399' as const satisfies BusinessType;
const BTKB = '快爆' as const satisfies BusinessType;

/** 厂商级预付分成款 mock */
const VENDOR_PREPAYMENTS: Partial<Record<string, number>> = {
  '1001': 800000,
  '1002': 600000,
  '1003': 950000,
  '1004': 600000,
  // 1005 未填，验收「未补充预付分成款」拦截
  '1006': 380000,
  '1007': 0, // 预付为 0 合法
  '1008': 280000,
  '2001': 680000,
  '2002': 180000,
  '2003': 320000,
};

/** 厂商历史已抵扣分成款 mock */
const VENDOR_HISTORICAL_DEDUCTIONS: Partial<Record<string, number>> = {
  '1003': 80000, // 配合 P001 验收已抵扣/剩余
};

/** 银行五字段不全（验收「未填写银行信息」拦截） */
const VENDOR_INCOMPLETE_BANK = new Set(['1007']);

function vendorWithPrepayment(v: Omit<Vendor, 'prepayment' | 'historicalDeduction' | 'prepaymentCurrency'> & { prepayment?: number }): Vendor {
  const prepayment = VENDOR_PREPAYMENTS[v.id];
  const historicalDeduction = VENDOR_HISTORICAL_DEDUCTIONS[v.id];
  const bankIncomplete = VENDOR_INCOMPLETE_BANK.has(v.id);
  return {
    ...v,
    ...(prepayment != null ? { prepayment } : {}),
    ...(historicalDeduction != null ? { historicalDeduction } : {}),
    ...(bankIncomplete ? { cardNumber: '' } : {}),
  };
}

/** 游戏级预付分成款 mock（未列入视为未填） */
const GAME_PREPAYMENTS: Partial<Record<string, number>> = {
  '4001': 320000,
  '4002': 280000,
  '4003': 150000,
  '4005': 380000,
  '4006': 100000, // GP015 验收结果⑤
  '4008': 200000,
  // 4009 未填，验收游戏预付拦截
  '4010': 180000,
  '4012': 0, // 预付为 0 合法
  '5001': 220000,
  '5003': 90000,
  // 5004 未填，快爆业务验收游戏预付拦截
};

/** 游戏历史已抵扣分成款 mock */
const GAME_HISTORICAL_DEDUCTIONS: Partial<Record<string, number>> = {
  '4005': 25000, // 配合 GP001 验收已抵扣/剩余
  '4006': 95000, // GP015：剩余未抵扣 5000（配合结果⑤）
};

/** 游戏付费设置 mock（付款设置 — 分成付款公司等） */
const GAME_SHARE_PAYMENT: Partial<Record<string, Pick<Game, 'sharePaymentCompany' | 'sharePaymentCurrency' | 'sharePaymentAccount'>>> = {
  '4001': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币', sharePaymentAccount: '6222123412341234' },
  '4003': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币', sharePaymentAccount: '6214567856785678' },
  '4005': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金', sharePaymentAccount: '6227901290129012' },
  '4006': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金', sharePaymentAccount: '6227901290129012' },
  '4007': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金', sharePaymentAccount: '6228345634563456' },
  '4008': { sharePaymentCompany: '香港4399', sharePaymentCurrency: '人民币', sharePaymentAccount: '6228345634563456' },
  '4009': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币', sharePaymentAccount: '6216789078907890' },
  '4010': { sharePaymentCompany: '纯游（美元）', sharePaymentCurrency: '美金', sharePaymentAccount: '6222234523452345' },
  '5001': { sharePaymentCompany: '4399', sharePaymentCurrency: '人民币', sharePaymentAccount: '6229098765432109' },
};

function gameWithPrepayment(g: Game): Game {
  const prepayment = GAME_PREPAYMENTS[g.id];
  const historicalDeduction = GAME_HISTORICAL_DEDUCTIONS[g.id] ?? g.historicalDeduction;
  const sharePayment = GAME_SHARE_PAYMENT[g.id];
  return {
    ...g,
    ...(prepayment != null ? { prepayment } : {}),
    ...(historicalDeduction != null ? { historicalDeduction } : {}),
    ...(sharePayment ?? {}),
  };
}

export const INITIAL_VENDORS: Vendor[] = [
  vendorWithPrepayment({ id: '1001', businessType: BT4399, name: '星辉互动科技有限公司', contact: '张伟', phone: '13800138001', email: 'zhangwei@xinghui.com', address: '北京市朝阳区望京SOHO T3', invoiceInfo: '增值税专用发票（6%）', accountName: '星辉互动科技有限公司', bank: '中国工商银行', bankLocation: '北京市', branch: '朝阳支行', cardNumber: '6222123412341234' }),
  vendorWithPrepayment({ id: '1002', businessType: BT4399, name: '幻境游戏工作室', contact: '李娜', phone: '13900139002', email: 'lina@huanjing.com', address: '上海市浦东新区张江高科技园区', invoiceInfo: '增值税专用发票（3%）', accountName: '幻境游戏工作室', bank: '招商银行', bankLocation: '上海市', branch: '张江支行', cardNumber: '6214567856785678' }),
  vendorWithPrepayment({ id: '1003', businessType: BT4399, name: '雷霆网络科技', contact: '王强', phone: '13700137003', email: 'wangqiang@leiting.com', address: '深圳市南山区科技园南区', invoiceInfo: '增值税专用发票（6%）', accountName: '雷霆网络科技有限公司', bank: '建设银行', bankLocation: '广东省', branch: '科技园支行', cardNumber: '6227901290129012' }),
  vendorWithPrepayment({ id: '1004', businessType: BT4399, name: '梦想互娱', contact: '陈静', phone: '13600136004', email: 'chenjing@mengxiang.com', address: '广州市天河区珠江新城', invoiceInfo: '增值税专用发票（6%）', accountName: '梦想互娱有限公司', bank: '农业银行', bankLocation: '广东省', branch: '天河支行', cardNumber: '6228345634563456' }),
  vendorWithPrepayment({ id: '1005', businessType: BT4399, name: '像素工坊', contact: '刘洋', phone: '13500135005', email: 'liuyang@pixel.com', address: '杭州市西湖区文三路', invoiceInfo: '增值税专用发票（3%）', accountName: '像素工坊', bank: '中国银行', bankLocation: '浙江省', branch: '文三路支行', cardNumber: '6216789078907890' }),
  vendorWithPrepayment({ id: '1006', businessType: BT4399, name: '云端游创', contact: '赵敏', phone: '13400134006', email: 'zhaomin@cloudgame.com', address: '成都市高新区天府大道', invoiceInfo: '增值税专用发票（6%）', accountName: '云端游创科技有限公司', bank: '交通银行', bankLocation: '四川省', branch: '天府支行', cardNumber: '6222234523452345' }),
  vendorWithPrepayment({ id: '1007', businessType: BT4399, name: '灵动科技', contact: '孙涛', phone: '13300133007', email: 'suntao@lingdong.com', address: '武汉市洪山区光谷软件园', invoiceInfo: '增值税专用发票（3%）', accountName: '灵动科技有限公司', bank: '浦发银行', bankLocation: '湖北省', branch: '光谷支行', cardNumber: '6225678967896789' }),
  vendorWithPrepayment({ id: '1008', businessType: BT4399, name: '极客游戏', contact: '周雪', phone: '13200132008', email: 'zhouxue@geekgame.com', address: '南京市鼓楼区新街口', invoiceInfo: '增值税专用发票（6%）', accountName: '极客游戏有限公司', bank: '民生银行', bankLocation: '江苏省', branch: '新街口支行', cardNumber: '6226012301230123' }),
  vendorWithPrepayment({ id: '2001', businessType: BTKB, name: '快爆星辰科技', contact: '林峰', phone: '13100131001', email: 'linfeng@kbstar.com', address: '厦门市思明区软件园二期', invoiceInfo: '增值税专用发票（6%）', accountName: '快爆星辰科技有限公司', bank: '兴业银行', bankLocation: '福建省', branch: '软件园支行', cardNumber: '6229098765432109' }),
  vendorWithPrepayment({ id: '2002', businessType: BTKB, name: '极速互娱', contact: '黄悦', phone: '13100131002', email: 'huangyue@jisu.com', address: '长沙市岳麓区麓谷企业广场', invoiceInfo: '增值税专用发票（3%）', accountName: '极速互娱工作室', bank: '长沙银行', bankLocation: '湖南省', branch: '麓谷支行', cardNumber: '6214567890123456' }),
  vendorWithPrepayment({ id: '2003', businessType: BTKB, name: '爆趣游戏', contact: '何亮', phone: '13100131003', email: 'heliang@baoqu.com', address: '西安市高新区锦业路', invoiceInfo: '增值税专用发票（6%）', accountName: '爆趣游戏有限公司', bank: '西安银行', bankLocation: '陕西省', branch: '高新支行', cardNumber: '6225887654321098' }),
];

export const INITIAL_GAMES: Game[] = [
  gameWithPrepayment({ id: '4001', name: '星际探险', onlineName: '星际探险OL', vendorId: '1001', launchDate: '2024-03-15', manager: '张明', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-01T09:00:00' }),
  gameWithPrepayment({ id: '4002', name: '魔法王国', onlineName: '魔法王国', vendorId: '1001', launchDate: '2024-06-20', manager: '李华', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-10T10:00:00' }),
  gameWithPrepayment({ id: '4003', name: '赛车狂飙', onlineName: '赛车狂飙', vendorId: '1002', launchDate: '2024-01-10', manager: '王芳', payer: '纯游', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-03-15T11:00:00' }),
  gameWithPrepayment({ id: '4004', name: '塔防英雄', onlineName: '塔防英雄', vendorId: '1002', launchDate: '2024-08-05', manager: '赵强', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-01T09:30:00' }),
  gameWithPrepayment({ id: '4005', name: '消消乐大师', onlineName: '消消乐大师', vendorId: '1003', launchDate: '2023-11-20', manager: '陈静', payer: '游乐', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-20T14:00:00' }),
  gameWithPrepayment({ id: '4006', name: '武侠江湖', onlineName: '武侠江湖', vendorId: '1003', launchDate: '2024-09-01', manager: '刘洋', payer: '4399', license: '有', operationStatus: '未上线', cooperationStatus: '合作中', createdAt: '2024-05-08T16:00:00' }),
  gameWithPrepayment({ id: '4007', name: '宠物乐园', onlineName: '宠物乐园', vendorId: '1004', launchDate: '2024-04-18', manager: '周敏', payer: '纯游', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-05-20T10:00:00' }),
  gameWithPrepayment({ id: '4008', name: '策略争霸', onlineName: '策略争霸', vendorId: '1004', launchDate: '2024-07-12', manager: '吴磊', payer: '游戏之家', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-01T11:30:00' }),
  gameWithPrepayment({ id: '4009', name: '音乐节奏', onlineName: '音乐节奏', vendorId: '1005', launchDate: '2024-02-28', manager: '郑雪', payer: '游乐', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-15T09:00:00' }),
  gameWithPrepayment({ id: '4010', name: '射击精英', onlineName: '射击精英', vendorId: '1006', launchDate: '2024-05-08', manager: '孙涛', payer: '香港4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-07-01T15:00:00' }),
  gameWithPrepayment({ id: '4011', name: '卡牌对决', onlineName: '卡牌对决', vendorId: '1007', launchDate: '2024-10-15', manager: '钱伟', payer: '游戏之家', license: '无', operationStatus: '未上线', cooperationStatus: '合作终止', createdAt: '2024-08-10T10:30:00' }),
  gameWithPrepayment({ id: '4012', name: '农场物语', onlineName: '农场物语', vendorId: '1008', launchDate: '2024-03-22', manager: '冯丽', payer: '游家时代', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-09-01T13:00:00' }),
  gameWithPrepayment({ id: '5001', name: '爆裂跑酷', onlineName: '爆裂跑酷OL', vendorId: '2001', launchDate: '2024-04-10', manager: '林峰', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-04-05T09:00:00' }),
  gameWithPrepayment({ id: '5002', name: '休闲消除', onlineName: '休闲消除', vendorId: '2001', launchDate: '2024-07-20', manager: '苏婷', payer: '4399', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-05-12T11:00:00' }),
  gameWithPrepayment({ id: '5003', name: '枪战王者', onlineName: '枪战王者', vendorId: '2002', launchDate: '2024-05-15', manager: '黄悦', payer: '纯游', license: '有', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-06-20T14:30:00' }),
  gameWithPrepayment({ id: '5004', name: '农场大亨', onlineName: '农场大亨OL', vendorId: '2003', launchDate: '2024-08-01', manager: '何亮', payer: '游家时代', license: '无', operationStatus: '已上线', cooperationStatus: '合作中', createdAt: '2024-07-25T16:00:00' }),
];

/** 合同支付币种 mock：厂商 1003 下游戏为美金 */
const CONTRACT_CURRENCY_BY_VENDOR: Partial<Record<string, ContractCurrency>> = {
  '1003': '美金',
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
    paidAgencyFee,
    paidPrepayment,
    paidDevelopmentFee,
    supplementalNote: ['标准代理合同，按月结算', '含独家代理条款', '联运分成按季度核对', '委托开发+联运', '预付分成按月抵扣'][i % 5],
    cooperationStatus: g.cooperationStatus,
  };
});

function enrichMockPrepaymentCurrency() {
  const contractMap = new Map(INITIAL_CONTRACTS.map((c) => [c.gameId, c]));
  for (const game of INITIAL_GAMES) {
    if (game.prepayment != null && !game.prepaymentCurrency) {
      const currency = contractMap.get(game.id)?.currency;
      if (currency) Object.assign(game, { prepaymentCurrency: currency });
    }
  }
  for (const vendor of INITIAL_VENDORS) {
    if (vendor.prepayment != null && !vendor.prepaymentCurrency) {
      const firstGame = INITIAL_GAMES.find((g) => g.vendorId === vendor.id);
      const currency = firstGame ? contractMap.get(firstGame.id)?.currency : undefined;
      if (currency) Object.assign(vendor, { prepaymentCurrency: currency });
    }
  }
}

enrichMockPrepaymentCurrency();

/** 游戏管理批注验收：4012 合同未勾选预付分成款，列表「已付预付分成款」列展示「-」 */
function enrichGameListAnnotationDemo() {
  const contract4012 = INITIAL_CONTRACTS.find((c) => c.gameId === '4012');
  if (contract4012) {
    contract4012.cooperationContents = ['游戏代理金', '委托开发费'];
    contract4012.paidPrepayment = undefined;
  }
}
enrichGameListAnnotationDemo();

const INTERNAL_CHANNELS = [
  '快爆付费',
  '快爆内购',
  '游戏盒付费',
  '游戏盒内购',
  '快爆小游戏广告',
  '49广告联盟',
];
const EXTERNAL_CHANNELS = ['纯游外放', '游乐外放', '游乐IOS', '快爆游IOS', '49外放'];

function makeFormula(gameId: string, vendorId: string): FormulaConfig {
  const invoice = INITIAL_VENDORS.find((v) => v.id === vendorId)?.invoiceInfo ?? '';
  const tax = resolveFollowInvoiceTax(invoice, 0);
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
      ...INTERNAL_CHANNELS.map((name, i) => ({ id: `ic${i}`, name, type: 'internal' as const, enabled: i < 3, channelGameId: `${gameId}-IC${i + 1}` })),
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
  g.id === '4011' ? createEmptyFormula(g.id) : makeFormula(g.id, g.vendorId),
);

export const INITIAL_SETTLEMENTS: SettlementRecord[] = [
  { id: 'S001', type: 'external', incomeTime: '2026-06', gameId: '4001', channel: '纯游外放', grossRevenue: 128000, settlementAmount: 128000, settlementIncome: 57600, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-01 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S002', type: 'internal', incomeTime: '2026-06', gameId: '4001', channel: '快爆付费', grossRevenue: 256000, settlementAmount: 243200, settlementIncome: 121600, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S003', type: 'internal', incomeTime: '2026-06', gameId: '4003', channel: '快爆内购', grossRevenue: 89000, settlementAmount: 81559.6, settlementIncome: 40779.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1002' },
  { id: 'S004', type: 'external', incomeTime: '2026-06', gameId: '4005', channel: '游乐IOS', grossRevenue: 450000, settlementAmount: 450000, settlementIncome: 202500, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S005', type: 'internal', incomeTime: '2026-07', gameId: '4001', channel: '快爆付费', grossRevenue: 280000, settlementAmount: 266000, settlementIncome: 133000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1001' },
  { id: 'S006', type: 'internal', incomeTime: '2026-07', gameId: '4007', channel: '游戏盒付费', grossRevenue: 65000, settlementAmount: 61750, settlementIncome: 30875, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1004' },
  { id: 'S007', type: 'refund', incomeTime: '2026-06', gameId: '4005', channel: '快爆内购', grossRevenue: 12000, settlementAmount: 11400, settlementIncome: 5700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S010', type: 'internal', incomeTime: '2026-06', gameId: '4002', channel: '快爆付费', grossRevenue: 168000, settlementAmount: 159600, settlementIncome: 79800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S011', type: 'external', incomeTime: '2026-06', gameId: '4010', channel: '快爆游IOS', grossRevenue: 320000, settlementAmount: 320000, settlementIncome: 144000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1006' },
  { id: 'S012', type: 'internal', incomeTime: '2026-06', gameId: '4008', channel: '游戏盒付费', grossRevenue: 72000, settlementAmount: 68400, settlementIncome: 34200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1004' },
  { id: 'S013', type: 'internal', incomeTime: '2026-06', gameId: '4009', channel: '快爆内购', grossRevenue: 54000, settlementAmount: 49485.6, settlementIncome: 24742.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1005' },
  { id: 'S014', type: 'external', incomeTime: '2026-06', gameId: '4012', channel: '纯游外放', grossRevenue: 96000, settlementAmount: 96000, settlementIncome: 43200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1008' },
  { id: 'S015', type: 'internal', incomeTime: '2026-07', gameId: '4002', channel: '快爆付费', grossRevenue: 192000, settlementAmount: 182400, settlementIncome: 91200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1001' },
  { id: 'S016', type: 'external', incomeTime: '2026-07', gameId: '4005', channel: '游乐IOS', grossRevenue: 380000, settlementAmount: 380000, settlementIncome: 171000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S017', type: 'internal', incomeTime: '2026-07', gameId: '4003', channel: '快爆内购', grossRevenue: 105000, settlementAmount: 96222, settlementIncome: 48111, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1002' },
  { id: 'S018', type: 'internal', incomeTime: '2026-07', gameId: '4009', channel: '快爆付费', grossRevenue: 48000, settlementAmount: 43987.2, settlementIncome: 21993.6, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1005' },
  { id: 'S019', type: 'external', incomeTime: '2026-07', gameId: '4010', channel: '快爆游IOS', grossRevenue: 295000, settlementAmount: 295000, settlementIncome: 132750, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1006' },
  { id: 'S020', type: 'refund', incomeTime: '2026-07', gameId: '4001', channel: '快爆付费', grossRevenue: 8000, settlementAmount: 7600, settlementIncome: 3800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S021', type: 'internal', incomeTime: '2026-07', gameId: '4012', channel: '游戏盒付费', grossRevenue: 58000, settlementAmount: 55100, settlementIncome: 27550, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1008' },
  { id: 'S009', type: 'external', incomeTime: '2026-07', gameId: '4010', channel: '快爆游IOS', grossRevenue: 88000, settlementAmount: 88000, settlementIncome: 39600, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1006' },
  // 厂商收入「申请付款」验收：余额 > 0，无待付款，银行/预付齐全
  { id: 'S022', type: 'internal', incomeTime: '2026-07', gameId: '4008', channel: '游戏盒内购', grossRevenue: 1157895, settlementAmount: 1100000, settlementIncome: 550000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1004' },
  { id: 'S023', type: 'external', incomeTime: '2026-07', gameId: '4009', channel: '快爆游IOS', grossRevenue: 688889, settlementAmount: 688889, settlementIncome: 310000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1005' },
  { id: 'S024', type: 'internal', incomeTime: '2026-07', gameId: '4010', channel: '快爆付费', grossRevenue: 736842, settlementAmount: 700000, settlementIncome: 350000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1006' },
  { id: 'S025', type: 'external', incomeTime: '2026-07', gameId: '4012', channel: '纯游外放', grossRevenue: 577778, settlementAmount: 577778, settlementIncome: 260000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1008' },
  // 补充覆盖：塔防英雄收入、合作终止游戏历史余额、银行不全厂商
  { id: 'S026', type: 'internal', incomeTime: '2026-07', gameId: '4004', channel: '快爆付费', grossRevenue: 142000, settlementAmount: 134900, settlementIncome: 67450, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 11:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1002' },
  { id: 'S027', type: 'internal', incomeTime: '2026-07', gameId: '4011', channel: '游戏盒付费', grossRevenue: 52000, settlementAmount: 49400, settlementIncome: 24700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-06 11:30:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1007' },
  { id: 'S028', type: 'external', incomeTime: '2026-07', gameId: '4006', channel: '游乐IOS', grossRevenue: 196000, settlementAmount: 196000, settlementIncome: 88200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-06 12:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  // 快爆业务结算样例
  { id: 'S301', type: 'internal', incomeTime: '2026-06', gameId: '5001', channel: '快爆付费', grossRevenue: 198000, settlementAmount: 188100, settlementIncome: 94050, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2001' },
  { id: 'S302', type: 'external', incomeTime: '2026-06', gameId: '5001', channel: '快爆游IOS', grossRevenue: 220000, settlementAmount: 220000, settlementIncome: 99000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-07-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2001' },
  { id: 'S303', type: 'internal', incomeTime: '2026-06', gameId: '5003', channel: '快爆内购', grossRevenue: 86000, settlementAmount: 78779.2, settlementIncome: 39389.6, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-07-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2002' },
  { id: 'S304', type: 'external', incomeTime: '2026-07', gameId: '5002', channel: '游乐IOS', grossRevenue: 156000, settlementAmount: 156000, settlementIncome: 70200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2026-08-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '2001' },
  { id: 'S305', type: 'internal', incomeTime: '2026-07', gameId: '5004', channel: '游戏盒付费', grossRevenue: 92000, settlementAmount: 87400, settlementIncome: 43700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '2003' },
  { id: 'S306', type: 'refund', incomeTime: '2026-07', gameId: '5003', channel: '快爆付费', grossRevenue: 5000, settlementAmount: 4750, settlementIncome: 2375, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2002' },
  // 结算函退款验收：同产品连续月 / 单产品 / 多游戏
  { id: 'S029', type: 'refund', incomeTime: '2026-06', gameId: '4001', channel: '快爆付费', grossRevenue: 15000, settlementAmount: 14250, settlementIncome: 7500, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 10:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S031', type: 'refund', incomeTime: '2026-06', gameId: '4002', channel: '快爆内购', grossRevenue: 22000, settlementAmount: 20900, settlementIncome: 11000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 11:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S032', type: 'refund', incomeTime: '2026-07', gameId: '4003', channel: '快爆内购', grossRevenue: 18000, settlementAmount: 16524, settlementIncome: 8280, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 11:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1002' },
  { id: 'S033', type: 'refund', incomeTime: '2026-06', gameId: '5001', channel: '快爆内购', grossRevenue: 10000, settlementAmount: 9160, settlementIncome: 5000, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 12:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2001' },
  { id: 'S034', type: 'refund', incomeTime: '2026-07', gameId: '5001', channel: '快爆内购', grossRevenue: 12000, settlementAmount: 10992, settlementIncome: 6000, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-05 12:30:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2001' },
  { id: 'S035', type: 'refund', incomeTime: '2026-07', gameId: '5004', channel: '游戏盒付费', grossRevenue: 3500, settlementAmount: 3325, settlementIncome: 1750, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2026-08-05 13:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '2003' },
  { id: 'S307', type: 'internal', incomeTime: '2026-07', gameId: '5001', channel: '快爆内购', grossRevenue: 178000, settlementAmount: 163016, settlementIncome: 81508, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2026-08-06 12:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '2001' },
];

/** 汇率表：每月末（最后工作日）从外部接口同步；标记付款按申请时间的「上个月」取 rate */
export const INITIAL_EXCHANGE_RATES: ExchangeRateRecord[] = [
  { month: '2026-04', rate: 7.162, fetchDate: '2026-04-30' },
  { month: '2026-05', rate: 7.185, fetchDate: '2026-05-29' },
  { month: '2026-06', rate: 7.21, fetchDate: '2026-06-30' },
];

const RAW_PAYMENTS: PaymentRequest[] = [
  // 1003 已付款+完整凭证+历史已抵扣（结算函⑤验收）
  { id: 'P001', vendorId: '1003', pendingAmount: 367800, actualAmount: 367800, actualAmountUsd: 51200, status: '已付款', applyTime: '2026-07-10 14:30:25', payTime: '2026-07-20 16:45:08', payBank: '4399', receiptInfo: '雷霆网络科技有限公司 6227901290129012', settlementLetter: '结算函_雷霆网络科技.pdf', invoice: '电子发票_367800.pdf', settlementIds: ['S004', 'S016', 'S007'] },
  // 1001 未付款（验收「存在未付款记录」拦截）
  { id: 'P002', vendorId: '1001', pendingAmount: 255200, status: '未付款', applyTime: '2026-07-05 09:15:42', settlementIds: ['S001', 'S002', 'S010', 'S020'] },
  // 1006 已付款缺凭证（请款凭证空态）
  { id: 'P003', vendorId: '1006', pendingAmount: 144000, actualAmount: 144000, status: '已付款', applyTime: '2026-06-28 10:00:00', payTime: '2026-07-08 15:30:00', payBank: '4399', receiptInfo: '云端游创科技有限公司 6222234523452345', settlementIds: ['S011'] },
  // 1008 已付款仅结算函（缺电子发票）
  { id: 'P004', vendorId: '1008', pendingAmount: 43200, actualAmount: 43000, status: '已付款', applyTime: '2026-06-25 11:20:00', payTime: '2026-07-05 09:45:00', payBank: '游家时代', receiptInfo: '极客游戏有限公司 6226012301230123', settlementLetter: '结算函_极客游戏.pdf', settlementIds: ['S014'] },
  // 快爆 2001 已付款
  { id: 'P301', vendorId: '2001', pendingAmount: 99000, actualAmount: 99000, status: '已付款', applyTime: '2026-07-12 11:20:30', payTime: '2026-07-22 15:10:18', payBank: '4399', receiptInfo: '快爆星辰科技有限公司 6229098765432109', settlementLetter: '结算函_快爆星辰科技.pdf', invoice: '电子发票_99000.pdf', settlementIds: ['S302'] },
  // 快爆 2002 未付款（结算函·含退款区）
  { id: 'P302', vendorId: '2002', pendingAmount: 37014.6, status: '未付款', applyTime: '2026-07-15 14:00:00', settlementIds: ['S303', 'S306'] },
  // 1001 已付款 · 结算函收入+退款+预付全额抵扣（厂商付款隐藏页深链验收）
  { id: 'P005', vendorId: '1001', pendingAmount: 255200, actualAmount: 0, status: '已付款', applyTime: '2026-07-06 16:00:00', payTime: '2026-07-16 11:30:00', payBank: '4399', receiptInfo: '星辉互动科技有限公司 6222123412341234', settlementLetter: '结算函_星辉互动.pdf', settlementIds: ['S001', 'S002', 'S010', 'S020'] },
];

const RAW_GAME_PAYMENTS: GamePaymentRequest[] = [
  // 4005 已付款+历史已抵扣（合同支付币种美金 · 情况3 · usdNet=0）
  { id: 'GP001', gameId: '4005', pendingAmount: 202500, actualAmount: 0, actualAmountUsd: 0, status: '已付款', applyTime: '2026-07-11 10:20:15', payTime: '2026-07-21 14:30:00', payBank: '纯游（美元）', receiptInfo: '雷霆网络科技有限公司 6227901290129012', settlementLetter: '结算函_消消乐大师.pdf', invoice: '电子发票_0.pdf', settlementIds: ['S004'] },
  // 4001 未付款 · 结果③（预付>0，厂商/付款币种均人民币，net=0）
  { id: 'GP002', gameId: '4001', pendingAmount: 88200, status: '未付款', applyTime: '2026-07-06 11:05:30', remark: '【情况2·net=0】预付320000，剩余≥待付', settlementIds: ['S001', 'S010'] },
  // 4008 已付款仅结算函
  { id: 'GP003', gameId: '4008', pendingAmount: 34200, actualAmount: 34200, status: '已付款', applyTime: '2026-06-30 09:00:00', payTime: '2026-07-10 11:00:00', payBank: '香港4399', receiptInfo: '梦想互娱有限公司 6228345634563456', settlementLetter: '结算函_策略争霸.pdf', settlementIds: ['S012'] },
  // 快爆 5001 未付款
  { id: 'GP301', gameId: '5001', pendingAmount: 94050, status: '未付款', applyTime: '2026-07-14 16:30:00', settlementIds: ['S301'] },
  // —— 标记付款初始填充 · 三种情况验收（均为未付款，打开【标记付款】自动重算）——
  // 4009 未填预付 · 情况1（预付≤0，付款币种人民币）
  { id: 'GP011', gameId: '4009', pendingAmount: 46736.4, status: '未付款', applyTime: '2026-07-08 09:20:00', remark: '【情况1】预付≤0·付款币种人民币', settlementIds: ['S013', 'S018'] },
  // 4007 未填预付 · 情况1（预付≤0，付款币种美金）
  { id: 'GP012', gameId: '4007', pendingAmount: 30875, status: '未付款', applyTime: '2026-07-09 10:15:00', remark: '【情况1】预付≤0·付款币种美金', settlementIds: ['S006'] },
  // 4003 预付150000 · 情况2（合同人民币；含 GP018 已付抵扣后 net≈110610.8）
  { id: 'GP013', gameId: '4003', pendingAmount: 180000, status: '未付款', applyTime: '2026-07-10 11:30:00', remark: '【情况2】合同人民币·net≈110610.8', settlementIds: ['S003', 'S017'] },
  // 4010 预付180000 · 情况2（合同人民币，net=20000）
  { id: 'GP014', gameId: '4010', pendingAmount: 200000, status: '未付款', applyTime: '2026-07-11 14:00:00', remark: '【情况2】合同人民币·net=20000', settlementIds: ['S009'] },
  // 4006 预付100000/历史95000 · 情况3（合同支付币种美金）
  { id: 'GP015', gameId: '4006', pendingAmount: 88200, status: '未付款', applyTime: '2026-07-12 15:45:00', remark: '【情况3】合同支付币种美金·usdNet=待付÷汇率−剩余5000', settlementIds: ['S028'] },
  // —— 结算函退款验收（未付款打开结算函实时计算；已付款读 letterSnapshot）——
  // 4001 · 收入两产品 + 退款连续月合并（2026.06-2026.07）· 预付全额抵扣实付=0
  { id: 'GP016', gameId: '4001', pendingAmount: 167900, status: '未付款', applyTime: '2026-07-13 10:00:00', remark: '【结算函·收入+退款·连续月合并】', settlementIds: ['S001', 'S002', 'S020', 'S029'] },
  // 4002 · 单产品收入+退款 · 预付全额抵扣
  { id: 'GP017', gameId: '4002', pendingAmount: 68800, status: '未付款', applyTime: '2026-07-13 11:00:00', remark: '【结算函·收入+退款·单产品】', settlementIds: ['S010', 'S031'] },
  // 4003 · 已付款快照 · 双月收入+退款 · 实付=0
  { id: 'GP018', gameId: '4003', pendingAmount: 80610.8, actualAmount: 0, status: '已付款', applyTime: '2026-07-08 14:00:00', payTime: '2026-07-18 10:00:00', payBank: '4399', receiptInfo: '幻境游戏工作室 6214567856785678', settlementLetter: '结算函_赛车狂飙.pdf', invoice: '电子发票_80610.pdf', settlementIds: ['S003', 'S017', 'S032'] },
  // 5003 · 快爆 · 收入+退款
  { id: 'GP019', gameId: '5003', pendingAmount: 37014.6, status: '未付款', applyTime: '2026-07-15 15:00:00', remark: '【结算函·快爆·收入+退款】', settlementIds: ['S303', 'S306'] },
  // 5001 · 收入+退款连续月合并
  { id: 'GP023', gameId: '5001', pendingAmount: 83050, status: '未付款', applyTime: '2026-07-16 10:00:00', remark: '【结算函·退款连续月2026.06-07】', settlementIds: ['S301', 'S033', 'S034'] },
  // 5004 · 无预付 · 退款后实付>0
  { id: 'GP022', gameId: '5004', pendingAmount: 41950, status: '未付款', applyTime: '2026-07-16 09:30:00', remark: '【结算函·无预付·退款后实付>0】', settlementIds: ['S305', 'S035'] },
];

function mockGetGameName(id: string): string {
  const g = INITIAL_GAMES.find((x) => x.id === id);
  return g?.onlineName ?? g?.name ?? id;
}

function enrichGamePayments(items: GamePaymentRequest[]): GamePaymentRequest[] {
  return items.map((p) => {
    const game = INITIAL_GAMES.find((g) => g.id === p.gameId);
    if (!game) return p;
    const vendor = INITIAL_VENDORS.find((v) => v.id === game.vendorId);
    if (!vendor) return p;
    const contract = INITIAL_CONTRACTS.find((c) => c.gameId === p.gameId);
    const scopedGamePayments = items.filter((x) => x.id !== p.id);
    const { applySnapshot, letterSnapshot } = buildGamePaymentApplySnapshot({
      gameId: p.gameId,
      pendingAmount: p.pendingAmount,
      applyTime: p.applyTime,
      settlementIds: p.settlementIds ?? [],
      game,
      vendor,
      contract,
      settlements: INITIAL_SETTLEMENTS,
      payments: RAW_PAYMENTS,
      gamePayments: scopedGamePayments,
      exchangeRates: INITIAL_EXCHANGE_RATES,
      games: INITIAL_GAMES,
      getGameName: mockGetGameName,
    });
    let next: GamePaymentRequest = {
      ...p,
      applySnapshot,
      letterSnapshot: p.letterSnapshot ?? letterSnapshot,
    };
    return next;
  });
}

function enrichPaidLetterSnapshots(items: PaymentRequest[]): PaymentRequest[] {
  return items.map((p) => {
    if (p.status !== '已付款') return p;
    const vendor = INITIAL_VENDORS.find((v) => v.id === p.vendorId);
    const paymentCurrency = vendor?.sharePaymentCurrency ?? '人民币';
    const letterPayAmountOverride = paymentCurrency === '美金'
      ? (p.actualAmountUsd ?? 0)
      : (p.actualAmount ?? p.pendingAmount);
    return {
      ...p,
      letterSnapshot: buildSettlementLetterSnapshot({
        vendorId: p.vendorId,
        paymentId: p.id,
        amount: p.pendingAmount,
        settlementIds: p.settlementIds,
        applyTime: p.applyTime,
        vendor,
        settlements: INITIAL_SETTLEMENTS,
        payments: RAW_PAYMENTS,
        gamePayments: RAW_GAME_PAYMENTS,
        exchangeRates: INITIAL_EXCHANGE_RATES,
        games: INITIAL_GAMES,
        getGameName: mockGetGameName,
        letterPayAmountOverride,
      }),
    };
  });
}

export const INITIAL_PAYMENTS = enrichPaidLetterSnapshots(RAW_PAYMENTS);
export const INITIAL_GAME_PAYMENTS = enrichGamePayments(RAW_GAME_PAYMENTS);

export const INITIAL_BALANCES: VendorBalance[] = deriveBalances(
  INITIAL_SETTLEMENTS, INITIAL_VENDORS, INITIAL_PAYMENTS,
);

export const INITIAL_GAME_BALANCES: GameBalance[] = deriveGameBalances(
  INITIAL_SETTLEMENTS, INITIAL_GAMES, INITIAL_GAME_PAYMENTS,
);

export const INITIAL_GAME_LOGS: GameOperationLog[] = [
  { id: 'GL000', gameId: '4001', operator: '张明', time: '2024-03-01 09:00:00', action: '添加游戏' },
  { id: 'GL001', gameId: '4001', operator: '张明', time: '2024-03-15 10:30:00', action: '运营状态', status: '已上线' },
  { id: 'GL004', gameId: '4001', operator: '张明', time: '2024-06-01 14:20:00', action: '合作状态', status: '合作中' },
  { id: 'GL005', gameId: '4001', operator: '张明', time: '2024-06-02 09:15:00', action: '合同变更', detail: '"已付游戏代理金"变更为"￥546.00"\n"已付预付分成款"变更为"-"' },
  { id: 'GL003', gameId: '4006', operator: '刘洋', time: '2024-09-01 11:00:00', action: '合作状态', status: '合作中' },
  { id: 'GL002', gameId: '4006', operator: '刘洋', time: '2024-09-05 11:00:00', action: '运营状态', status: '未上线' },
  { id: 'GL006', gameId: '4011', operator: '钱伟', time: '2025-11-01 10:00:00', action: '合作状态', status: '合作终止' },
  { id: 'GL007', gameId: '4011', operator: '钱伟', time: '2025-11-02 14:30:00', action: '运营状态', status: '未上线' },
  // 4012 农场物语：游戏管理批注验收样例（列表默认首行）
  { id: 'GL011', gameId: '4012', operator: '冯丽', time: '2024-09-01 13:00:00', action: '添加游戏' },
  { id: 'GL010', gameId: '4012', operator: '冯丽', time: '2024-09-06 10:30:00', action: '运营状态', status: '已上线' },
  { id: 'GL009', gameId: '4012', operator: '冯丽', time: '2024-09-12 14:00:00', action: '合作状态', status: '合作中' },
  { id: 'GL008', gameId: '4012', operator: '冯丽', time: '2024-10-15 09:20:00', action: '合同变更', detail: '"已付游戏代理金"变更为"￥40,000.00"\n"已付委托开发费"变更为"￥85,000.00"' },
];

export const INITIAL_FORMULA_LOGS: FormulaOperationLog[] = [
  { id: 'FL001', gameId: '4001', operator: '财务-王丽', time: '2024-03-01 09:00:00', formulaText: '内部渠道：待结算金额*（1-5%-0%）*50%\n外部渠道：待结算金额*（1-0%-0%）*45%' },
];

export { INTERNAL_CHANNELS, EXTERNAL_CHANNELS };

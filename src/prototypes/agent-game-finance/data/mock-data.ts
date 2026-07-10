import type {
  Contract,
  FormulaConfig,
  Game,
  GameOperationLog,
  FormulaOperationLog,
  PaymentRequest,
  SettlementRecord,
  Vendor,
  VendorBalance,
} from './types';
import { deriveBalances } from '../utils/balance';
import { resolveFollowInvoiceTax } from '../utils/invoiceTax';

export const INITIAL_VENDORS: Vendor[] = [
  { id: '1001', name: '星辉互动科技有限公司', contact: '张伟', phone: '13800138001', email: 'zhangwei@xinghui.com', address: '北京市朝阳区望京SOHO T3', invoiceInfo: '增值税专用发票（6%）', accountName: '星辉互动科技有限公司', bank: '中国工商银行', bankLocation: '北京市', branch: '朝阳支行', cardNumber: '6222 **** **** 1234' },
  { id: '1002', name: '幻境游戏工作室', contact: '李娜', phone: '13900139002', email: 'lina@huanjing.com', address: '上海市浦东新区张江高科技园区', invoiceInfo: '增值税专用发票（3%）', accountName: '幻境游戏工作室', bank: '招商银行', bankLocation: '上海市', branch: '张江支行', cardNumber: '6214 **** **** 5678' },
  { id: '1003', name: '雷霆网络科技', contact: '王强', phone: '13700137003', email: 'wangqiang@leiting.com', address: '深圳市南山区科技园南区', invoiceInfo: '增值税专用发票（6%）', accountName: '雷霆网络科技有限公司', bank: '建设银行', bankLocation: '广东省', branch: '科技园支行', cardNumber: '6227 **** **** 9012' },
  { id: '1004', name: '梦想互娱', contact: '陈静', phone: '13600136004', email: 'chenjing@mengxiang.com', address: '广州市天河区珠江新城', invoiceInfo: '增值税专用发票（6%）', accountName: '梦想互娱有限公司', bank: '农业银行', bankLocation: '广东省', branch: '天河支行', cardNumber: '6228 **** **** 3456' },
  { id: '1005', name: '像素工坊', contact: '刘洋', phone: '13500135005', email: 'liuyang@pixel.com', address: '杭州市西湖区文三路', invoiceInfo: '增值税专用发票（3%）', accountName: '像素工坊', bank: '中国银行', bankLocation: '浙江省', branch: '文三路支行', cardNumber: '6216 **** **** 7890' },
  { id: '1006', name: '云端游创', contact: '赵敏', phone: '13400134006', email: 'zhaomin@cloudgame.com', address: '成都市高新区天府大道', invoiceInfo: '增值税专用发票（6%）', accountName: '云端游创科技有限公司', bank: '交通银行', bankLocation: '四川省', branch: '天府支行', cardNumber: '6222 **** **** 2345' },
  { id: '1007', name: '灵动科技', contact: '孙涛', phone: '13300133007', email: 'suntao@lingdong.com', address: '武汉市洪山区光谷软件园', invoiceInfo: '增值税专用发票（3%）', accountName: '灵动科技有限公司', bank: '浦发银行', bankLocation: '湖北省', branch: '光谷支行', cardNumber: '6225 **** **** 6789' },
  { id: '1008', name: '极客游戏', contact: '周雪', phone: '13200132008', email: 'zhouxue@geekgame.com', address: '南京市鼓楼区新街口', invoiceInfo: '增值税专用发票（6%）', accountName: '极客游戏有限公司', bank: '民生银行', bankLocation: '江苏省', branch: '新街口支行', cardNumber: '6226 **** **** 0123' },
];

export const INITIAL_GAMES: Game[] = [
  { id: '4001', name: '星际探险', onlineName: '星际探险OL', vendorId: '1001', launchDate: '2024-03-15', manager: '张明', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4002', name: '魔法王国', onlineName: '魔法王国', vendorId: '1001', launchDate: '2024-06-20', manager: '李华', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4003', name: '赛车狂飙', onlineName: '赛车狂飙', vendorId: '1002', launchDate: '2024-01-10', manager: '王芳', license: '无', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4004', name: '塔防英雄', onlineName: '塔防英雄', vendorId: '1002', launchDate: '2024-08-05', manager: '赵强', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4005', name: '消消乐大师', onlineName: '消消乐大师', vendorId: '1003', launchDate: '2023-11-20', manager: '陈静', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4006', name: '武侠江湖', onlineName: '武侠江湖', vendorId: '1003', launchDate: '2024-09-01', manager: '刘洋', license: '有', operationStatus: '未上线', cooperationStatus: '合作中' },
  { id: '4007', name: '宠物乐园', onlineName: '宠物乐园', vendorId: '1004', launchDate: '2024-04-18', manager: '周敏', license: '无', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4008', name: '策略争霸', onlineName: '策略争霸', vendorId: '1004', launchDate: '2024-07-12', manager: '吴磊', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4009', name: '音乐节奏', onlineName: '音乐节奏', vendorId: '1005', launchDate: '2024-02-28', manager: '郑雪', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4010', name: '射击精英', onlineName: '射击精英', vendorId: '1006', launchDate: '2024-05-08', manager: '孙涛', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
  { id: '4011', name: '卡牌对决', onlineName: '卡牌对决', vendorId: '1007', launchDate: '2024-10-15', manager: '钱伟', license: '无', operationStatus: '未上线', cooperationStatus: '合作中' },
  { id: '4012', name: '农场物语', onlineName: '农场物语', vendorId: '1008', launchDate: '2024-03-22', manager: '冯丽', license: '有', operationStatus: '已上线', cooperationStatus: '合作中' },
];

export const INITIAL_CONTRACTS: Contract[] = INITIAL_GAMES.map((g, i) => ({
  gameId: g.id,
  prepayment: [500000, 300000, 200000, 400000, 600000, 350000, 150000, 450000, 250000, 380000, 100000, 280000][i],
  agencyPayment: [80000, 50000, 30000, 60000, 90000, 45000, 20000, 70000, 35000, 55000, 15000, 40000][i],
  developmentFee: [120000, 80000, 0, 100000, 150000, 90000, 60000, 110000, 70000, 95000, 0, 85000][i],
  contractDescription: ['标准代理合同，按月结算', '含独家代理条款', '', '委托开发+联运', ''][i % 5] ?? '',
  cooperationStatus: g.cooperationStatus,
}));

const INTERNAL_CHANNELS = [
  '快爆付费',
  'H5游戏',
  '快爆内购',
  '游戏盒付费',
  '游戏盒内购',
  '快爆小游戏广告',
  '49广告联盟',
];
const EXTERNAL_CHANNELS = ['纯游外放', '游乐IOS', '快爆游IOS', '49外放'];

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

export const INITIAL_FORMULAS: FormulaConfig[] = INITIAL_GAMES.map((g) => makeFormula(g.id, g.vendorId));

export const INITIAL_SETTLEMENTS: SettlementRecord[] = [
  { id: 'S001', type: 'external', incomeTime: '2025-05', gameId: '4001', channel: '纯游外放', grossRevenue: 128000, settlementAmount: 128000, settlementIncome: 57600, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-06-01 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S002', type: 'internal', incomeTime: '2025-05', gameId: '4001', channel: '快爆付费', grossRevenue: 256000, settlementAmount: 243200, settlementIncome: 121600, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-06-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S003', type: 'internal', incomeTime: '2025-05', gameId: '4003', channel: '快爆内购', grossRevenue: 89000, settlementAmount: 81559.6, settlementIncome: 40779.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2025-06-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1002' },
  { id: 'S004', type: 'external', incomeTime: '2025-05', gameId: '4005', channel: '游乐IOS', grossRevenue: 450000, settlementAmount: 450000, settlementIncome: 202500, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-06-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S005', type: 'internal', incomeTime: '2025-06', gameId: '4001', channel: '快爆付费', grossRevenue: 280000, settlementAmount: 266000, settlementIncome: 133000, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-07-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1001' },
  { id: 'S006', type: 'internal', incomeTime: '2025-06', gameId: '4007', channel: '游戏盒付费', grossRevenue: 65000, settlementAmount: 61750, settlementIncome: 30875, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-07-01 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1004' },
  { id: 'S007', type: 'refund', incomeTime: '2025-05', gameId: '4005', channel: '快爆内购', grossRevenue: 12000, settlementAmount: 11400, settlementIncome: 5700, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-06-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S010', type: 'internal', incomeTime: '2025-05', gameId: '4002', channel: '快爆付费', grossRevenue: 168000, settlementAmount: 159600, settlementIncome: 79800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-06-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S011', type: 'external', incomeTime: '2025-05', gameId: '4010', channel: '快爆游IOS', grossRevenue: 320000, settlementAmount: 320000, settlementIncome: 144000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-06-03 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1006' },
  { id: 'S012', type: 'internal', incomeTime: '2025-05', gameId: '4008', channel: '游戏盒付费', grossRevenue: 72000, settlementAmount: 68400, settlementIncome: 34200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-06-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1004' },
  { id: 'S013', type: 'internal', incomeTime: '2025-05', gameId: '4009', channel: '快爆内购', grossRevenue: 54000, settlementAmount: 49485.6, settlementIncome: 24742.8, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2025-06-04 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1005' },
  { id: 'S014', type: 'external', incomeTime: '2025-05', gameId: '4012', channel: '纯游外放', grossRevenue: 96000, settlementAmount: 96000, settlementIncome: 43200, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-06-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1008' },
  { id: 'S015', type: 'internal', incomeTime: '2025-06', gameId: '4002', channel: '快爆付费', grossRevenue: 192000, settlementAmount: 182400, settlementIncome: 91200, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-07-02 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1001' },
  { id: 'S016', type: 'external', incomeTime: '2025-06', gameId: '4005', channel: '游乐IOS', grossRevenue: 380000, settlementAmount: 380000, settlementIncome: 171000, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-07-02 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1003' },
  { id: 'S017', type: 'internal', incomeTime: '2025-06', gameId: '4003', channel: '快爆内购', grossRevenue: 105000, settlementAmount: 96222, settlementIncome: 48111, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2025-07-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1002' },
  { id: 'S018', type: 'internal', incomeTime: '2025-06', gameId: '4009', channel: '快爆付费', grossRevenue: 48000, settlementAmount: 43987.2, settlementIncome: 21993.6, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', settlementTime: '2025-07-03 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1005' },
  { id: 'S019', type: 'external', incomeTime: '2025-06', gameId: '4010', channel: '快爆游IOS', grossRevenue: 295000, settlementAmount: 295000, settlementIncome: 132750, formulaText: '外部：待结算金额*（1-0%-0%）*45%', settlementTime: '2025-07-04 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1006' },
  { id: 'S020', type: 'refund', incomeTime: '2025-06', gameId: '4001', channel: '快爆付费', grossRevenue: 8000, settlementAmount: 7600, settlementIncome: 3800, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-07-05 10:00:00', paymentApplyStatus: '已申请', settled: true, vendorId: '1001' },
  { id: 'S021', type: 'internal', incomeTime: '2025-06', gameId: '4012', channel: '游戏盒付费', grossRevenue: 58000, settlementAmount: 55100, settlementIncome: 27550, formulaText: '内部：待结算金额*（1-5%-0%）*50%', settlementTime: '2025-07-05 10:00:00', paymentApplyStatus: '未申请', settled: true, vendorId: '1008' },
  { id: 'S008', type: 'internal', incomeTime: '2025-06', gameId: '4003', channel: '快爆付费', grossRevenue: 52000, settlementAmount: 52000, settlementIncome: 0, formulaText: '内部：待结算金额*（1-5%-3.36%）*50%', paymentApplyStatus: '未申请', settled: false, vendorId: '1002' },
  { id: 'S009', type: 'external', incomeTime: '2025-06', gameId: '4010', channel: '快爆游IOS', grossRevenue: 88000, settlementAmount: 88000, settlementIncome: 0, formulaText: '外部：待结算金额*（1-0%-0%）*45%', paymentApplyStatus: '未申请', settled: false, vendorId: '1006' },
];

export const INITIAL_PAYMENTS: PaymentRequest[] = [
  { id: 'P001', vendorId: '1003', pendingAmount: 131625, actualAmount: 131625, status: '已付款', applyTime: '2025-06-10', payTime: '2025-06-20', payBank: '公司招商银行', receiptInfo: '雷霆网络科技 6227****9012' },
  { id: 'P002', vendorId: '1001', pendingAmount: 122240, status: '待付款', applyTime: '2025-07-05' },
];

export const INITIAL_BALANCES: VendorBalance[] = deriveBalances(
  INITIAL_SETTLEMENTS, INITIAL_VENDORS, INITIAL_CONTRACTS, INITIAL_GAMES, INITIAL_PAYMENTS,
);

export const INITIAL_GAME_LOGS: GameOperationLog[] = [
  { id: 'GL000', gameId: '4001', operator: '张明', time: '2024-03-01 09:00', action: '添加游戏' },
  { id: 'GL001', gameId: '4001', operator: '张明', time: '2024-03-15 10:30', action: '运营状态', status: '已上线' },
  { id: 'GL004', gameId: '4001', operator: '张明', time: '2024-06-01 14:20', action: '合作状态', status: '合作中' },
  { id: 'GL003', gameId: '4006', operator: '刘洋', time: '2024-09-01 11:00', action: '合作状态', status: '合作中' },
];

export const INITIAL_FORMULA_LOGS: FormulaOperationLog[] = [
  { id: 'FL001', gameId: '4001', operator: '财务-王丽', time: '2024-03-01 09:00', formulaText: '内部渠道：待结算金额*（1-5%-0%）*50%\n外部渠道：待结算金额*（1-0%-0%）*45%' },
];

export { INTERNAL_CHANNELS, EXTERNAL_CHANNELS };

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
  licenseFee: g.license === '有' ? [30000, 25000, 0, 35000, 40000, 32000, 0, 28000, 22000, 38000, 0, 26000][i] : 0,
  licensePayer: g.license === '有' ? (i % 2 === 0 ? '我方' : '厂商') : '-',
  operationStatus: g.operationStatus,
}));

const INTERNAL_CHANNELS = ['TapTap', '好游快爆', '4399', '小米游戏'];
const EXTERNAL_CHANNELS = ['Steam', 'Google Play', 'App Store'];

function makeFormula(gameId: string): FormulaConfig {
  return {
    gameId,
    internalTax: 0.06,
    internalChannelFee: 0.3,
    internalShare: 0.5,
    externalTax: 0.06,
    externalChannelFee: 0.25,
    externalShare: 0.45,
    invoiceMode: '跟随发票',
    channels: [
      ...INTERNAL_CHANNELS.map((name, i) => ({ id: `ic${i}`, name, type: 'internal' as const, enabled: i < 3, channelGameId: `${gameId}-IC${i + 1}` })),
      ...EXTERNAL_CHANNELS.map((name, i) => ({ id: `ec${i}`, name, type: 'external' as const, enabled: i < 2, channelGameId: `${gameId}-EC${i + 1}` })),
    ],
  };
}

export const INITIAL_FORMULAS: FormulaConfig[] = INITIAL_GAMES.map((g) => makeFormula(g.id));

export const INITIAL_SETTLEMENTS: SettlementRecord[] = [
  { id: 'S001', type: 'external', incomeTime: '2025-05', gameId: '4001', channel: 'Steam', grossRevenue: 128000, settlementAmount: 89600, settlementIncome: 40320, formulaText: '外部：收入×(1-6%-25%)×45%', settlementTime: '2025-06-01', paymentApplyStatus: '已提交', settled: true, vendorId: '1001' },
  { id: 'S002', type: 'internal', incomeTime: '2025-05', gameId: '4001', channel: 'TapTap', grossRevenue: 256000, settlementAmount: 163840, settlementIncome: 81920, formulaText: '内部：收入×(1-6%-30%)×50%', settlementTime: '2025-06-02', paymentApplyStatus: '已提交', settled: true, vendorId: '1001' },
  { id: 'S003', type: 'internal', incomeTime: '2025-05', gameId: '4003', channel: '好游快爆', grossRevenue: 89000, settlementAmount: 56960, settlementIncome: 28480, formulaText: '内部：收入×(1-6%-30%)×50%', settlementTime: '2025-06-02', paymentApplyStatus: '未提交', settled: true, vendorId: '1002' },
  { id: 'S004', type: 'external', incomeTime: '2025-05', gameId: '4005', channel: 'Google Play', grossRevenue: 450000, settlementAmount: 292500, settlementIncome: 131625, formulaText: '外部：收入×(1-6%-25%)×45%', settlementTime: '2025-06-03', paymentApplyStatus: '已提交', settled: true, vendorId: '1003' },
  { id: 'S005', type: 'internal', incomeTime: '2025-06', gameId: '4001', channel: 'TapTap', grossRevenue: 280000, settlementAmount: 179200, settlementIncome: 89600, formulaText: '内部：收入×(1-6%-30%)×50%', settlementTime: '2025-07-01', paymentApplyStatus: '未提交', settled: true, vendorId: '1001' },
  { id: 'S006', type: 'internal', incomeTime: '2025-06', gameId: '4007', channel: '4399', grossRevenue: 65000, settlementAmount: 41600, settlementIncome: 20800, formulaText: '内部：收入×(1-6%-30%)×50%', settlementTime: '2025-07-01', paymentApplyStatus: '未提交', settled: true, vendorId: '1004' },
  { id: 'S007', type: 'refund', incomeTime: '2025-05', gameId: '4005', channel: '好游快爆', grossRevenue: 12000, settlementAmount: 7680, settlementIncome: 3840, formulaText: '内部：收入×(1-6%-30%)×50%', settlementTime: '2025-06-05', paymentApplyStatus: '已提交', settled: true, vendorId: '1003' },
  { id: 'S008', type: 'internal', incomeTime: '2025-06', gameId: '4003', channel: 'TapTap', grossRevenue: 0, settlementAmount: 0, settlementIncome: 0, formulaText: '内部：收入×(1-6%-30%)×50%', paymentApplyStatus: '未提交', settled: false, vendorId: '1002' },
  { id: 'S009', type: 'external', incomeTime: '2025-06', gameId: '4010', channel: 'App Store', grossRevenue: 0, settlementAmount: 0, settlementIncome: 0, formulaText: '外部：收入×(1-6%-25%)×45%', paymentApplyStatus: '未提交', settled: false, vendorId: '1006' },
];

export const INITIAL_PAYMENTS: PaymentRequest[] = [
  { id: 'P001', vendorId: '1003', pendingAmount: 131625, actualAmount: 131625, status: '已付款', applyTime: '2025-06-10', payTime: '2025-06-20', payBank: '公司招商银行', receiptInfo: '雷霆网络科技 6227****9012' },
  { id: 'P002', vendorId: '1001', pendingAmount: 122240, status: '待付款', applyTime: '2025-07-05' },
];

export const INITIAL_BALANCES: VendorBalance[] = deriveBalances(
  INITIAL_SETTLEMENTS, INITIAL_VENDORS, INITIAL_CONTRACTS, INITIAL_GAMES, INITIAL_PAYMENTS,
);

export const INITIAL_GAME_LOGS: GameOperationLog[] = [
  { id: 'GL001', gameId: '4001', operator: '张明', time: '2024-03-15 10:30', field: '运营状态', from: '未上线', to: '已上线' },
  { id: 'GL002', gameId: '4006', operator: '刘洋', time: '2024-08-20 14:00', field: '运营状态', from: '未上线', to: '未上线' },
];

export const INITIAL_FORMULA_LOGS: FormulaOperationLog[] = [
  { id: 'FL001', gameId: '4001', operator: '财务-王丽', time: '2024-03-01 09:00', formulaText: '内部：收入×(1-6%-30%)×50%；外部：收入×(1-6%-25%)×45%' },
];

export { INTERNAL_CHANNELS, EXTERNAL_CHANNELS };

import { describe, expect, it } from 'vitest';
import type {
  Contract,
  Game,
  Vendor,
} from '../../src/prototypes/agent-game-finance/data/types';
import {
  getApplyGamePaymentBlock,
  getApplyGamePaymentBlockMessage,
} from '../../src/prototypes/agent-game-finance/utils/gamePaymentApply';

const vendor: Vendor = {
  id: '1001',
  businessType: '4399',
  name: '测试厂商',
  contact: '联系人',
  phone: '13800000000',
  email: 'test@example.com',
  address: '测试地址',
  invoiceInfo: '普通发票',
  accountName: '测试厂商',
  bank: '测试银行',
  bankLocation: '福建省',
  branch: '测试支行',
  cardNumber: '6222000000000000',
};

const game: Game = {
  id: '4001',
  name: '测试游戏',
  onlineName: '测试游戏',
  vendorId: vendor.id,
  launchDate: '2026-01-01',
  manager: '测试人员',
  license: '有',
  operationStatus: '已上线',
  cooperationStatus: '合作中',
  createdAt: '2026-01-01T00:00:00',
  hasPrepayment: false,
};

const contract: Contract = {
  gameId: game.id,
  contractNumber: 'HT-001',
  cooperationContents: [],
  supplementalNote: '',
  cooperationStatus: '合作中',
};

describe('getApplyGamePaymentBlock', () => {
  it('第三项校验拦截未填写付款币种', () => {
    const block = getApplyGamePaymentBlock(game.id, game, vendor, contract);
    expect(block).toEqual({ type: 'paymentCurrency' });
    expect(block && getApplyGamePaymentBlockMessage(block)).toBe('未填写付款币种');
  });

  it('付款币种已填写时通过前置校验', () => {
    const block = getApplyGamePaymentBlock(
      game.id,
      { ...game, sharePaymentCurrency: '人民币' },
      vendor,
      contract,
    );
    expect(block).toBeNull();
  });

  it('银行信息校验优先于付款币种', () => {
    const block = getApplyGamePaymentBlock(
      game.id,
      game,
      { ...vendor, cardNumber: '' },
      contract,
    );
    expect(block).toEqual({ type: 'bank' });
  });

  it('预付分成款校验优先于付款币种', () => {
    const block = getApplyGamePaymentBlock(
      game.id,
      { ...game, hasPrepayment: true },
      vendor,
      { ...contract, cooperationContents: ['预付分成款'] },
    );
    expect(block).toEqual({ type: 'prepayment', gameName: game.onlineName });
    expect(block && getApplyGamePaymentBlockMessage(block)).toBe('未补充预付分成款信息');
  });
});

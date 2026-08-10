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
};

const contract: Contract = {
  gameId: game.id,
  contractNumber: 'HT-001',
  cooperationContents: [],
  supplementalNote: '',
  cooperationStatus: '合作中',
};

describe('getApplyGamePaymentBlock', () => {
  it('第二项校验拦截付款设置任一信息未填写', () => {
    const block = getApplyGamePaymentBlock(game, vendor, contract);
    expect(block).toEqual({ type: 'paymentSettings' });
    expect(block && getApplyGamePaymentBlockMessage(block)).toBe('请先配置【付款设置】，完善付款信息');
  });

  it('付款设置三项均填写且合同不涉及预付时通过前置校验', () => {
    const block = getApplyGamePaymentBlock(
      {
        ...game,
        sharePaymentCompany: '4399',
        sharePaymentCurrency: '人民币',
        historicalDeduction: 0,
      },
      vendor,
      contract,
    );
    expect(block).toBeNull();
  });

  it('银行信息校验优先于付款币种', () => {
    const block = getApplyGamePaymentBlock(
      game,
      { ...vendor, cardNumber: '' },
      contract,
    );
    expect(block).toEqual({ type: 'bank' });
  });

  it('付款设置完整后，第三项校验拦截合同已勾选但已付预付未维护', () => {
    const block = getApplyGamePaymentBlock(
      {
        ...game,
        sharePaymentCompany: '4399',
        sharePaymentCurrency: '人民币',
        historicalDeduction: 0,
      },
      vendor,
      { ...contract, cooperationContents: ['预付分成款'] },
    );
    expect(block).toEqual({ type: 'prepayment' });
    expect(block && getApplyGamePaymentBlockMessage(block)).toBe('未补充预付分成款信息');
  });

  it('银行信息校验优先于付款设置和预付分成款', () => {
    const block = getApplyGamePaymentBlock(
      game,
      { ...vendor, cardNumber: '' },
      { ...contract, cooperationContents: ['预付分成款'] },
    );
    expect(block).toEqual({ type: 'bank' });
  });
});

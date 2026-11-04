import type { SharePaymentCompany } from '../data/types';

export interface SettlementPayerProfile {
  key: SharePaymentCompany;
  legalName: string;
  invoice: {
    item?: string;
    taxId: string;
    addressPhone: string;
    bankAccount: string;
  };
  contact: {
    recipient: string;
    phone: string;
    addressLabel: '地址' | '通信地址';
    address: string;
  };
  supportsEnglishDownload: boolean;
}

const COMMON_PHONE = '0592-3304399';
const HONG_KONG_ADDRESS = '香港新界区沙田火炭山尾街18-24号沙田商业中心16楼19室';

export const SETTLEMENT_PAYER_PROFILES: Record<SharePaymentCompany, SettlementPayerProfile> = {
  '4399': {
    key: '4399',
    legalName: '四三九九网络股份有限公司',
    invoice: {
      item: '生产生活服务*信息服务费',
      taxId: '9135020073786628XK',
      addressPhone: `厦门市厦门火炬高新区软件园二期望海路2号楼202室 ${COMMON_PHONE}`,
      bankAccount: '中国建设银行股份有限公司厦门市分行营业部 35101535001059664399',
    },
    contact: {
      recipient: '朱建婷',
      phone: COMMON_PHONE,
      addressLabel: '通信地址',
      address: '厦门市思明区软件园二期望海路2号楼',
    },
    supportsEnglishDownload: false,
  },
  '纯游': {
    key: '纯游',
    legalName: '厦门纯游互动科技有限公司',
    invoice: {
      item: '生产生活服务*信息服务费',
      taxId: '91350200302839581R',
      addressPhone: `厦门市软件园二期望海路2号楼301室A区 ${COMMON_PHONE}`,
      bankAccount: '中国建设银行厦门市分行营业部 35101535001052529532',
    },
    contact: {
      recipient: '张娟婷',
      phone: COMMON_PHONE,
      addressLabel: '地址',
      address: '福建省厦门市思明区望海路2号楼',
    },
    supportsEnglishDownload: false,
  },
  '纯游（美元）': {
    key: '纯游（美元）',
    legalName: '厦门纯游互动科技有限公司',
    invoice: {
      taxId: '91350200302839581R',
      addressPhone: `厦门市软件园二期望海路2号楼301室A区 ${COMMON_PHONE}`,
      bankAccount: '中国建设银行厦门市分行营业部 3515 01980 1010 0003 967',
    },
    contact: {
      recipient: '刘丽菲',
      phone: COMMON_PHONE,
      addressLabel: '地址',
      address: '厦门市软件园二期望海路2号楼301室A区',
    },
    supportsEnglishDownload: true,
  },
  '香港4399': {
    key: '香港4399',
    legalName: '四三九九网络有限公司',
    invoice: {
      taxId: '60169256',
      addressPhone: `${HONG_KONG_ADDRESS} ${COMMON_PHONE}`,
      bankAccount: '中国建设银行（亚洲）有限公司 846952577150',
    },
    contact: {
      recipient: '刘丽菲',
      phone: COMMON_PHONE,
      addressLabel: '通信地址',
      address: HONG_KONG_ADDRESS,
    },
    supportsEnglishDownload: true,
  },
  '游家时代': {
    key: '游家时代',
    legalName: '游家时代网络有限公司',
    invoice: {
      taxId: '72258924',
      addressPhone: `${HONG_KONG_ADDRESS} ${COMMON_PHONE}`,
      bankAccount: '中国银行（香港）有限公司 01259120598096',
    },
    contact: {
      recipient: '刘丽菲',
      phone: COMMON_PHONE,
      addressLabel: '通信地址',
      address: HONG_KONG_ADDRESS,
    },
    supportsEnglishDownload: true,
  },
};

export function resolveSettlementPayerProfile(
  value?: string,
): SettlementPayerProfile {
  if (value && value in SETTLEMENT_PAYER_PROFILES) {
    return SETTLEMENT_PAYER_PROFILES[value as SharePaymentCompany];
  }
  return SETTLEMENT_PAYER_PROFILES['4399'];
}

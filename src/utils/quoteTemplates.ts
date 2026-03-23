export type TemplateKind = "新能源" | "机动车" | "特种车";

export type QuoteItem = {
  id: string;
  name: string;
  enabled: boolean;
  deductibleRate: string;
  coverage: string | number;
  premium: number;
  editablePremium: boolean;
};

export type ExtraInsuranceRow = {
  clause: string;
  responsibility: string;
  amount: string;
};

export type QuoteTemplate = {
  kind: TemplateKind;
  insuredLabel: string;
  mainRateLabel: string;
  companyLine: string;
  reminder: string;
  includeCompulsoryPeriod: boolean;
  extraInsuranceTitle: string;
  extraInsurancePremium: number;
  extraInsuranceRows: ExtraInsuranceRow[];
  createItems: (params: {
    damageCoverage: number;
    thirdParty: number;
    driverCoverage: number;
    passengerCoverage: number;
    damagePremium: number;
    thirdPremium: number;
    driverPremium: number;
    passengerPremium: number;
    compulsoryPremium: number;
    taxPremium: number;
    medicalOutsideCoverage: number;
    medicalOutsidePremium: number;
  }) => QuoteItem[];
};

export const QUOTE_TEMPLATES: Record<TemplateKind, QuoteTemplate> = {
  新能源: {
    kind: "新能源",
    insuredLabel: "尊敬的",
    mainRateLabel: "M",
    companyLine: "中国人寿财产保险股份有限公司上海市南汇支公司",
    reminder:
      "【温馨提醒】:本报价单仅作为保费的初步计算，不具法律效应，所有条款以保险合同为准。",
    includeCompulsoryPeriod: false,
    extraInsuranceTitle: "驾乘安心(高医疗版)-30身故伤残+30医疗",
    extraInsurancePremium: 275,
    extraInsuranceRows: [
      {
        clause: "人身意外伤害保险(特定场景B)条款",
        responsibility: "意外身故",
        amount: "300000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景B)条款",
        responsibility: "意外伤害住院津贴",
        amount: "18000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景B)条款",
        responsibility: "意外伤残",
        amount: "300000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景B)条款",
        responsibility: "意外伤害医疗费用",
        amount: "300000.00元/份",
      },
      {
        clause: "意外伤害保险附加超龄人员保险条款",
        responsibility: "超龄人员",
        amount: "1518600.00元/份",
      },
      {
        clause: "意外伤害保险附加驾乘事故节假日限额翻倍保险条款",
        responsibility: "节假日驾乘意外身故、伤残",
        amount: "600000.00元/份",
      },
    ],
    createItems: (params) => [
      {
        id: "damage",
        name: "新能源汽车损失保险绝对免赔额0元",
        enabled: true,
        deductibleRate: "",
        coverage: params.damageCoverage,
        premium: params.damagePremium,
        editablePremium: true,
      },
      {
        id: "third",
        name: "新能源汽车第三者责任保险",
        enabled: true,
        deductibleRate: "",
        coverage: params.thirdParty * 10000,
        premium: params.thirdPremium,
        editablePremium: true,
      },
      {
        id: "driver",
        name: "新能源汽车车上人员责任保险-驾驶人",
        enabled: true,
        deductibleRate: "",
        coverage: params.driverCoverage * 10000,
        premium: params.driverPremium,
        editablePremium: true,
      },
      {
        id: "passenger",
        name: "新能源汽车车上人员责任保险-乘客",
        enabled: true,
        deductibleRate: "",
        coverage: `${params.passengerCoverage * 10000}.00座/2座`,
        premium: params.passengerPremium,
        editablePremium: true,
      },
      {
        id: "road-rescue",
        name: "附加新能源汽车道路救援服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "2次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "safety-check",
        name: "附加新能源汽车车辆安全检测特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "1次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "chauffeur",
        name: "附加新能源汽车代为驾驶服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "1次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "inspection",
        name: "附加新能源汽车代为送检服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "/",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "medical-outside",
        name: "附加医保外医疗费用责任险(新能源汽车第三者责任保险)",
        enabled: true,
        deductibleRate: "",
        coverage: params.medicalOutsideCoverage,
        premium: params.medicalOutsidePremium,
        editablePremium: true,
      },
      {
        id: "compulsory",
        name: "机动车交通事故强制责任保险",
        enabled: true,
        deductibleRate: "/",
        coverage: 200000,
        premium: params.compulsoryPremium,
        editablePremium: true,
      },
      {
        id: "tax",
        name: "车船税",
        enabled: true,
        deductibleRate: "免征",
        coverage: "当年应缴+往年补缴+滞纳金",
        premium: params.taxPremium,
        editablePremium: true,
      },
    ],
  },
  机动车: {
    kind: "机动车",
    insuredLabel: "尊敬的",
    mainRateLabel: "K",
    companyLine: "中国人寿财产保险股份有限公司上海市南汇支公司",
    reminder:
      "【温馨提醒】:本报价单仅作为保费的初步计算，不具法律效应，所有条款以保险合同为准。",
    includeCompulsoryPeriod: true,
    extraInsuranceTitle: "驾乘安心(货车司机版)-30身故伤残+30医疗",
    extraInsurancePremium: 760,
    extraInsuranceRows: [
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外身故",
        amount: "200000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤害住院津贴",
        amount: "15000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤残",
        amount: "200000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤害医疗费用",
        amount: "200000.00元/份",
      },
      {
        clause: "意外伤害保险附加超龄人员保险条款",
        responsibility: "超龄人员",
        amount: "1018600.00元/份",
      },
      {
        clause: "意外伤害保险附加驾乘事故节假日限额翻倍保险条款",
        responsibility: "节假日驾乘意外身故、伤残",
        amount: "300000.00元/份",
      },
    ],
    createItems: (params) => [
      {
        id: "damage",
        name: "机动车损失保险绝对免赔额0元",
        enabled: true,
        deductibleRate: "",
        coverage: params.damageCoverage,
        premium: params.damagePremium,
        editablePremium: true,
      },
      {
        id: "third",
        name: "机动车第三者责任保险",
        enabled: true,
        deductibleRate: "",
        coverage: params.thirdParty * 10000,
        premium: params.thirdPremium,
        editablePremium: true,
      },
      {
        id: "driver",
        name: "机动车上人员责任保险-驾驶人",
        enabled: true,
        deductibleRate: "",
        coverage: params.driverCoverage * 10000,
        premium: params.driverPremium,
        editablePremium: true,
      },
      {
        id: "passenger",
        name: "机动车车上人员责任保险-乘客",
        enabled: true,
        deductibleRate: "",
        coverage: `${params.passengerCoverage * 10000}.00座/1座`,
        premium: params.passengerPremium,
        editablePremium: true,
      },
      {
        id: "road-rescue",
        name: "机动车道路救援服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "2次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "safety-check",
        name: "附加机动车辆安全检测特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "1次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "chauffeur",
        name: "附加机动车代为驾驶服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "1次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "inspection",
        name: "附加机动车代为送检服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "/",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "medical-outside",
        name: "附加医保外医疗费用责任险(机动车第三者责任保险)",
        enabled: true,
        deductibleRate: "",
        coverage: params.medicalOutsideCoverage,
        premium: params.medicalOutsidePremium,
        editablePremium: true,
      },
      {
        id: "compulsory",
        name: "机动车交通事故强制责任保险",
        enabled: true,
        deductibleRate: "/",
        coverage: 200000,
        premium: params.compulsoryPremium,
        editablePremium: true,
      },
      {
        id: "tax",
        name: "车船税",
        enabled: true,
        deductibleRate: "/",
        coverage: "当年应缴+往年补缴+滞纳金",
        premium: params.taxPremium,
        editablePremium: true,
      },
    ],
  },
  特种车: {
    kind: "特种车",
    insuredLabel: "尊敬的",
    mainRateLabel: "K",
    companyLine: "中国人寿财产保险股份有限公司上海市南汇支公司",
    reminder:
      "【温馨提醒】:本报价单仅作为保费的初步计算，不具法律效应，所有条款以保险合同为准。",
    includeCompulsoryPeriod: true,
    extraInsuranceTitle: "驾乘安心(高医疗版)-30身故伤残+30医疗",
    extraInsurancePremium: 365,
    extraInsuranceRows: [
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外身故",
        amount: "200000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤害住院津贴",
        amount: "18000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤残",
        amount: "150000.00元/份",
      },
      {
        clause: "人身意外伤害保险(特定场景C)条款",
        responsibility: "意外伤害医疗费用",
        amount: "150000.00元/份",
      },
      {
        clause: "意外伤害保险附加超龄人员保险条款",
        responsibility: "超龄人员",
        amount: "101860.00元/份",
      },
      {
        clause: "意外伤害保险附加驾乘事故节假日限额翻倍保险条款",
        responsibility: "节假日驾乘意外身故、伤残",
        amount: "420000.00元/份",
      },
    ],
    createItems: (params) => [
      {
        id: "damage",
        name: "特种车损失保险绝对免赔额0元",
        enabled: true,
        deductibleRate: "",
        coverage: params.damageCoverage,
        premium: params.damagePremium,
        editablePremium: true,
      },
      {
        id: "third",
        name: "特种车第三者责任保险",
        enabled: true,
        deductibleRate: "",
        coverage: params.thirdParty * 10000,
        premium: params.thirdPremium,
        editablePremium: true,
      },
      {
        id: "driver",
        name: "特种车车上人员责任保险-驾驶人",
        enabled: true,
        deductibleRate: "",
        coverage: params.driverCoverage * 10000,
        premium: params.driverPremium,
        editablePremium: true,
      },
      {
        id: "passenger",
        name: "特种车车上人员责任保险-乘客",
        enabled: true,
        deductibleRate: "",
        coverage: `${params.passengerCoverage * 10000}.00座/2座`,
        premium: params.passengerPremium,
        editablePremium: true,
      },
      {
        id: "road-rescue",
        name: "特种车道路救援服务特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "2次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "safety-check",
        name: "附加特种车辆安全检测特约条款",
        enabled: true,
        deductibleRate: "",
        coverage: "1次",
        premium: 0,
        editablePremium: false,
      },
      {
        id: "compulsory",
        name: "机动车交通事故强制责任保险",
        enabled: true,
        deductibleRate: "/",
        coverage: 200000,
        premium: params.compulsoryPremium,
        editablePremium: true,
      },
      {
        id: "tax",
        name: "车船税",
        enabled: true,
        deductibleRate: "/",
        coverage: "当年应缴+往年补缴+滞纳金",
        premium: params.taxPremium,
        editablePremium: true,
      },
    ],
  },
};

export function detectTemplateKind(input: {
  vehicleType?: string;
  brandModel?: string;
  energyType?: string;
  templateType?: string;
}): TemplateKind {
  const text = [
    input.templateType,
    input.vehicleType,
    input.brandModel,
    input.energyType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("新能源") ||
    text.includes("纯电") ||
    text.includes("插电") ||
    text.includes("增程") ||
    text.includes("electric")
  ) {
    return "新能源";
  }

  if (
    text.includes("特种") ||
    text.includes("专项作业") ||
    text.includes("清障") ||
    text.includes("起重") ||
    text.includes("随车吊") ||
    text.includes("洒水") ||
    text.includes("救援")
  ) {
    return "特种车";
  }

  return "机动车";
}

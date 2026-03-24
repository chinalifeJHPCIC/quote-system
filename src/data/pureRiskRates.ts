export type ProvinceName =
  | "北京"
  | "天津"
  | "河北"
  | "山西"
  | "内蒙古"
  | "辽宁"
  | "吉林"
  | "黑龙江"
  | "上海"
  | "江苏"
  | "浙江"
  | "安徽"
  | "福建"
  | "江西"
  | "山东"
  | "河南"
  | "湖北"
  | "湖南"
  | "广东"
  | "广西"
  | "海南"
  | "重庆"
  | "四川"
  | "贵州"
  | "云南"
  | "西藏"
  | "陕西"
  | "甘肃"
  | "青海"
  | "宁夏"
  | "新疆";

export type TruckUsageType = "营业" | "非营业";
export type TruckWeightClass = "2吨以下";

export type PureRiskRateItem = {
  thirdParty100: number | null;
  driverRate: number | null;
  estimateRate: number | null;
};

export type ProvincePureRiskRates = Record<
  TruckUsageType,
  Record<TruckWeightClass, PureRiskRateItem>
>;

function createEmptyProvinceConfig(): ProvincePureRiskRates {
  return {
    营业: {
      "2吨以下": {
        thirdParty100: null,
        driverRate: null,
        estimateRate: null,
      },
    },
    非营业: {
      "2吨以下": {
        thirdParty100: null,
        driverRate: null,
        estimateRate: null,
      },
    },
  };
}

export const PROVINCES: ProvinceName[] = [
  "北京",
  "天津",
  "河北",
  "山西",
  "内蒙古",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆",
];

export const PURE_RISK_RATES: Record<ProvinceName, ProvincePureRiskRates> =
  PROVINCES.reduce(
    (acc, province) => {
      acc[province] = createEmptyProvinceConfig();
      return acc;
    },
    {} as Record<ProvinceName, ProvincePureRiskRates>,
  );

PURE_RISK_RATES.河北 = {
  营业: {
    "2吨以下": {
      thirdParty100: 2742.44,
      driverRate: 0.005618,
      estimateRate: null,
    },
  },
  非营业: {
    "2吨以下": {
      thirdParty100: 876.27,
      driverRate: 0.002432,
      estimateRate: null,
    },
  },
};

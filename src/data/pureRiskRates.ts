import {
  TRUCK_PURE_RISK_RATES,
  type RegionCode,
} from "./truckPureRiskRatesNationwide";

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
export type TruckWeightClass =
  | "2吨以下"
  | "2-5吨"
  | "5-10吨"
  | "10吨以上"
  | "低速载货汽车";

export type PureRiskRateItem = {
  thirdParty100: number | null;
  driverRate: number | null;
  estimateRate: number | null;
};

export type ProvincePureRiskRates = Record<
  TruckUsageType,
  Record<TruckWeightClass, PureRiskRateItem>
>;

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

const PROVINCE_TO_REGION_CODE: Record<ProvinceName, RegionCode> = {
  北京: "BJ",
  天津: "TJ",
  河北: "HE",
  山西: "SX",
  内蒙古: "NM",
  辽宁: "LN",
  吉林: "JL",
  黑龙江: "HL",
  上海: "SH",
  江苏: "JS",
  浙江: "ZJ",
  安徽: "AH",
  福建: "FJ",
  江西: "JX",
  山东: "SD",
  河南: "HA",
  湖北: "HB",
  湖南: "HN",
  广东: "GD",
  广西: "GX",
  海南: "HI",
  重庆: "CQ",
  四川: "SC",
  贵州: "GZ",
  云南: "YN",
  西藏: "XZ",
  陕西: "SN",
  甘肃: "GS",
  青海: "QH",
  宁夏: "NX",
  新疆: "XJ",
};

const TRUCK_WEIGHT_CLASSES: TruckWeightClass[] = [
  "2吨以下",
  "2-5吨",
  "5-10吨",
  "10吨以上",
  "低速载货汽车",
];

export const PURE_RISK_RATES: Record<ProvinceName, ProvincePureRiskRates> =
  PROVINCES.reduce(
    (provinceAcc, province) => {
      const regionCode = PROVINCE_TO_REGION_CODE[province];
      const sourceRegion = TRUCK_PURE_RISK_RATES[regionCode];

      provinceAcc[province] = {
        营业: TRUCK_WEIGHT_CLASSES.reduce(
          (weightAcc, weightClass) => {
            const row = sourceRegion.truck.business[weightClass];
            weightAcc[weightClass] = {
              thirdParty100: row?.thirdParty[1000000] ?? null,
              driverRate: row?.driverRate ?? null,
              estimateRate: null,
            };
            return weightAcc;
          },
          {} as Record<TruckWeightClass, PureRiskRateItem>,
        ),
        非营业: TRUCK_WEIGHT_CLASSES.reduce(
          (weightAcc, weightClass) => {
            const row = sourceRegion.truck.non_business[weightClass];
            weightAcc[weightClass] = {
              thirdParty100: row?.thirdParty[1000000] ?? null,
              driverRate: row?.driverRate ?? null,
              estimateRate: null,
            };
            return weightAcc;
          },
          {} as Record<TruckWeightClass, PureRiskRateItem>,
        ),
      };

      return provinceAcc;
    },
    {} as Record<ProvinceName, ProvincePureRiskRates>,
  );

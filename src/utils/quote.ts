import {
  PURE_RISK_RATES,
  type ProvinceName,
  type PureRiskRateItem,
  type TruckUsageType,
  type TruckWeightClass,
} from "../data/pureRiskRates";

const DEFAULT_DAMAGE_ESTIMATE_RATE = 0.02;
const DEFAULT_COMPULSORY_BASE_PREMIUM = 4480;

export type PureRiskConfigParams = {
  province: ProvinceName;
  usageType: TruckUsageType;
  weightClass: TruckWeightClass;
};

export type TruckQuoteInput = PureRiskConfigParams & {
  vehiclePrice: number;
  thirdPartyLimit: number;
  driverLimit: number;
  damageManualPremium?: number | null;
  adjustmentFactor: number;
  expenseRate: number;
  compulsoryBasePremium?: number;
  compulsoryClaims?: number;
  hasDeathClaim?: boolean;
};

export type TruckQuoteResult = {
  compulsory: number;
  damage: number;
  third: number;
  driver: number;
  total: number;
  warnings: string[];
  estimateRate: number;
  pureRiskConfig: PureRiskRateItem;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function clampExpenseRate(expenseRate: number) {
  if (!Number.isFinite(expenseRate)) return 0;
  if (expenseRate < 0) return 0;
  if (expenseRate >= 1) return 0.99;
  return expenseRate;
}

function normalizePositiveNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export function getPureRiskConfig(params: PureRiskConfigParams) {
  return PURE_RISK_RATES[params.province][params.usageType][params.weightClass];
}

export function getCompulsoryPremium(params?: {
  basePremium?: number;
  compulsoryClaims?: number;
  hasDeathClaim?: boolean;
}) {
  const basePremium = normalizePositiveNumber(
    params?.basePremium ?? DEFAULT_COMPULSORY_BASE_PREMIUM,
    DEFAULT_COMPULSORY_BASE_PREMIUM,
  );
  const compulsoryClaims = Math.max(0, Math.trunc(params?.compulsoryClaims ?? 0));

  let premium = basePremium;

  if (params?.hasDeathClaim) premium *= 1.3;
  else if (compulsoryClaims >= 2) premium *= 1.1;
  else if (compulsoryClaims === 0) premium *= 0.9;

  return roundCurrency(premium);
}

export function calculateTruckQuote(input: TruckQuoteInput): TruckQuoteResult {
  const warnings: string[] = [];
  const config = getPureRiskConfig(input);
  const expenseRate = clampExpenseRate(input.expenseRate);
  const adjustmentFactor = normalizePositiveNumber(input.adjustmentFactor, 1);
  const denominator = 1 - expenseRate;

  let third = 0;
  if (config.thirdParty100 == null) {
    warnings.push(
      `${input.province}${input.usageType}${input.weightClass}三者100万纯风险数据缺失`,
    );
  } else {
    const limitFactor = normalizePositiveNumber(input.thirdPartyLimit, 0) / 100;
    const basePremium = config.thirdParty100 * limitFactor;
    third = roundCurrency((basePremium / denominator) * adjustmentFactor);
  }

  let driver = 0;
  if (config.driverRate == null) {
    warnings.push(
      `${input.province}${input.usageType}${input.weightClass}司机费率数据缺失`,
    );
  } else {
    const driverLimit = normalizePositiveNumber(input.driverLimit, 0);
    driver = roundCurrency(
      ((driverLimit * config.driverRate) / denominator) * adjustmentFactor,
    );
  }

  const estimateRate =
    config.estimateRate ?? DEFAULT_DAMAGE_ESTIMATE_RATE;

  let damage = 0;
  const manualDamagePremium = normalizePositiveNumber(
    input.damageManualPremium ?? 0,
    0,
  );
  if (manualDamagePremium > 0) {
    damage = roundCurrency(manualDamagePremium);
  } else {
    const vehiclePrice = normalizePositiveNumber(input.vehiclePrice, 0);
    damage = roundCurrency(vehiclePrice * estimateRate);
    warnings.push("车损使用估算费率，非车型库精确值");
  }

  const compulsory = getCompulsoryPremium({
    basePremium: input.compulsoryBasePremium,
    compulsoryClaims: input.compulsoryClaims,
    hasDeathClaim: input.hasDeathClaim,
  });

  const total = roundCurrency(compulsory + damage + third + driver);

  return {
    compulsory,
    damage,
    third,
    driver,
    total,
    warnings,
    estimateRate,
    pureRiskConfig: config,
  };
}

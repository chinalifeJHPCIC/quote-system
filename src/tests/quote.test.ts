import { describe, expect, it } from "vitest";
import { getCompulsoryPremium, getPureRiskConfig, calculateTruckQuote } from "../utils/quote";

describe("truck quote module", () => {
  it("returns Hebei pure risk config for business trucks under 2 tons", () => {
    const config = getPureRiskConfig({
      province: "河北",
      usageType: "营业",
      weightClass: "2吨以下",
    });

    expect(config.thirdParty100).toBe(2742.44);
    expect(config.driverRate).toBe(0.005618);
  });

  it("calculates Hebei business truck quote with manual damage premium", () => {
    const result = calculateTruckQuote({
      province: "河北",
      usageType: "营业",
      weightClass: "2吨以下",
      vehiclePrice: 220000,
      thirdPartyLimit: 100,
      driverLimit: 100000,
      damageManualPremium: 3000,
      adjustmentFactor: 1,
      expenseRate: 0.25,
      compulsoryClaims: 1,
      hasDeathClaim: false,
    });

    expect(result.compulsory).toBe(4480);
    expect(result.damage).toBe(3000);
    expect(result.third).toBe(3656.59);
    expect(result.driver).toBe(749.07);
    expect(result.total).toBe(11885.66);
    expect(result.warnings).toHaveLength(0);
  });

  it("uses official Beijing rates and still warns only for estimated damage", () => {
    const result = calculateTruckQuote({
      province: "北京",
      usageType: "营业",
      weightClass: "2吨以下",
      vehiclePrice: 200000,
      thirdPartyLimit: 100,
      driverLimit: 100000,
      damageManualPremium: 0,
      adjustmentFactor: 1,
      expenseRate: 0.25,
    });

    expect(result.damage).toBe(4000);
    expect(result.third).toBe(5077.67);
    expect(result.driver).toBe(678.67);
    expect(result.compulsory).toBe(4032);
    expect(result.warnings).toContain("车损使用估算费率，非车型库精确值");
    expect(result.warnings).toHaveLength(1);
  });

  it("applies compulsory premium adjustments", () => {
    expect(getCompulsoryPremium({ compulsoryClaims: 0 })).toBe(4032);
    expect(getCompulsoryPremium({ compulsoryClaims: 2 })).toBe(4928);
    expect(getCompulsoryPremium({ hasDeathClaim: true })).toBe(5824);
  });
});

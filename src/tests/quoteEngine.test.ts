import { describe, expect, it } from "vitest";
import { calculateQuote } from "../utils/quoteEngine";

describe("quoteEngine", () => {
  it("should calculate basic quote correctly", () => {
    const result = calculateQuote({
      vehicleType: "truck_heavy",
      isCommercial: true,
      vehiclePrice: 350000,
      damageCoverage: 224000,
      thirdParty: 100,
      driverCoverage: 10,
      passengerCoverage: 10,
      lastYearClaims: 1,
      hasDeathClaim: false,
    });

    expect(result.damage).toBeGreaterThan(0);
    expect(result.third).toBe(11043);
    expect(result.total).toBeGreaterThan(10000);
  });

  it("should apply no-claim discount", () => {
    const result = calculateQuote({
      vehicleType: "truck_heavy",
      isCommercial: true,
      vehiclePrice: 350000,
      damageCoverage: 224000,
      thirdParty: 100,
      driverCoverage: 10,
      passengerCoverage: 10,
      lastYearClaims: 0,
      hasDeathClaim: false,
    });

    expect(result.commercial).toBeLessThan(20000);
  });

  it("should increase premium when many claims", () => {
    const result = calculateQuote({
      vehicleType: "truck_heavy",
      isCommercial: true,
      vehiclePrice: 350000,
      damageCoverage: 224000,
      thirdParty: 100,
      driverCoverage: 10,
      passengerCoverage: 10,
      lastYearClaims: 3,
      hasDeathClaim: false,
    });

    expect(result.commercial).toBeGreaterThan(20000);
  });
});

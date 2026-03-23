export interface QuoteInput {
  vehicleType: string;
  isCommercial: boolean;
  vehiclePrice: number;
  damageCoverage: number;
  thirdParty: number;
  driverCoverage: number;
  passengerCoverage: number;
  lastYearClaims: number;
  hasDeathClaim: boolean;
}

export interface QuoteResult {
  damage: number;
  third: number;
  driver: number;
  passenger: number;
  compulsory: number;
  commercial: number;
  total: number;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const damage = Math.round(input.damageCoverage * 0.0228 + 1947);

  let third = 0;
  if (input.thirdParty === 100) third = 11043;
  if (input.thirdParty === 50) third = 6745;

  const driver = Math.round(input.driverCoverage * 2.5);
  const passenger = Math.round(input.passengerCoverage * 3);

  let compulsory = 4480;
  if (input.hasDeathClaim) compulsory *= 1.3;
  else if (input.lastYearClaims >= 2) compulsory *= 1.1;
  else if (input.lastYearClaims === 0) compulsory *= 0.9;

  let coef = 1;
  if (input.lastYearClaims === 0) coef = 0.85;
  else if (input.lastYearClaims === 1) coef = 1;
  else if (input.lastYearClaims === 2) coef = 1.2;
  else if (input.lastYearClaims >= 3) coef = 1.4;

  const commercial = Math.round((damage + third + driver + passenger) * coef);

  return {
    damage,
    third,
    driver,
    passenger,
    compulsory: Math.round(compulsory),
    commercial,
    total: commercial + Math.round(compulsory),
  };
}

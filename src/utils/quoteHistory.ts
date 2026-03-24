import type {
  ProvinceName,
  TruckUsageType,
  TruckWeightClass,
} from "../data/pureRiskRates";
import type { QuoteItem, TemplateKind } from "./quoteTemplates";

export const QUOTE_HISTORY_KEY = "quote-system-history";
export const QUOTE_HISTORY_RESTORE_KEY = "quote-system-history-restore";
export const HISTORY_LIMIT = 12;

export type QuoteFormState = {
  quoteDate: string;
  quoteDateInput: string;
  plate: string;
  insuredName: string;
  companyName: string;
  brandModel: string;
  vehicleType: string;
  energyType: string;
  firstRegistrationDate: string;
  usageNature: string;
  approvedPassengers: string;
  approvedLoad: string;
  engineNumber: string;
  vin: string;
  invoiceAmount: string;
  province: ProvinceName;
  usageType: TruckUsageType;
  weightClass: TruckWeightClass;
  thirdPartyLimit: number;
  driverLimit: number;
  damageManualPremium: number;
  adjustmentFactor: number;
  expenseRate: number;
  extraInsurancePremium: number;
  damageCoverage: number;
  thirdParty: number;
  driver: number;
  passenger: number;
  claims: number;
  death: boolean;
  compulsoryClaims: number;
  continuousYears: string;
  continuousClaims: string;
  compulsoryStart: string;
  compulsoryEnd: string;
  showCompulsoryPeriod: boolean;
  commercialStart: string;
  commercialEnd: string;
  showCommercialPeriod: boolean;
  taxPremium: number;
  medicalOutsideCoverage: number;
  medicalOutsidePremium: number;
};

export type QuoteHistoryEntry = {
  id: string;
  createdAt: string;
  templateKind: TemplateKind;
  form: QuoteFormState;
  items: QuoteItem[];
};

export function readQuoteHistory(): QuoteHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(QUOTE_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuoteHistoryEntry[];
  } catch {
    return [];
  }
}

export function writeQuoteHistory(entries: QuoteHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(entries));
}

export function saveHistoryEntry(entry: QuoteHistoryEntry) {
  const nextHistory = [entry, ...readQuoteHistory()].slice(0, HISTORY_LIMIT);
  writeQuoteHistory(nextHistory);
  return nextHistory;
}

export function saveHistoryRestoreEntry(entry: QuoteHistoryEntry) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUOTE_HISTORY_RESTORE_KEY, JSON.stringify(entry));
}

export function readHistoryRestoreEntry(): QuoteHistoryEntry | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(QUOTE_HISTORY_RESTORE_KEY);
    return raw ? (JSON.parse(raw) as QuoteHistoryEntry) : null;
  } catch {
    return null;
  }
}

export function clearHistoryRestoreEntry() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUOTE_HISTORY_RESTORE_KEY);
}

export function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

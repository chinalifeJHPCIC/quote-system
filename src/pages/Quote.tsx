import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import excelLogo from "../assets/excel-logo.png";
import {
  readRecognizedDocument,
  recognize,
  saveRecognizedDocument,
  type RecognizedDocument,
} from "../utils/ocr";
import { generateInsurancePDF } from "../utils/pdfGenerator";
import { PROVINCES, type ProvinceName, type TruckUsageType } from "../data/pureRiskRates";
import {
  detectTemplateKind,
  QUOTE_TEMPLATES,
  type QuoteItem,
  type TemplateKind,
} from "../utils/quoteTemplates";
import { calculateTruckQuote } from "../utils/quote";

const QUOTE_HISTORY_KEY = "quote-system-history";
const HISTORY_LIMIT = 12;

type QuoteFormState = {
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
  commercialStart: string;
  commercialEnd: string;
  taxPremium: number;
  medicalOutsideCoverage: number;
  medicalOutsidePremium: number;
};

type QuoteHistoryEntry = {
  id: string;
  createdAt: string;
  templateKind: TemplateKind;
  form: QuoteFormState;
  items: QuoteItem[];
};

const initialForm: QuoteFormState = {
  quoteDate: new Date().toISOString().slice(0, 10),
  quoteDateInput: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
  plate: "",
  insuredName: "",
  companyName: "",
  brandModel: "",
  vehicleType: "",
  energyType: "",
  firstRegistrationDate: "",
  usageNature: "货运",
  approvedPassengers: "2",
  approvedLoad: "40000",
  engineNumber: "",
  vin: "",
  invoiceAmount: "",
  province: "河北",
  usageType: "营业",
  thirdPartyLimit: 100,
  driverLimit: 100000,
  damageManualPremium: 0,
  adjustmentFactor: 1,
  expenseRate: 0.25,
  extraInsurancePremium: QUOTE_TEMPLATES["机动车"].extraInsurancePremium,
  damageCoverage: 224000,
  thirdParty: 100,
  driver: 10,
  passenger: 10,
  claims: 0,
  death: false,
  compulsoryClaims: 0,
  continuousYears: "",
  continuousClaims: "",
  compulsoryStart: "",
  compulsoryEnd: "",
  commercialStart: "",
  commercialEnd: "",
  taxPremium: 0,
  medicalOutsideCoverage: 500000,
  medicalOutsidePremium: 400,
};

const TEMPLATE_TABS: TemplateKind[] = ["机动车", "新能源", "特种车"];

function toDateTimeLabel(start: string, end: string) {
  if (!start || !end) return "";
  return `  自 ${formatCompactDate(start)}00时00分起 至 ${formatCompactDate(end)}23时59分 止`;
}

function getVehiclePremiumTotal(items: QuoteItem[]) {
  return items
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + item.premium, 0);
}

function getCommercialPremiumTotal(items: QuoteItem[]) {
  return items
    .filter(
      (item) =>
        item.enabled && item.id !== "compulsory" && item.id !== "tax",
    )
    .reduce((sum, item) => sum + item.premium, 0);
}

function buildQuoteItems(form: QuoteFormState, templateKind: TemplateKind) {
  const vehiclePrice =
    Number(form.invoiceAmount.replace(/[^\d.]/g, "")) ||
    Number(form.damageCoverage) ||
    0;
  const result = calculateTruckQuote({
    province: form.province,
    usageType: form.usageType,
    weightClass: "2吨以下",
    vehiclePrice,
    thirdPartyLimit: form.thirdPartyLimit,
    driverLimit: form.driverLimit,
    damageManualPremium: form.damageManualPremium,
    adjustmentFactor: form.adjustmentFactor,
    expenseRate: form.expenseRate,
    compulsoryClaims: form.compulsoryClaims,
    hasDeathClaim: form.death,
  });

  const template = QUOTE_TEMPLATES[templateKind];

  return template.createItems({
    damageCoverage: form.damageCoverage,
    thirdParty: form.thirdPartyLimit,
    driverCoverage: Math.round(form.driverLimit / 10000),
    passengerCoverage: form.passenger,
    damagePremium: result.damage,
    thirdPremium: result.third,
    driverPremium: result.driver,
    passengerPremium: 0,
    compulsoryPremium: result.compulsory,
    taxPremium: form.taxPremium,
    medicalOutsideCoverage: form.medicalOutsideCoverage,
    medicalOutsidePremium: form.medicalOutsidePremium,
  });
}

function getInsuredDisplayName(form: QuoteFormState) {
  return form.companyName || form.insuredName || "________";
}

function formatQuoteDate(value: string) {
  if (!value) return "";
  const [year = "", month = "", day = ""] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

function formatCompactDate(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}年${digits.slice(4, 6)}月${digits.slice(6, 8)}日`;
}

function normalizeCompactDate(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) {
    return {
      normalized: "",
      digits,
    };
  }

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  return {
    normalized: `${year}-${month}-${day}`,
    digits,
  };
}

function readQuoteHistory(): QuoteHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(QUOTE_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuoteHistoryEntry[];
  } catch {
    return [];
  }
}

function writeQuoteHistory(entries: QuoteHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(entries));
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function formatDateToCompact(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getOneYearPolicyPeriod() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  return {
    start: formatDateToCompact(start),
    end: formatDateToCompact(end),
  };
}

function normalizeRecognizedDate(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value.trim();
  return `${digits.slice(0, 4)}年${digits.slice(4, 6)}月${digits.slice(6, 8)}日`;
}

function normalizeRecognizedText(value: string) {
  return value.trim();
}

function mergeRecognizedForm(
  current: QuoteFormState,
  recognized: RecognizedDocument,
): QuoteFormState {
  return {
    ...current,
    plate: normalizeRecognizedText(recognized.plate || current.plate),
    insuredName: normalizeRecognizedText(
      recognized.name || current.insuredName,
    ),
    companyName: normalizeRecognizedText(
      recognized.companyName || current.companyName,
    ),
    brandModel: normalizeRecognizedText(
      recognized.brandModel || current.brandModel,
    ),
    vehicleType: normalizeRecognizedText(
      recognized.vehicleType || current.vehicleType,
    ),
    energyType: normalizeRecognizedText(
      recognized.energyType || current.energyType,
    ),
    firstRegistrationDate: normalizeRecognizedDate(
      recognized.firstRegistrationDate || current.firstRegistrationDate,
    ),
    usageNature: normalizeRecognizedText(
      recognized.usageNature || current.usageNature,
    ),
    approvedPassengers: normalizeRecognizedText(
      recognized.approvedPassengers || current.approvedPassengers,
    ),
    approvedLoad: normalizeRecognizedText(
      recognized.approvedLoad || current.approvedLoad,
    ),
    engineNumber: normalizeRecognizedText(
      recognized.engineNumber || current.engineNumber,
    ),
    vin: normalizeRecognizedText(recognized.vin || current.vin),
    invoiceAmount: normalizeRecognizedText(
      recognized.invoiceAmount || current.invoiceAmount,
    ),
  };
}

export default function Quote() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<QuoteFormState>(initialForm);
  const [templateKind, setTemplateKind] = useState<TemplateKind>("机动车");
  const [items, setItems] = useState<QuoteItem[]>(
    buildQuoteItems(initialForm, "机动车"),
  );
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrRaw, setOcrRaw] = useState("");
  const [history, setHistory] = useState<QuoteHistoryEntry[]>(() => readQuoteHistory());

  const template = QUOTE_TEMPLATES[templateKind];
  const truckQuote = useMemo(() => {
    const vehiclePrice =
      Number(form.invoiceAmount.replace(/[^\d.]/g, "")) ||
      Number(form.damageCoverage) ||
      0;

    return calculateTruckQuote({
      province: form.province,
      usageType: form.usageType,
      weightClass: "2吨以下",
      vehiclePrice,
      thirdPartyLimit: form.thirdPartyLimit,
      driverLimit: form.driverLimit,
      damageManualPremium: form.damageManualPremium,
      adjustmentFactor: form.adjustmentFactor,
      expenseRate: form.expenseRate,
      compulsoryClaims: form.compulsoryClaims,
      hasDeathClaim: form.death,
    });
  }, [
    form.compulsoryClaims,
    form.damageCoverage,
    form.damageManualPremium,
    form.death,
    form.driverLimit,
    form.expenseRate,
    form.invoiceAmount,
    form.province,
    form.thirdPartyLimit,
    form.usageType,
    form.adjustmentFactor,
  ]);

  const commercialTotal = useMemo(() => getCommercialPremiumTotal(items), [items]);
  const vehicleTotal = useMemo(() => getVehiclePremiumTotal(items), [items]);
  const grandTotal = vehicleTotal + form.extraInsurancePremium;
  const quoteDate = useMemo(() => formatQuoteDate(form.quoteDate), [form.quoteDate]);
  const mainItems = items.filter(
    (item) => item.id !== "compulsory" && item.id !== "tax",
  );
  const compulsoryItem = items.find((item) => item.id === "compulsory");
  const taxItem = items.find((item) => item.id === "tax");

  const syncTemplate = (nextForm: QuoteFormState, nextKind: TemplateKind) => {
    setTemplateKind(nextKind);
    setItems(buildQuoteItems(nextForm, nextKind));
  };

  const updateForm = <K extends keyof QuoteFormState>(
    key: K,
    value: QuoteFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveHistory = (
    nextForm: QuoteFormState,
    nextItems: QuoteItem[],
    nextTemplateKind: TemplateKind,
  ) => {
    const entry: QuoteHistoryEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      templateKind: nextTemplateKind,
      form: nextForm,
      items: nextItems,
    };

    const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
    setHistory(nextHistory);
    writeQuoteHistory(nextHistory);
  };

  const handleTodayDate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm((current) => ({
      ...current,
      quoteDate: today,
      quoteDateInput: today.replace(/-/g, ""),
    }));
  };

  const handleDatePickerChange = (value: string) => {
    setForm((current) => ({
      ...current,
      quoteDate: value,
      quoteDateInput: value.replace(/-/g, ""),
    }));
  };

  const handleDateTextChange = (value: string) => {
    const { normalized, digits } = normalizeDateInput(value);

    setForm((current) => ({
      ...current,
      quoteDate: normalized || current.quoteDate,
      quoteDateInput: digits,
    }));
  };

  const handlePolicyToday = (
    startKey: "compulsoryStart" | "commercialStart",
    endKey: "compulsoryEnd" | "commercialEnd",
  ) => {
    const period = getOneYearPolicyPeriod();
    setForm((current) => ({
      ...current,
      [startKey]: period.start,
      [endKey]: period.end,
    }));
  };

  const handleCalculate = () => {
    const nextItems = buildQuoteItems(form, templateKind);
    setTemplateKind(templateKind);
    setItems(nextItems);
    saveHistory(form, nextItems, templateKind);
  };

  const handleTemplateSwitch = (nextKind: TemplateKind) => {
    syncTemplate(form, nextKind);
  };

  const handleItemChange = (
    index: number,
    key: "enabled" | "coverage" | "premium",
    value: boolean | string | number,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRecognizing(true);
    setOcrError("");
    setOcrRaw("");

    try {
      const recognized = await recognize(file);
      saveRecognizedDocument(recognized);
      setOcrRaw(JSON.stringify(recognized, null, 2));
      const nextForm = mergeRecognizedForm(form, recognized);

      const nextKind = detectTemplateKind(recognized);
      setForm(nextForm);
      syncTemplate(nextForm, nextKind);
    } catch (error) {
      setOcrError(
        error instanceof Error ? error.message : "OCR 识别失败，请稍后再试。",
      );
    } finally {
      setIsRecognizing(false);
    }
  };

  useEffect(() => {
    const recognized = readRecognizedDocument();
    if (!recognized) return;

    const hasImportableField = [
      recognized.plate,
      recognized.name,
      recognized.companyName,
      recognized.brandModel,
      recognized.vehicleType,
      recognized.firstRegistrationDate,
      recognized.approvedPassengers,
      recognized.approvedLoad,
      recognized.engineNumber,
      recognized.vin,
      recognized.invoiceAmount,
    ].some(Boolean);

    if (!hasImportableField) return;

    const nextForm = mergeRecognizedForm(initialForm, recognized);
    const nextKind = detectTemplateKind(recognized);
    setForm(nextForm);
    setTemplateKind(nextKind);
    setItems(buildQuoteItems(nextForm, nextKind));
    setOcrRaw(JSON.stringify(recognized, null, 2));
  }, []);

  const handleExportPdf = async () => {
    if (!previewRef.current) return;
    await generateInsurancePDF(previewRef.current);
  };

  const handleHistoryImport = (entry: QuoteHistoryEntry) => {
    setForm(entry.form);
    setTemplateKind(entry.templateKind);
    setItems(entry.items);
  };

  return (
    <div className="page-shell quote-page">
      <div className="card quote-workbench">
        <div className="heading-row">
          <div>
            <p className="eyebrow">中国人寿</p>
            <h1>车险报价系统</h1>
            <p className="intro">
              页面预览、识别字段和导出 PDF 均按 Excel 模板映射。
            </p>
          </div>
          <div className="action-row">
            <Link className="secondary-link" to="/">
              返回首页
            </Link>
            <Link className="secondary-link" to="/upload">
              OCR 调试页
            </Link>
          </div>
        </div>

        <div className="template-tabs">
          {TEMPLATE_TABS.map((kind) => (
            <button
              key={kind}
              className={kind === templateKind ? "template-tab active" : "template-tab"}
              onClick={() => handleTemplateSwitch(kind)}
              type="button"
            >
              {kind}
            </button>
          ))}
        </div>

        <div className="editor-grid">
          <section className="editor-panel">
            <h2>识别与基本信息</h2>
            <input
              className="upload-input"
              type="file"
              accept="image/*,.pdf"
              onChange={handleUpload}
            />
            <p className="status-text">
              {isRecognizing
                ? "识别中，系统会自动判断新能源 / 机动车 / 特种车。"
                : "上传报价图、行驶证或证件后，自动回填字段并选择车辆类型。"}
            </p>

            <div className="form-grid">
              <label>
                <span>报价日期</span>
                <div className="date-control-group">
                  <button
                    className="secondary-link date-today-button"
                    onClick={handleTodayDate}
                    type="button"
                  >
                    当天
                  </button>
                  <input
                    type="date"
                    value={form.quoteDate}
                    onChange={(e) => handleDatePickerChange(e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="yyyymmdd"
                    value={form.quoteDateInput}
                    onChange={(e) => handleDateTextChange(e.target.value)}
                  />
                </div>
              </label>

              <label>
                <span>号牌号码</span>
                <input
                  type="text"
                  value={form.plate}
                  onChange={(e) => updateForm("plate", e.target.value)}
                />
              </label>

              <label>
                <span>被保险人</span>
                <input
                  type="text"
                  value={form.insuredName}
                  onChange={(e) => updateForm("insuredName", e.target.value)}
                />
              </label>

              <label>
                <span>公司名称</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateForm("companyName", e.target.value)}
                />
              </label>

              <label>
                <span>厂牌车型</span>
                <input
                  type="text"
                  value={form.brandModel}
                  onChange={(e) => updateForm("brandModel", e.target.value)}
                />
              </label>

              <label>
                <span>车辆类型</span>
                <input
                  type="text"
                  value={form.vehicleType}
                  onChange={(e) => updateForm("vehicleType", e.target.value)}
                />
              </label>

              <label>
                <span>能源类型</span>
                <input
                  type="text"
                  value={form.energyType}
                  onChange={(e) => updateForm("energyType", e.target.value)}
                />
              </label>

              <label>
                <span>初次登记日期</span>
                <input
                  type="text"
                  value={form.firstRegistrationDate}
                  onChange={(e) =>
                    updateForm("firstRegistrationDate", e.target.value)
                  }
                />
              </label>

              <label>
                <span>使用性质</span>
                <input
                  type="text"
                  value={form.usageNature}
                  onChange={(e) => updateForm("usageNature", e.target.value)}
                />
              </label>

              <label>
                <span>核定载客</span>
                <input
                  type="text"
                  value={form.approvedPassengers}
                  onChange={(e) =>
                    updateForm("approvedPassengers", e.target.value)
                  }
                />
              </label>

              <label>
                <span>核定载质量</span>
                <input
                  type="text"
                  value={form.approvedLoad}
                  onChange={(e) => updateForm("approvedLoad", e.target.value)}
                />
              </label>

              <label>
                <span>发动机号码</span>
                <input
                  type="text"
                  value={form.engineNumber}
                  onChange={(e) => updateForm("engineNumber", e.target.value)}
                />
              </label>

              <label>
                <span>车辆识别代号 / 车架号码</span>
                <input
                  type="text"
                  value={form.vin}
                  onChange={(e) => updateForm("vin", e.target.value)}
                />
              </label>

              <label>
                <span>发票金额（小写）</span>
                <input
                  type="text"
                  value={form.invoiceAmount}
                  onChange={(e) => updateForm("invoiceAmount", e.target.value)}
                />
              </label>
            </div>

            {ocrError ? <div className="result-block">{ocrError}</div> : null}
            {ocrRaw ? <pre className="result-block">{ocrRaw}</pre> : null}
          </section>

          <section className="editor-panel">
            <h2>报价参数与期间</h2>
            <div className="form-grid">
              <label>
                <span>省份</span>
                <select
                  value={form.province}
                  onChange={(e) => updateForm("province", e.target.value as ProvinceName)}
                >
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>营业 / 非营业</span>
                <select
                  value={form.usageType}
                  onChange={(e) =>
                    updateForm("usageType", e.target.value as TruckUsageType)
                  }
                >
                  <option value="营业">营业</option>
                  <option value="非营业">非营业</option>
                </select>
              </label>

              <label>
                <span>车损保额</span>
                <input
                  type="number"
                  value={form.damageCoverage}
                  onChange={(e) =>
                    updateForm("damageCoverage", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>三者限额（万）</span>
                <input
                  type="number"
                  value={form.thirdPartyLimit}
                  onChange={(e) =>
                    updateForm("thirdPartyLimit", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>司机限额（元）</span>
                <input
                  type="number"
                  value={form.driverLimit}
                  onChange={(e) => updateForm("driverLimit", Number(e.target.value))}
                />
              </label>

              <label>
                <span>车损人工保费</span>
                <input
                  type="number"
                  value={form.damageManualPremium}
                  onChange={(e) =>
                    updateForm("damageManualPremium", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>调整系数</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.adjustmentFactor}
                  onChange={(e) =>
                    updateForm("adjustmentFactor", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>附加费用率</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.expenseRate}
                  onChange={(e) => updateForm("expenseRate", Number(e.target.value))}
                />
              </label>

              <label>
                <span>非车险保费</span>
                <input
                  type="number"
                  value={form.extraInsurancePremium}
                  onChange={(e) =>
                    updateForm("extraInsurancePremium", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>乘客额度（万）</span>
                <input
                  type="number"
                  value={form.passenger}
                  onChange={(e) => updateForm("passenger", Number(e.target.value))}
                />
              </label>

              <label>
                <span>商业险出险次数</span>
                <input
                  type="number"
                  value={form.claims}
                  onChange={(e) => updateForm("claims", Number(e.target.value))}
                />
              </label>

              <label>
                <span>交强险上年出险次数</span>
                <input
                  type="number"
                  value={form.compulsoryClaims}
                  onChange={(e) =>
                    updateForm("compulsoryClaims", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>商业险连续承保年数</span>
                <input
                  type="text"
                  value={form.continuousYears}
                  onChange={(e) => updateForm("continuousYears", e.target.value)}
                />
              </label>

              <label>
                <span>连续承保期间出险次数</span>
                <input
                  type="text"
                  value={form.continuousClaims}
                  onChange={(e) =>
                    updateForm("continuousClaims", e.target.value)
                  }
                />
              </label>

              <label>
                <span>交强险起期</span>
                <div className="date-control-group policy-date-group">
                  <button
                    className="secondary-link date-today-button"
                    onClick={() =>
                      handlePolicyToday("compulsoryStart", "compulsoryEnd")
                    }
                    type="button"
                  >
                    今日起期
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="yyyymmdd"
                    value={form.compulsoryStart}
                    onChange={(e) =>
                      updateForm("compulsoryStart", normalizeCompactDate(e.target.value))
                    }
                  />
                </div>
              </label>

              <label>
                <span>交强险止期</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="yyyymmdd"
                  value={form.compulsoryEnd}
                  onChange={(e) =>
                    updateForm("compulsoryEnd", normalizeCompactDate(e.target.value))
                  }
                />
              </label>

              <label>
                <span>商业险起期</span>
                <div className="date-control-group policy-date-group">
                  <button
                    className="secondary-link date-today-button"
                    onClick={() =>
                      handlePolicyToday("commercialStart", "commercialEnd")
                    }
                    type="button"
                  >
                    今日起期
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="yyyymmdd"
                    value={form.commercialStart}
                    onChange={(e) =>
                      updateForm("commercialStart", normalizeCompactDate(e.target.value))
                    }
                  />
                </div>
              </label>

              <label>
                <span>商业险止期</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="yyyymmdd"
                  value={form.commercialEnd}
                  onChange={(e) =>
                    updateForm("commercialEnd", normalizeCompactDate(e.target.value))
                  }
                />
              </label>

              <label>
                <span>车船税</span>
                <input
                  type="number"
                  value={form.taxPremium}
                  onChange={(e) => updateForm("taxPremium", Number(e.target.value))}
                />
              </label>

              <label>
                <span>医保外医疗费用责任险保额</span>
                <input
                  type="number"
                  value={form.medicalOutsideCoverage}
                  onChange={(e) =>
                    updateForm("medicalOutsideCoverage", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <span>医保外医疗费用责任险保费</span>
                <input
                  type="number"
                  value={form.medicalOutsidePremium}
                  onChange={(e) =>
                    updateForm("medicalOutsidePremium", Number(e.target.value))
                  }
                />
              </label>
            </div>

            <label className="checkbox-field compact">
              <input
                type="checkbox"
                checked={form.death}
                onChange={(e) => updateForm("death", e.target.checked)}
              />
              <span>是否有人伤死亡赔案</span>
            </label>

            <div className="action-row">
              <button className="primary-button" onClick={handleCalculate}>
                重新计算
              </button>
            </div>
          </section>
        </div>

        <section className="editor-panel">
          <h2>货车省份报价结果</h2>
          <div className="result-grid">
            <div className="result-panel">
              <strong>交强险</strong>
              <span>{truckQuote.compulsory.toFixed(2)}</span>
            </div>
            <div className="result-panel">
              <strong>车损</strong>
              <span>{truckQuote.damage.toFixed(2)}</span>
            </div>
            <div className="result-panel">
              <strong>三者</strong>
              <span>{truckQuote.third.toFixed(2)}</span>
            </div>
            <div className="result-panel">
              <strong>司机</strong>
              <span>{truckQuote.driver.toFixed(2)}</span>
            </div>
            <div className="result-panel">
              <strong>合计</strong>
              <span>{truckQuote.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="result-block warnings-block">
            <strong>warnings</strong>
            <ul className="warnings-list">
              {truckQuote.warnings.length ? (
                truckQuote.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))
              ) : (
                <li>当前报价未产生额外提示。</li>
              )}
            </ul>
          </div>
        </section>

        <section className="editor-panel">
          <div className="section-header-row">
            <h2>险种映射</h2>
            <button className="secondary-link" onClick={handleExportPdf}>
              导出报价单 PDF
            </button>
          </div>
          <div className="result-grid">
            {items.map((item, index) => (
              <div className="quote-item-card" key={item.id}>
                <label className="inline-checkbox">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() =>
                      handleItemChange(index, "enabled", !item.enabled)
                    }
                  />
                  <span>{item.name}</span>
                </label>

                <label>
                  <span>绝对免赔率</span>
                  <input type="text" value={item.deductibleRate} readOnly />
                </label>

                <label>
                  <span>保额金额/责任险额(元)</span>
                  <input
                    type="text"
                    value={String(item.coverage)}
                    onChange={(e) =>
                      handleItemChange(index, "coverage", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>保费(元)</span>
                  <input
                    type="number"
                    value={item.premium}
                    disabled={!item.editablePremium}
                    onChange={(e) =>
                      handleItemChange(index, "premium", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="editor-panel">
          <h2>报价历史</h2>
          {history.length ? (
            <div className="history-list">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  className="history-item"
                  onClick={() => handleHistoryImport(entry)}
                  type="button"
                >
                  <span>{formatHistoryTime(entry.createdAt)}</span>
                  <span>{entry.templateKind}</span>
                  <span>{entry.form.plate || "未识别车牌"}</span>
                  <span>{getInsuredDisplayName(entry.form)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="status-text">
              点击“重新计算”后会自动保存历史，可一键导入。
            </p>
          )}
        </section>

        <div className="quote-preview-sheet" ref={previewRef}>
          <div className="sheet-header">
            <img alt="中国人寿财产保险" className="quote-logo" src={excelLogo} />
            <h1 className="sheet-title">车险报价单</h1>
            <div className="sheet-divider" />
          </div>
          <p className="sheet-recipient">
            {template.insuredLabel} {getInsuredDisplayName(form)}
          </p>
          <p className="sheet-desc">
            感谢您选择我公司投保车辆保险，本次报价信息如下：
          </p>

          <div className="sheet-section-title">一 、基本投保信息</div>
          <div className="sheet-basic-grid">
            <p>号牌号码：{form.plate || "新车未上牌"}</p>
            <p>厂牌车型：{form.brandModel || form.vehicleType || "-"}</p>
            <p>初次登记日期：{form.firstRegistrationDate || "-"}</p>
            <p>使用性质：{form.usageNature || "-"}</p>
            <p>核定载客：{form.approvedPassengers || "-"}</p>
            <p>核定栽质量：{form.approvedLoad || "-"}</p>
            <p>发动机号码：{form.engineNumber || "-"}</p>
            <p>车辆识别代号/车架号码：{form.vin || "-"}</p>
            <p>发票金额（小写）：{form.invoiceAmount || "-"}</p>
          </div>

          {template.includeCompulsoryPeriod ? (
            <p className="sheet-period-row">
              交强险保险期间：
              {toDateTimeLabel(form.compulsoryStart, form.compulsoryEnd) || "-"}
            </p>
          ) : null}
          <p className="sheet-period-row">
            商业险保险期间：
            {toDateTimeLabel(form.commercialStart, form.commercialEnd) || "-"}
          </p>

          <div className="sheet-section-title">二 、投保、出险信息</div>
          <div className="sheet-info-list">
            <p>交强险上年出险次数；{form.compulsoryClaims}</p>
            <p>商业险连续承保年数：{form.continuousYears}</p>
            <p>商业险连续承保期间出险次数：{form.continuousClaims}</p>
          </div>

          <div className="sheet-section-title">三 、详储报价信息</div>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>险种名称</th>
                <th>绝对免赔率</th>
                <th>保额金额/责任险额(元)</th>
                <th>保费(元)</th>
              </tr>
            </thead>
            <tbody>
              {mainItems.map((item) =>
                item.enabled ? (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.deductibleRate || "/"}</td>
                    <td>{item.coverage}</td>
                    <td>{item.premium}</td>
                  </tr>
                ) : null,
              )}
              <tr className="summary-row">
                <td>商业险保费合计</td>
                <td>/</td>
                <td>/</td>
                <td>{commercialTotal}</td>
              </tr>
              {compulsoryItem?.enabled ? (
                <tr>
                  <td>{compulsoryItem.name}</td>
                  <td>{compulsoryItem.deductibleRate}</td>
                  <td>{compulsoryItem.coverage}</td>
                  <td>{compulsoryItem.premium}</td>
                </tr>
              ) : null}
              {taxItem?.enabled ? (
                <tr>
                  <td>{taxItem.name}</td>
                  <td>{taxItem.deductibleRate}</td>
                  <td>{taxItem.coverage}</td>
                  <td>{taxItem.premium}</td>
                </tr>
              ) : null}
              <tr className="summary-row">
                <td>车险合计</td>
                <td>/</td>
                <td>/</td>
                <td>{vehicleTotal}</td>
              </tr>
            </tbody>
          </table>

          <table className="sheet-table extra-table">
            <thead>
              <tr>
                <th>{template.extraInsuranceTitle}</th>
                <th>保险责任</th>
                <th>保险金额</th>
                <th>保费(元)</th>
              </tr>
            </thead>
            <tbody>
              {template.extraInsuranceRows.map((row, index) => (
                <tr key={`${row.clause}-${index}`}>
                  <td>{row.clause}</td>
                  <td>{row.responsibility}</td>
                  <td>{row.amount}</td>
                  <td>{index === 0 ? form.extraInsurancePremium : ""}</td>
                </tr>
              ))}
              <tr className="summary-row">
                <td>非车险合计</td>
                <td>/</td>
                <td>/</td>
                <td>{form.extraInsurancePremium}</td>
              </tr>
              <tr className="summary-row">
                <td>合计</td>
                <td>/</td>
                <td>/</td>
                <td>{grandTotal}</td>
              </tr>
            </tbody>
          </table>

          <p className="sheet-reminder">{template.reminder}</p>
          <p className="sheet-company">{template.companyLine}</p>
          <div className="sheet-date-row">
            <span>{quoteDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

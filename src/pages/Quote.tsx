import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import excelLogo from "../assets/excel-logo.png";
import { recognize } from "../utils/ocr";
import { generateInsurancePDF } from "../utils/pdfGenerator";
import { calculateQuote } from "../utils/quoteEngine";
import {
  detectTemplateKind,
  QUOTE_TEMPLATES,
  type QuoteItem,
  type TemplateKind,
} from "../utils/quoteTemplates";

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
  return `  自 ${start}00时00分起 至 ${end}23时59分 止`;
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
  const result = calculateQuote({
    vehicleType: form.vehicleType || templateKind,
    isCommercial: true,
    vehiclePrice: 350000,
    damageCoverage: form.damageCoverage,
    thirdParty: form.thirdParty,
    driverCoverage: form.driver,
    passengerCoverage: form.passenger,
    lastYearClaims: form.claims,
    hasDeathClaim: form.death,
  });

  const template = QUOTE_TEMPLATES[templateKind];

  return template.createItems({
    damageCoverage: form.damageCoverage,
    thirdParty: form.thirdParty,
    driverCoverage: form.driver,
    passengerCoverage: form.passenger,
    damagePremium: result.damage,
    thirdPremium: result.third,
    driverPremium: result.driver,
    passengerPremium: result.passenger,
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

  const template = QUOTE_TEMPLATES[templateKind];

  const commercialTotal = useMemo(() => getCommercialPremiumTotal(items), [items]);
  const vehicleTotal = useMemo(() => getVehiclePremiumTotal(items), [items]);
  const grandTotal = vehicleTotal + template.extraInsurancePremium;
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

  const handleCalculate = () => {
    syncTemplate(form, templateKind);
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
      setOcrRaw(JSON.stringify(recognized, null, 2));

      const nextForm: QuoteFormState = {
        ...form,
        plate: recognized.plate || form.plate,
        insuredName: recognized.name || form.insuredName,
        companyName: recognized.companyName || form.companyName,
        brandModel: recognized.brandModel || form.brandModel,
        vehicleType: recognized.vehicleType || form.vehicleType,
        energyType: recognized.energyType || form.energyType,
        firstRegistrationDate:
          recognized.firstRegistrationDate || form.firstRegistrationDate,
        usageNature: recognized.usageNature || form.usageNature,
        approvedPassengers:
          recognized.approvedPassengers || form.approvedPassengers,
        approvedLoad: recognized.approvedLoad || form.approvedLoad,
      };

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

  const handleExportPdf = async () => {
    if (!previewRef.current) return;
    await generateInsurancePDF(previewRef.current);
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
            </div>

            {ocrError ? <div className="result-block">{ocrError}</div> : null}
            {ocrRaw ? <pre className="result-block">{ocrRaw}</pre> : null}
          </section>

          <section className="editor-panel">
            <h2>报价参数与期间</h2>
            <div className="form-grid">
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
                <span>三者额度（万）</span>
                <input
                  type="number"
                  value={form.thirdParty}
                  onChange={(e) => updateForm("thirdParty", Number(e.target.value))}
                />
              </label>

              <label>
                <span>司机额度（万）</span>
                <input
                  type="number"
                  value={form.driver}
                  onChange={(e) => updateForm("driver", Number(e.target.value))}
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
                <input
                  type="text"
                  value={form.compulsoryStart}
                  onChange={(e) => updateForm("compulsoryStart", e.target.value)}
                />
              </label>

              <label>
                <span>交强险止期</span>
                <input
                  type="text"
                  value={form.compulsoryEnd}
                  onChange={(e) => updateForm("compulsoryEnd", e.target.value)}
                />
              </label>

              <label>
                <span>商业险起期</span>
                <input
                  type="text"
                  value={form.commercialStart}
                  onChange={(e) => updateForm("commercialStart", e.target.value)}
                />
              </label>

              <label>
                <span>商业险止期</span>
                <input
                  type="text"
                  value={form.commercialEnd}
                  onChange={(e) => updateForm("commercialEnd", e.target.value)}
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
              <button className="secondary-link" onClick={handleExportPdf}>
                导出中文 PDF
              </button>
            </div>
          </section>
        </div>

        <section className="editor-panel">
          <h2>险种映射</h2>
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
                  <td>{index === 0 ? template.extraInsurancePremium : ""}</td>
                </tr>
              ))}
              <tr className="summary-row">
                <td>非车险合计</td>
                <td>/</td>
                <td>/</td>
                <td>{template.extraInsurancePremium}</td>
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

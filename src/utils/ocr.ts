import Tesseract from "tesseract.js";

export const OCR_IMPORT_STORAGE_KEY = "quote-system-last-ocr";

export type RecognizedDocument = {
  plate?: string;
  vehicleType?: string;
  brandModel?: string;
  energyType?: string;
  name?: string;
  companyName?: string;
  firstRegistrationDate?: string;
  usageNature?: string;
  approvedPassengers?: string;
  approvedLoad?: string;
  engineNumber?: string;
  vin?: string;
  invoiceAmount?: string;
  templateType?: "新能源" | "机动车" | "特种车";
  raw?: string;
};

function compactText(text: string) {
  return text.replace(/\s+/g, "");
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function getNormalizedLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function matchLineValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    const compactLine = compactText(line);
    for (const label of labels) {
      const index = compactLine.indexOf(label);
      if (index >= 0) {
        const value = compactLine
          .slice(index + label.length)
          .replace(/^[:：]\s*/, "")
          .trim();
        if (value) return value;
      }
    }
  }
  return "";
}

function normalizeDate(raw: string) {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length !== 8) return raw.trim();

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}年${month}月${day}日`;
}

function normalizePlate(raw: string) {
  if (!raw) return "";
  return raw.replace(/[^A-Z0-9\u4e00-\u9fa5]/gi, "").toUpperCase();
}

function normalizeNumeric(raw: string) {
  if (!raw) return "";
  const value = raw.replace(/[^\d.]/g, "");
  return value;
}

function normalizeAlphaNumeric(raw: string) {
  if (!raw) return "";
  return raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function looksLikeCompanyName(value: string) {
  return /公司|集团|中心|商行|工厂|店|合作社|物流/.test(value);
}

function detectTemplateType(text: string): RecognizedDocument["templateType"] {
  const source = compactText(text);

  if (
    source.includes("新能源") ||
    source.includes("纯电") ||
    source.includes("插电") ||
    source.includes("增程")
  ) {
    return "新能源";
  }

  if (
    source.includes("特种车") ||
    source.includes("专项作业") ||
    source.includes("清障") ||
    source.includes("救援")
  ) {
    return "特种车";
  }

  return "机动车";
}

function parseTraditionalOcrText(text: string): RecognizedDocument {
  const source = compactText(text);
  const lines = getNormalizedLines(text);

  const plate = normalizePlate(
    matchLineValue(lines, ["号牌号码", "车牌号码", "车牌号"]) ||
      matchFirst(source, [
        /号牌号码[:：]?([A-Z\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6})/i,
        /车牌[号码]{1,2}[:：]?([A-Z\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6})/i,
      ]),
  );

  const brandModel =
    matchLineValue(lines, ["厂牌车型", "厂牌型号", "车辆品牌/车辆名称", "商标/品牌"]) ||
    matchFirst(source, [
      /厂牌车型[:：]?(.{4,80}?)(?:初次登记日期|使用性质|核定载客|核定[载栽]质量|商业险|交强险|二、|三、)/,
      /厂牌型号[:：]?(.{4,80}?)(?:初次登记日期|使用性质|核定载客|核定[载栽]质量|商业险|交强险|二、|三、)/,
      /车辆品牌\/车辆名称[:：]?(.{2,80}?)(?:车辆型号|车辆类型|车辆识别代号|发动机号码|燃料种类)/,
      /商标\/品牌[:：]?(.{2,80}?)(?:车辆型号|车辆类型|车辆识别代号|发动机号码|燃料种类)/,
      /厂牌型号([A-Z0-9\u4e00-\u9fa5\-]{6,80})/,
    ]);

  const vehicleType =
    matchLineValue(lines, [
      "车辆类型",
      "车辆名称",
      "车型",
      "纯电动仓栅式货车",
      "车辆品牌/车辆名称",
    ]) ||
    matchFirst(source, [
      /车辆类型[:：]?(.{2,40}?)(?:厂牌|初次登记日期|使用性质|核定载客|核定[载栽]质量|商业险|交强险|二、|三、)/,
      /车辆类型(.{2,40}?)(?:厂牌型号|合格证号|发动机号码|车辆识别代号)/,
      /车辆类型([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/,
      /车辆名称(.{2,40}?)(?:厂牌型号|产地|合格证号)/,
      /车辆品牌\/车辆名称[:：]?(.{2,40}?)(?:车辆型号|车辆识别代号|发动机号码|燃料种类|外形尺寸)/,
      /车型[:：]?(.{2,40}?)(?:厂牌|初次登记日期|使用性质|核定载客|核定[载栽]质量|商业险|交强险|二、|三、)/,
    ]) ||
    brandModel;

  const firstRegistrationDate = normalizeDate(
    matchLineValue(lines, ["初次登记日期", "注册日期", "发证日期", "开票日期"]) ||
    matchFirst(source, [
      /初次登记日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      /注册日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      /发证日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      /开票日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
    ]),
  );

  const usageNature =
    matchLineValue(lines, ["使用性质", "性质"]) ||
    matchFirst(source, [
      /使用性质[:：]?([\u4e00-\u9fa5]{2,12})/,
      /性质[:：]?([\u4e00-\u9fa5]{2,12})/,
    ]);

  const approvedPassengers = normalizeNumeric(
    matchLineValue(lines, [
      "核定载客",
      "准乘人数",
      "额定载客人数",
      "限乘人数",
      "驾驶室准乘人数(人)",
      "驾驶室准乘人数",
    ]) ||
      matchFirst(source, [
        /核定载客[:：]?([0-9]{1,3})/,
        /准乘人数[:：]?([0-9]{1,3})/,
        /限乘人数[:：]?([0-9]{1,3})/,
        /驾驶室准乘人数(?:\(人\))?[:：]?([0-9]{1,3})/,
      ]),
  );

  const approvedLoad = normalizeNumeric(
    matchLineValue(lines, [
      "核定载质量",
      "核定栽质量",
      "额定载质量",
      "总质量",
      "额定载质量(kg)",
    ]) ||
      matchFirst(source, [
        /核定[载栽]质量[:：]?([0-9.]{1,10})/,
        /额定载质量[:：]?([0-9.]{1,10})/,
        /额定载质量\(kg\)[:：]?([0-9.]{1,10})/,
        /总质量[:：]?([0-9.]{1,10})/,
      ]),
  );

  const engineNumber = normalizeAlphaNumeric(
    matchLineValue(lines, ["发动机号码", "发动机号"]) ||
      matchFirst(source, [
        /发动机号码[:：]?([A-Z0-9]{6,30})/i,
        /发动机号[:：]?([A-Z0-9]{6,30})/i,
      ]),
  );

  const vin = normalizeAlphaNumeric(
    matchLineValue(lines, ["车辆识别代号/车架号码", "车辆识别代号", "车架号码", "车架号"]) ||
      matchFirst(source, [
        /车辆识别代号\/?车架号码[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车辆识别代号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车架号码[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车架号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
      ]),
  );

  const invoiceAmount = normalizeNumeric(
    matchLineValue(lines, ["小写", "价税合计小写", "不含税价小写"]) ||
      matchFirst(source, [
        /小写[:：]?([0-9]{3,}\.?[0-9]{0,2})/,
        /价税合计.*?小写[:：]?([0-9]{3,}\.?[0-9]{0,2})/,
        /小写([0-9]{3,}\.?[0-9]{0,2})/,
      ]),
  );

  const partyName =
    matchLineValue(lines, ["公司名称", "购买方名称", "名称"]) ||
    matchFirst(source, [
      /购买方名称[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,60})/,
      /公司名称[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{4,60})/,
      /名称[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{4,60}(?:公司|中心|商行|工厂|店))/,
      /尊敬的([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,60}(?:公司|中心|商行|工厂|店))/,
    ]);

  const extractedName =
    matchLineValue(lines, ["姓名", "被保险人", "购买方名称"]) ||
    matchFirst(source, [
      /姓名[:：]?([\u4e00-\u9fa5·]{2,12})/,
      /被保险人[:：]?([\u4e00-\u9fa5·]{2,12})/,
      /购买方名称[:：]?([\u4e00-\u9fa5·]{2,12})/,
      /尊敬的([\u4e00-\u9fa5·]{2,12})/,
    ]);

  const energyType =
    source.includes("新能源") || source.includes("纯电")
      ? "新能源"
      : source.includes("燃油")
        ? "燃油"
        : source.includes("燃料种类电") || source.includes("燃料种类:电")
          ? "新能源"
          : "";

  const normalizedUsageNature = usageNature
    ? usageNature
    : vehicleType.includes("货车") || vehicleType.includes("仓栅")
      ? "货运"
      : "";

  const companyName = looksLikeCompanyName(partyName) ? partyName : "";
  const name = companyName ? extractedName : extractedName || partyName;

  return {
    plate: plate || (source.includes("合格证") && !plate ? "新车未上牌" : ""),
    vehicleType,
    brandModel,
    energyType,
    name,
    companyName,
    firstRegistrationDate,
    usageNature: normalizedUsageNature,
    approvedPassengers,
    approvedLoad,
    engineNumber,
    vin,
    invoiceAmount,
    templateType: detectTemplateType(source),
    raw: text.trim(),
  };
}

export async function recognizeDocument(file: File) {
  if (file.type === "application/pdf") {
    throw new Error("当前传统 OCR 暂不支持 PDF，请先上传图片格式。");
  }

  const result = await Tesseract.recognize(file, "chi_sim+eng", {
    logger: () => {},
  });

  return result.data.text || "";
}

export async function recognize(file: File): Promise<RecognizedDocument> {
  const text = await recognizeDocument(file);
  return parseTraditionalOcrText(text);
}

export function saveRecognizedDocument(data: RecognizedDocument) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OCR_IMPORT_STORAGE_KEY, JSON.stringify(data));
}

export function readRecognizedDocument(): RecognizedDocument | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(OCR_IMPORT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecognizedDocument) : null;
  } catch {
    return null;
  }
}

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

function cleanLabelValue(value: string) {
  return value
    .replace(/^[：:\-.\s]+/, "")
    .replace(/^(?:[0-9]{1,2}[.、])/, "")
    .trim();
}

function findValueNearLabel(
  lines: string[],
  labels: string[],
  options?: { nextLineOnly?: boolean; stopLabels?: string[] },
) {
  const stopLabels = options?.stopLabels ?? [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const compactLine = compactText(line);

    for (const label of labels) {
      const compactLabel = compactText(label);
      const labelIndex = compactLine.indexOf(compactLabel);

      if (labelIndex < 0) continue;

      const inlineValue = cleanLabelValue(
        compactLine.slice(labelIndex + compactLabel.length),
      );
      if (inlineValue) return inlineValue;

      const nextLine = lines[index + 1] ? compactText(lines[index + 1]) : "";
      if (!nextLine) continue;
      if (stopLabels.some((stopLabel) => nextLine.includes(compactText(stopLabel)))) {
        continue;
      }

      const nextValue = cleanLabelValue(nextLine);
      if (nextValue) return nextValue;

      if (!options?.nextLineOnly) {
        const mergedValue = cleanLabelValue(
          compactText(`${lines[index + 1] ?? ""}${lines[index + 2] ?? ""}`),
        );
        if (
          mergedValue &&
          !stopLabels.some((stopLabel) => mergedValue.includes(compactText(stopLabel)))
        ) {
          return mergedValue;
        }
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

function looksLikeChineseName(value: string) {
  return /^[\u4e00-\u9fa5·]{2,12}$/.test(value);
}

function joinRecognizedParts(...parts: string[]) {
  const normalized = parts
    .map((part) => cleanLabelValue(part))
    .filter(Boolean);

  if (!normalized.length) return "";
  return normalized.join("");
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

function parseInvoiceDocument(lines: string[], source: string): RecognizedDocument {
  const partyName = cleanLabelValue(
    findValueNearLabel(lines, ["购买方名称", "购货方名称", "购 买 方 名 称"], {
      stopLabels: ["统一社会信用代码", "纳税人识别号", "身份证号码"],
    }) ||
      matchFirst(source, [
        /购买方名称[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,60})/,
        /购货方名称[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,60})/,
      ]),
  );
  const vehicleType = cleanLabelValue(
    findValueNearLabel(lines, ["车辆类型", "车辆类型名称"], {
      stopLabels: ["厂牌型号", "品牌型号", "产地"],
    }) ||
      matchFirst(source, [/车辆类型[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/]),
  );
  const brandModel = cleanLabelValue(
    findValueNearLabel(lines, ["厂牌型号", "品牌型号"], {
      stopLabels: ["产地", "合格证号", "发动机号码"],
    }) ||
      matchFirst(source, [
        /厂牌型号[:：]?([A-Z0-9\u4e00-\u9fa5\-]{6,80})/i,
        /品牌型号[:：]?([A-Z0-9\u4e00-\u9fa5\-]{6,80})/i,
      ]),
  );
  const engineNumber = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["发动机号码", "发动机号", "发动机号码/电机编号"], {
      stopLabels: ["车辆识别代号", "车架号码", "价税合计"],
    }) || matchFirst(source, [/发动机号码[:：]?([A-Z0-9]{6,30})/i]),
  );
  const vin = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["车辆识别代号/车架号码", "车辆识别代号", "车架号码", "车架号"], {
      stopLabels: ["价税合计", "小写", "销货单位名称"],
    }) ||
      matchFirst(source, [
        /车辆识别代号\/?车架号码[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车辆识别代号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车架号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
      ]),
  );
  const invoiceAmount = normalizeNumeric(
    findValueNearLabel(lines, ["小写", "价税合计小写", "价税合计（小写）"], {
      stopLabels: ["销货单位名称", "电话", "销货单位"],
    }) ||
      matchFirst(source, [
        /小写[:：]?([0-9]{3,}\.?[0-9]{0,2})/,
        /价税合计.*?小写[:：]?([0-9]{3,}\.?[0-9]{0,2})/,
      ]),
  );
  const firstRegistrationDate = normalizeDate(
    findValueNearLabel(lines, ["开票日期", "发票日期"], { nextLineOnly: true }) ||
      matchFirst(source, [
        /开票日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
        /发票日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      ]),
  );

  const companyName = looksLikeCompanyName(partyName) ? partyName : "";
  const name = companyName ? "" : partyName;

  return {
    plate: "新车未上牌",
    vehicleType: cleanLabelValue(vehicleType),
    brandModel: cleanLabelValue(brandModel),
    energyType:
      source.includes("纯电") || source.includes("新能源") || source.includes("电")
        ? "新能源"
        : "",
    name,
    companyName,
    firstRegistrationDate,
    engineNumber,
    vin,
    invoiceAmount,
    templateType: detectTemplateType(source),
    raw: lines.join("\n").trim(),
  };
}

function parseCertificateDocument(lines: string[], source: string): RecognizedDocument {
  const vehicleName = cleanLabelValue(
    findValueNearLabel(lines, ["车辆品牌/车辆名称", "车辆名称", "机动车名称"], {
      stopLabels: ["车辆型号", "车辆识别代号", "发动机型号"],
    }) ||
      matchFirst(source, [
        /车辆品牌\/车辆名称[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/,
        /车辆名称[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/,
      ]),
  );
  const vehicleType = cleanLabelValue(
    findValueNearLabel(lines, ["车辆类型", "车辆名称", "机动车名称"], {
      stopLabels: ["车辆型号", "车辆识别代号", "发动机型号"],
    }) ||
      matchFirst(source, [
        /车辆类型[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/,
      ]) ||
      vehicleName,
  );
  const approvedLoad = normalizeNumeric(
    findValueNearLabel(lines, ["额定载质量(kg)", "额定载质量", "核定载质量", "额定载质量kg"], {
      stopLabels: ["整备质量", "总质量", "轴荷"],
    }) ||
      matchFirst(source, [
        /额定载质量(?:\(kg\))?[:：]?([0-9.]{1,10})/,
        /核定载质量[:：]?([0-9.]{1,10})/,
      ]),
  );
  const approvedPassengers = normalizeNumeric(
    findValueNearLabel(lines, ["驾驶室准乘人数(人)", "驾驶室准乘人数", "核定载人数"], {
      stopLabels: ["额定载客", "接近角", "额定载质量"],
    }) ||
      matchFirst(source, [
        /驾驶室准乘人数(?:\(人\))?[:：]?([0-9]{1,3})/,
        /核定载人数[:：]?([0-9]{1,3})/,
      ]),
  );
  const vehicleModel = cleanLabelValue(
    findValueNearLabel(lines, ["车辆型号"], {
      stopLabels: ["车辆识别代号", "车身颜色", "底盘型号"],
    }) ||
      matchFirst(source, [/车辆型号[:：]?([A-Z0-9\u4e00-\u9fa5\-]{6,80})/i]),
  );
  const brand = cleanLabelValue(
    findValueNearLabel(lines, ["车辆品牌", "商标", "品牌"], {
      stopLabels: ["车辆型号", "车辆名称"],
    }) ||
      matchFirst(source, [
        /车辆品牌[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,30})/,
        /商标[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,30})/,
      ]),
  );
  const brandModel =
    joinRecognizedParts(brand, vehicleModel) ||
    vehicleModel ||
    brand ||
    vehicleName;
  const engineNumber = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["发动机号码", "发动机号", "发动机型号"], {
      stopLabels: ["燃料种类", "排量", "功率"],
    }) || matchFirst(source, [/发动机号码[:：]?([A-Z0-9]{6,30})/i]),
  );
  const vin = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["车辆识别代号/车架号码", "车辆识别代号", "车架号码", "车架号"], {
      stopLabels: ["发动机型号", "底盘型号", "底盘ID"],
    }) ||
      matchFirst(source, [
        /车辆识别代号\/?车架号码[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车辆识别代号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车架号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
      ]),
  );
  const firstRegistrationDate = normalizeDate(
    findValueNearLabel(lines, ["发证日期", "车辆制造日期"], { nextLineOnly: true }) ||
      matchFirst(source, [
        /发证日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
        /车辆制造日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      ]),
  );

  return {
    plate: "新车未上牌",
    vehicleType: cleanLabelValue(vehicleType),
    brandModel: cleanLabelValue(brandModel),
    energyType:
      source.includes("纯电") || source.includes("新能源") || source.includes("燃料种类电")
        ? "新能源"
        : "",
    firstRegistrationDate,
    approvedPassengers,
    approvedLoad,
    engineNumber,
    vin,
    templateType: detectTemplateType(source),
    raw: lines.join("\n").trim(),
  };
}

function parseDrivingLicenseDocument(
  lines: string[],
  source: string,
): RecognizedDocument {
  const plate = normalizePlate(
    findValueNearLabel(lines, ["号牌号码"], {
      stopLabels: ["车辆类型", "所有人"],
    }) ||
      matchFirst(source, [
        /号牌号码[:：]?([A-Z\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6})/i,
        /号牌号码([A-Z\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6})/i,
      ]),
  );

  const owner = cleanLabelValue(
    findValueNearLabel(lines, ["所有人"], {
      stopLabels: ["住址", "使用性质", "品牌型号", "车辆类型"],
    }) ||
      matchFirst(source, [
        /所有人[:：]?([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,40})/,
        /姓名[:：]?([\u4e00-\u9fa5·]{2,12})/,
      ]),
  );

  const brandModel = cleanLabelValue(
    findValueNearLabel(lines, ["品牌型号", "厂牌型号"], {
      stopLabels: ["车辆识别代号", "发动机号码", "注册日期"],
    }) ||
      matchFirst(source, [
        /品牌型号[:：]?([A-Z0-9\u4e00-\u9fa5\-]{6,80})/i,
        /厂牌型号[:：]?([A-Z0-9\u4e00-\u9fa5\-]{6,80})/i,
      ]),
  );

  const vehicleType = cleanLabelValue(
    findValueNearLabel(lines, ["车辆类型"], {
      stopLabels: ["所有人", "住址", "使用性质", "品牌型号"],
    }) ||
      matchFirst(source, [
        /车辆类型[:：]?([\u4e00-\u9fa5A-Za-z0-9\-]{2,40})/,
      ]),
  );

  const usageNature = cleanLabelValue(
    findValueNearLabel(lines, ["使用性质"], {
      stopLabels: ["品牌型号", "车辆识别代号", "发动机号码"],
    }) ||
      matchFirst(source, [/使用性质[:：]?([\u4e00-\u9fa5]{2,12})/]),
  );

  const approvedPassengers = normalizeNumeric(
    findValueNearLabel(lines, ["核定载人数", "核定载客人数", "准乘人数"], {
      stopLabels: ["总质量", "整备质量", "核定载质量"],
    }) ||
      matchFirst(source, [
        /核定载人数[:：]?([0-9]{1,3})/,
        /核定载客人数[:：]?([0-9]{1,3})/,
        /准乘人数[:：]?([0-9]{1,3})/,
      ]),
  );

  const approvedLoad = normalizeNumeric(
    findValueNearLabel(lines, ["核定载质量", "总质量"], {
      stopLabels: ["外廓尺寸", "准牵引总质量"],
    }) ||
      matchFirst(source, [
        /核定载质量[:：]?([0-9.]{1,10})/,
        /总质量[:：]?([0-9.]{1,10})/,
      ]),
  );

  const engineNumber = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["发动机号码", "发动机号"], {
      stopLabels: ["注册日期", "发证日期"],
    }) ||
      matchFirst(source, [/发动机号码[:：]?([A-Z0-9]{6,30})/i]),
  );

  const vin = normalizeAlphaNumeric(
    findValueNearLabel(lines, ["车辆识别代号", "车架号码", "车辆识别代号/车架号码"], {
      stopLabels: ["发动机号码", "注册日期", "发证日期"],
    }) ||
      matchFirst(source, [
        /车辆识别代号[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
        /车架号码[:：]?([A-HJ-NPR-Z0-9]{11,30})/i,
      ]),
  );

  const firstRegistrationDate = normalizeDate(
    findValueNearLabel(lines, ["注册日期"], {
      stopLabels: ["发证日期", "核定载人数"],
    }) ||
      matchFirst(source, [
        /注册日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
        /发证日期[:：]?([0-9]{4}[年\-\/.][0-9]{1,2}[月\-\/.][0-9]{1,2}日?)/,
      ]),
  );

  const companyName = looksLikeCompanyName(owner) ? owner : "";
  const name = companyName ? "" : looksLikeChineseName(owner) ? owner : "";

  return {
    plate,
    vehicleType,
    brandModel,
    energyType:
      source.includes("新能源") || source.includes("纯电") || source.includes("燃料种类电")
        ? "新能源"
        : "",
    name,
    companyName,
    firstRegistrationDate,
    usageNature,
    approvedPassengers,
    approvedLoad,
    engineNumber,
    vin,
    templateType: detectTemplateType(source),
    raw: lines.join("\n").trim(),
  };
}

function parseTraditionalOcrText(text: string): RecognizedDocument {
  const source = compactText(text);
  const lines = getNormalizedLines(text);

  if (
    source.includes("中华人民共和国机动车行驶证") ||
    source.includes("机动车行驶证") ||
    (source.includes("号牌号码") &&
      source.includes("车辆类型") &&
      source.includes("所有人"))
  ) {
    return parseDrivingLicenseDocument(lines, source);
  }

  if (source.includes("统一发票") || source.includes("电子发票") || source.includes("购货方名称")) {
    return parseInvoiceDocument(lines, source);
  }

  if (source.includes("合格证") || source.includes("车辆制造企业名称") || source.includes("驾驶室准乘人数")) {
    return parseCertificateDocument(lines, source);
  }

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

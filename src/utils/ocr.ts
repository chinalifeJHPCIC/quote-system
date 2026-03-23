import { GoogleGenAI } from "@google/genai";

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
  templateType?: "新能源" | "机动车" | "特种车";
  raw?: string;
};

function getAiClient() {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 VITE_API_KEY，无法调用 OCR 识别。");
  }

  return new GoogleGenAI({ apiKey });
}

async function toBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("文件读取失败。"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("文件读取失败。"));
    reader.readAsDataURL(file);
  });
}

function extractJsonBlock(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch?.[0]?.trim() ?? text.trim();
}

export async function recognizeDocument(file: File) {
  const ai = getAiClient();
  const base64 = await toBase64(file);

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: file.type || "application/octet-stream",
              data: base64,
            },
          },
          {
            text: [
              "识别证件并输出 JSON。",
              "字段使用中文 key 对应的英文 JSON key，返回: plate, vehicleType, brandModel, energyType, name, companyName, firstRegistrationDate, usageNature, approvedPassengers, approvedLoad, templateType。",
              "templateType 只能返回 新能源、机动车、特种车 其中一个。",
              "如果是行驶证，尽量提取车牌号、车辆类型、厂牌型号、初次登记日期、使用性质、核定载客、核定载质量。",
              "如果是身份证，提取姓名。",
              "如果是营业执照，提取公司名称。",
              "无法识别时返回 {\"documentType\":\"unknown\",\"rawText\":\"...\"}。",
            ].join(" "),
          },
        ],
      },
    ],
  });

  return response.text ?? "";
}

export async function recognize(file: File): Promise<RecognizedDocument> {
  const text = await recognizeDocument(file);
  const jsonText = extractJsonBlock(text);

  try {
    return JSON.parse(jsonText) as RecognizedDocument;
  } catch {
    return { raw: text };
  }
}

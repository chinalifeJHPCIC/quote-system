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

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getOpenRouterConfig() {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const model =
    import.meta.env.VITE_OPENROUTER_MODEL || "openai/gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "缺少 VITE_OPENROUTER_API_KEY。请在启动 dev/build 的终端中先 export 再运行。",
    );
  }

  return {
    apiKey,
    model,
    baseUrl:
      import.meta.env.VITE_OPENROUTER_BASE_URL ||
      "https://openrouter.ai/api/v1",
    appName: import.meta.env.VITE_OPENROUTER_APP_NAME || "quote-system",
    siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL || window.location.origin,
  };
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
  const config = getOpenRouterConfig();
  const base64 = await toBase64(file);
  const imageUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.appName,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "请识别图片中的证件或报价信息，并只输出 JSON。",
                "返回字段: plate, vehicleType, brandModel, energyType, name, companyName, firstRegistrationDate, usageNature, approvedPassengers, approvedLoad, templateType。",
                "templateType 只能是 新能源、机动车、特种车 之一。",
                "如果是行驶证或报价单，尽量提取号牌号码、厂牌车型、初次登记日期、使用性质、核定载客、核定载质量。",
                "如果是身份证，提取姓名。",
                "如果是营业执照，提取 companyName。",
                "没有识别到的字段返回空字符串。",
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter 调用失败: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices?.[0]?.message?.content ?? "";
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

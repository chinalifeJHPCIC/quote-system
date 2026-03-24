import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { recognize, saveRecognizedDocument } from "../utils/ocr";

export default function Upload() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");
    setResult("");
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    });

    try {
      const nextResult = await recognize(file);
      saveRecognizedDocument(nextResult);
      setResult(JSON.stringify(nextResult, null, 2));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "证件识别失败，请稍后再试。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="card upload-card">
        <div className="heading-row">
          <div>
            <p className="eyebrow">OCR</p>
            <h1>证件识别</h1>
            <p className="intro">
              上传行驶证、合格证或发票，使用传统 OCR 定向提取关键字段并映射成 JSON。
            </p>
          </div>
          <Link className="secondary-link" to="/">
            返回首页
          </Link>
        </div>

        <input
          className="upload-input"
          type="file"
          accept="image/*,.pdf"
          onChange={handleUpload}
        />

        {previewUrl ? (
          <div className="upload-preview-card">
            <img alt="上传预览" className="upload-preview-image" src={previewUrl} />
          </div>
        ) : null}

        <p className="status-text">
          {isLoading
            ? "识别中..."
            : "当前优先使用浏览器端传统 OCR，无需模型 API Key。"}
        </p>

        {error ? <div className="result-block">{error}</div> : null}
        {result ? <pre className="result-block">{result}</pre> : null}
      </div>
    </div>
  );
}

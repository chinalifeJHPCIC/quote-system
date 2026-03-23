import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { recognize } from "../utils/ocr";

export default function Upload() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");
    setResult("");

    try {
      const nextResult = await recognize(file);
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
              上传行驶证、身份证或营业执照，调用 Gemini 返回 JSON 识别结果。
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

        <p className="status-text">
          {isLoading
            ? "识别中..."
            : "请确保已在 .env 中配置 VITE_API_KEY。"}
        </p>

        {error ? <div className="result-block">{error}</div> : null}
        {result ? <pre className="result-block">{result}</pre> : null}
      </div>
    </div>
  );
}

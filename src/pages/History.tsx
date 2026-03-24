import { Link, useNavigate } from "react-router-dom";
import {
  formatHistoryTime,
  readQuoteHistory,
  saveHistoryRestoreEntry,
  type QuoteHistoryEntry,
} from "../utils/quoteHistory";

function getInsuredDisplayName(entry: QuoteHistoryEntry) {
  return entry.form.companyName || entry.form.insuredName || "________";
}

export default function History() {
  const navigate = useNavigate();
  const history = readQuoteHistory();

  const handleRestore = (entry: QuoteHistoryEntry) => {
    saveHistoryRestoreEntry(entry);
    navigate("/quote");
  };

  return (
    <div className="page-shell quote-page">
      <div className="card quote-card quote-workbench">
        <div className="heading-row">
          <div>
            <p className="eyebrow">History</p>
            <h1 className="quote-title">报价历史记录</h1>
            <p className="intro">支持查看、回滚并回填到当前报价页。</p>
          </div>
          <div className="action-row">
            <Link className="secondary-link" to="/">
              返回首页
            </Link>
            <Link className="secondary-link" to="/quote">
              返回报价页
            </Link>
          </div>
        </div>

        <section className="editor-panel quote-panel">
          {history.length ? (
            <div className="history-list history-page-list">
              {history.map((entry) => (
                <div className="history-item history-item-card" key={entry.id}>
                  <span>{formatHistoryTime(entry.createdAt)}</span>
                  <span>{entry.templateKind}</span>
                  <span>{entry.form.plate || "未识别车牌"}</span>
                  <span>{getInsuredDisplayName(entry)}</span>
                  <button
                    className="secondary-link"
                    onClick={() => handleRestore(entry)}
                    type="button"
                  >
                    回滚回填
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-text">当前还没有保存的报价历史。</p>
          )}
        </section>
      </div>
    </div>
  );
}

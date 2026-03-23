import { Link, Route, Routes } from "react-router-dom";
import Quote from "./pages/Quote";
import Upload from "./pages/Upload";

function Home() {
  return (
    <div className="page-shell">
      <div className="card">
        <p className="eyebrow">Insurance Tool</p>
        <h1>报价系统</h1>
        <p className="intro">
          独立仓库已创建，现已接入报价、证件识别和 PDF 导出流程。
        </p>
        <div className="home-actions">
          <Link className="primary-link" to="/quote">
            进入报价页
          </Link>
          <Link className="secondary-link" to="/upload">
            证件识别
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quote" element={<Quote />} />
      <Route path="/upload" element={<Upload />} />
    </Routes>
  );
}

import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <h1>MSSQL to PostgreSQL 資料庫遷移工具</h1>
      <p className="subtitle">輕鬆將您的 Microsoft SQL Server 資料庫遷移至 PostgreSQL</p>

      <div className="features">
        <div className="feature-card" onClick={() => navigate('/connection')}>
          <div className="icon">🔌</div>
          <h3>連線設定</h3>
          <p>設定來源 (MSSQL) 與目標 (PostgreSQL) 資料庫連線</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/migration')}>
          <div className="icon">📦</div>
          <h3>資料遷移</h3>
          <p>選擇要遷移的資料表、Schema 和資料</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/validation')}>
          <div className="icon">✓</div>
          <h3>資料驗證</h3>
          <p>驗證遷移後的資料完整性</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/history')}>
          <div className="icon">📋</div>
          <h3>歷史紀錄</h3>
          <p>檢視過去的遷移紀錄與日誌</p>
        </div>
      </div>

      <div className="quick-start">
        <h2>快速開始</h2>
        <ol>
          <li>前往「連線設定」設定來源與目標資料庫</li>
          <li>在「資料遷移」頁面選擇要遷移的內容</li>
          <li>執行遷移並監控進度</li>
          <li>使用「資料驗證」確認遷移結果</li>
        </ol>
      </div>
    </div>
  );
}

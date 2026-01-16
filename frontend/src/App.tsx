import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Connection from './pages/Connection';
import Migration from './pages/Migration';
import Validation from './pages/Validation';
import History from './pages/History';
import './App.css';

function App() {
  const navItems = [
    { path: '/', label: '首頁', icon: '🏠' },
    { path: '/connection', label: '連線設定', icon: '🔌' },
    { path: '/migration', label: '資料遷移', icon: '📦' },
    { path: '/validation', label: '資料驗證', icon: '✓' },
    { path: '/history', label: '歷史紀錄', icon: '📋' }
  ];

  return (
    <HashRouter>
      <div className="app-container">
        <nav className="sidebar">
          <div className="logo">
            <h1>MSSQL → PostgreSQL</h1>
            <p>資料庫遷移工具</p>
          </div>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="version">v1.0.0</div>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/connection" element={<Connection />} />
            <Route path="/migration" element={<Migration />} />
            <Route path="/validation" element={<Validation />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;

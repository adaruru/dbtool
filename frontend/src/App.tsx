import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from './stores/themeStore';
import Home from './pages/Home';
import Connection from './pages/Connection';
import Migration from './pages/Migration';
import Validation from './pages/Validation';
import History from './pages/History';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useThemeStore();

  const navItems = [
    { path: '/', label: t('nav.home'), icon: '🏠' },
    { path: '/connection', label: t('nav.connection'), icon: '🔌' },
    { path: '/migration', label: t('nav.migration'), icon: '📦' },
    { path: '/validation', label: t('nav.validation'), icon: '✓' },
    { path: '/history', label: t('nav.history'), icon: '📋' }
  ];

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <HashRouter>
      <div className="app-container">
        <nav className="sidebar">
          <div className="logo">
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
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
          <div className="sidebar-settings">
            <div className="settings-item">
              <label>{t('settings.language')}</label>
              <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="settings-item">
              <label>{t('settings.theme')}</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
              >
                <option value="light">{t('settings.themeLight')}</option>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="system">{t('settings.themeSystem')}</option>
              </select>
            </div>
          </div>
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

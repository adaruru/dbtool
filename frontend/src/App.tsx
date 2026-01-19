import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from './stores/themeStore';
import Home from './pages/Home';
import Connection from './pages/Connection';
import Migration from './pages/Migration';
import Validation from './pages/Validation';
import History from './pages/History';

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
      <div className="flex min-h-screen bg-panel-bg">
        <nav className="w-56 bg-gradient-to-b from-sidebar-from to-sidebar-to text-sidebar-text-active flex flex-col fixed h-screen">
          <div className="px-6 py-5 border-b border-sidebar-text/20">
            <h1 className="text-lg font-semibold text-sidebar-text-active mb-1">{t('app.title')}</h1>
            <p className="text-sidebar-text text-sm">{t('app.subtitle')}</p>
          </div>
          <ul className="flex-1 py-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center px-6 py-3 text-sidebar-text hover:bg-sidebar-text/10 hover:text-sidebar-text-active transition-colors ${
                      isActive ? 'bg-sidebar-text/15 text-sidebar-text-active border-r-2 border-accent' : ''
                    }`
                  }
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="border-t border-sidebar-text/20 p-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-sidebar-text">{t('settings.language')}</label>
              <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 bg-sidebar-from border border-sidebar-text/30 rounded text-sidebar-text-active text-sm focus:outline-none focus:ring-2 focus:ring-accent [&>option]:bg-sidebar-from [&>option]:text-white"
              >
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-sidebar-text">{t('settings.theme')}</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
                className="w-full px-3 py-2 bg-sidebar-from border border-sidebar-text/30 rounded text-sidebar-text-active text-sm focus:outline-none focus:ring-2 focus:ring-accent [&>option]:bg-sidebar-from [&>option]:text-white"
              >
                <option value="light">{t('settings.themeLight')}</option>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="system">{t('settings.themeSystem')}</option>
              </select>
            </div>
          </div>
          <div className="p-4 text-sidebar-text text-xs opacity-70">v1.0.0</div>
        </nav>
        <main className="flex-1 ml-56 custom-scrollbar">
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

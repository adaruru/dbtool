import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeTest from '../components/ThemeTest';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-panel-bg p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            {t('home.title')}
          </h1>
          <p className="text-xl text-text-secondary">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="bg-card-bg border border-border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/connection')}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔌</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t('home.connectionTitle')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('home.connectionDesc')}
            </p>
          </div>

          <div 
            className="bg-card-bg border border-border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/migration')}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📦</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t('home.migrationTitle')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('home.migrationDesc')}
            </p>
          </div>

          <div 
            className="bg-card-bg border border-border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/validation')}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">✓</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t('home.validationTitle')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('home.validationDesc')}
            </p>
          </div>

          <div 
            className="bg-card-bg border border-border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/history')}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📋</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t('home.historyTitle')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('home.historyDesc')}
            </p>
          </div>
        </div>

        <div className="bg-card-bg border border-border rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            {t('home.quickStart')}
          </h2>
          <ol className="space-y-2 text-text-secondary">
            <li className="flex items-start">
              <span className="bg-accent text-sidebar-text-active rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
              {t('home.step1')}
            </li>
            <li className="flex items-start">
              <span className="bg-accent text-sidebar-text-active rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
              {t('home.step2')}
            </li>
            <li className="flex items-start">
              <span className="bg-accent text-sidebar-text-active rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
              {t('home.step3')}
            </li>
            <li className="flex items-start">
              <span className="bg-accent text-sidebar-text-active rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
              {t('home.step4')}
            </li>
          </ol>
        </div>

        {/* 主題測試組件 - 僅開發模式顯示 */}
        {import.meta.env.DEV && (
          <div className="bg-card-bg border border-border rounded-lg">
            <ThemeTest />
          </div>
        )}
      </div>
    </div>
  );
}

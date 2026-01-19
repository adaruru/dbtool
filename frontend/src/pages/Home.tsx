import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="home">
      <h1>{t('home.title')}</h1>
      <p className="subtitle">{t('home.subtitle')}</p>

      <div className="features">
        <div className="feature-card" onClick={() => navigate('/connection')}>
          <div className="icon">🔌</div>
          <h3>{t('home.connectionTitle')}</h3>
          <p>{t('home.connectionDesc')}</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/migration')}>
          <div className="icon">📦</div>
          <h3>{t('home.migrationTitle')}</h3>
          <p>{t('home.migrationDesc')}</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/validation')}>
          <div className="icon">✓</div>
          <h3>{t('home.validationTitle')}</h3>
          <p>{t('home.validationDesc')}</p>
        </div>

        <div className="feature-card" onClick={() => navigate('/history')}>
          <div className="icon">📋</div>
          <h3>{t('home.historyTitle')}</h3>
          <p>{t('home.historyDesc')}</p>
        </div>
      </div>

      <div className="quick-start">
        <h2>{t('home.quickStart')}</h2>
        <ol>
          <li>{t('home.step1')}</li>
          <li>{t('home.step2')}</li>
          <li>{t('home.step3')}</li>
          <li>{t('home.step4')}</li>
        </ol>
      </div>
    </div>
  );
}

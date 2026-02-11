import { useTranslation } from 'react-i18next';

interface RerunBannerProps {
  name: string | null;
  onClear: () => void;
}

export default function RerunBanner({ name, onClear }: RerunBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-accent-light/30 border border-accent/50 rounded-lg px-4 py-3 mb-5 flex items-center justify-between gap-4">
      <span className="text-text-primary text-sm">
        {t('migration.rerunBanner')}
        {name ? `: ${name}` : ''}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-1.5 text-sm rounded-md border border-border bg-card-bg text-text-secondary hover:bg-accent hover:text-white transition-colors"
      >
        {t('migration.rerunClear')}
      </button>
    </div>
  );
}

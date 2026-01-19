import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const getEffectiveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  
  const htmlElement = document.documentElement;
  console.log('應用主題:', theme);
  
  // 使用 toggle 方法更可靠
  htmlElement.classList.toggle('dark', theme === 'dark');
  
  // 設置 data-theme 屬性（保留向後相容性）
  htmlElement.setAttribute('data-theme', theme);
  console.log('HTML classes:', htmlElement.className);
  console.log('Has dark class:', htmlElement.classList.contains('dark'));
};

const savedMode = (localStorage.getItem('theme') as ThemeMode) || 'system';
const initialEffective = getEffectiveTheme(savedMode);
applyTheme(initialEffective);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: savedMode,
  effectiveTheme: initialEffective,
  setMode: (mode) => {
    localStorage.setItem('theme', mode);
    const effective = getEffectiveTheme(mode);
    applyTheme(effective);
    set({ mode, effectiveTheme: effective });
  }
}));

// Listen for system theme changes
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      const effective = getSystemTheme();
      applyTheme(effective);
      useThemeStore.setState({ effectiveTheme: effective });
    }
  });
}

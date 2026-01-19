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
  document.documentElement.setAttribute('data-theme', theme);
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

export type ThemeId = 
  | 'cyber-dark' 
  | 'dracula' 
  | 'tokyo-night' 
  | 'nord' 
  | 'oled-black' 
  | 'cyberpunk-2077' 
  | 'matrix-emerald';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  category: string;
  icon: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    secondary: string;
  };
  variables: Record<string, string>;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cyber-dark',
    name: 'Cyber Dark (Padrão)',
    category: 'Cyberpunk & SOC',
    icon: '🌑',
    previewColors: {
      bg: '#09090b',
      card: '#121216',
      accent: '#10b981',
      secondary: '#06b6d4'
    },
    variables: {
      '--bg-main': '#09090b',
      '--bg-card': 'rgba(18, 18, 23, 0.75)',
      '--bg-card-hover': 'rgba(26, 26, 33, 0.9)',
      '--bg-panel': 'rgba(12, 12, 16, 0.85)',
      '--border-color': 'rgba(255, 255, 255, 0.08)',
      '--border-highlight': 'rgba(16, 185, 129, 0.4)',
      '--text-primary': '#f4f4f5',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#71717a',
      '--accent-color': '#10b981',
      '--accent-glow': 'rgba(16, 185, 129, 0.3)',
      '--accent-secondary': '#06b6d4',
      '--header-bg': 'rgba(9, 9, 11, 0.85)',
      '--badge-bg': 'rgba(16, 185, 129, 0.12)',
    }
  },
  {
    id: 'dracula',
    name: 'Dracula Pro',
    category: 'Vampire Dark',
    icon: '🧛',
    previewColors: {
      bg: '#1e1f29',
      card: '#282a36',
      accent: '#ff79c6',
      secondary: '#bd93f9'
    },
    variables: {
      '--bg-main': '#1e1f29',
      '--bg-card': 'rgba(40, 42, 54, 0.8)',
      '--bg-card-hover': 'rgba(52, 55, 70, 0.95)',
      '--bg-panel': 'rgba(30, 31, 41, 0.9)',
      '--border-color': 'rgba(189, 147, 249, 0.15)',
      '--border-highlight': 'rgba(255, 121, 198, 0.5)',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#e2e8f0',
      '--text-muted': '#6272a4',
      '--accent-color': '#ff79c6',
      '--accent-glow': 'rgba(255, 121, 198, 0.35)',
      '--accent-secondary': '#bd93f9',
      '--header-bg': 'rgba(30, 31, 41, 0.9)',
      '--badge-bg': 'rgba(255, 121, 198, 0.15)',
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'Neo-Tokyo',
    icon: '🌌',
    previewColors: {
      bg: '#16161e',
      card: '#1a1b26',
      accent: '#7aa2f7',
      secondary: '#bb9af7'
    },
    variables: {
      '--bg-main': '#16161e',
      '--bg-card': 'rgba(26, 27, 38, 0.8)',
      '--bg-card-hover': 'rgba(36, 38, 54, 0.95)',
      '--bg-panel': 'rgba(22, 22, 30, 0.9)',
      '--border-color': 'rgba(122, 162, 247, 0.15)',
      '--border-highlight': 'rgba(122, 162, 247, 0.5)',
      '--text-primary': '#c0caf5',
      '--text-secondary': '#9aa5ce',
      '--text-muted': '#565f89',
      '--accent-color': '#7aa2f7',
      '--accent-glow': 'rgba(122, 162, 247, 0.35)',
      '--accent-secondary': '#bb9af7',
      '--header-bg': 'rgba(22, 22, 30, 0.9)',
      '--badge-bg': 'rgba(122, 162, 247, 0.15)',
    }
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    category: 'Arctic Clean',
    icon: '❄️',
    previewColors: {
      bg: '#242933',
      card: '#2e3440',
      accent: '#88c0d0',
      secondary: '#81a1c1'
    },
    variables: {
      '--bg-main': '#242933',
      '--bg-card': 'rgba(46, 52, 64, 0.8)',
      '--bg-card-hover': 'rgba(59, 66, 82, 0.95)',
      '--bg-panel': 'rgba(36, 41, 51, 0.9)',
      '--border-color': 'rgba(136, 192, 208, 0.15)',
      '--border-highlight': 'rgba(136, 192, 208, 0.5)',
      '--text-primary': '#eceff4',
      '--text-secondary': '#d8dee9',
      '--text-muted': '#7e889b',
      '--accent-color': '#88c0d0',
      '--accent-glow': 'rgba(136, 192, 208, 0.35)',
      '--accent-secondary': '#81a1c1',
      '--header-bg': 'rgba(36, 41, 51, 0.9)',
      '--badge-bg': 'rgba(136, 192, 208, 0.15)',
    }
  },
  {
    id: 'oled-black',
    name: 'Midnight OLED',
    category: 'True Black',
    icon: '🖤',
    previewColors: {
      bg: '#000000',
      card: '#0c0c0e',
      accent: '#3b82f6',
      secondary: '#f59e0b'
    },
    variables: {
      '--bg-main': '#000000',
      '--bg-card': 'rgba(12, 12, 14, 0.9)',
      '--bg-card-hover': 'rgba(20, 20, 24, 1)',
      '--bg-panel': 'rgba(8, 8, 10, 0.95)',
      '--border-color': 'rgba(255, 255, 255, 0.12)',
      '--border-highlight': 'rgba(59, 130, 246, 0.5)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#d4d4d8',
      '--text-muted': '#71717a',
      '--accent-color': '#3b82f6',
      '--accent-glow': 'rgba(59, 130, 246, 0.4)',
      '--accent-secondary': '#f59e0b',
      '--header-bg': 'rgba(0, 0, 0, 0.95)',
      '--badge-bg': 'rgba(59, 130, 246, 0.15)',
    }
  },
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    category: 'Night City',
    icon: '⚡',
    previewColors: {
      bg: '#0d0f18',
      card: '#151926',
      accent: '#fcee0a',
      secondary: '#00f0ff'
    },
    variables: {
      '--bg-main': '#0d0f18',
      '--bg-card': 'rgba(21, 25, 38, 0.85)',
      '--bg-card-hover': 'rgba(29, 35, 52, 0.95)',
      '--bg-panel': 'rgba(15, 18, 28, 0.95)',
      '--border-color': 'rgba(252, 238, 10, 0.2)',
      '--border-highlight': 'rgba(252, 238, 10, 0.7)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#e2e8f0',
      '--text-muted': '#7b879d',
      '--accent-color': '#fcee0a',
      '--accent-glow': 'rgba(252, 238, 10, 0.45)',
      '--accent-secondary': '#00f0ff',
      '--header-bg': 'rgba(13, 15, 24, 0.95)',
      '--badge-bg': 'rgba(252, 238, 10, 0.18)',
    }
  },
  {
    id: 'matrix-emerald',
    name: 'Emerald Matrix',
    category: 'Terminal Green',
    icon: '🟢',
    previewColors: {
      bg: '#030c05',
      card: '#07180c',
      accent: '#00ff66',
      secondary: '#10b981'
    },
    variables: {
      '--bg-main': '#030c05',
      '--bg-card': 'rgba(7, 24, 12, 0.85)',
      '--bg-card-hover': 'rgba(11, 36, 18, 0.95)',
      '--bg-panel': 'rgba(4, 15, 7, 0.95)',
      '--border-color': 'rgba(0, 255, 102, 0.18)',
      '--border-highlight': 'rgba(0, 255, 102, 0.6)',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#a7f3d0',
      '--text-muted': '#059669',
      '--accent-color': '#00ff66',
      '--accent-glow': 'rgba(0, 255, 102, 0.4)',
      '--accent-secondary': '#10b981',
      '--header-bg': 'rgba(3, 12, 5, 0.95)',
      '--badge-bg': 'rgba(0, 255, 102, 0.15)',
    }
  }
];

export function applyThemeToDocument(themeId: ThemeId) {
  if (typeof document === 'undefined') return;
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }

  root.setAttribute('data-theme', theme.id);
  try {
    localStorage.setItem('nexus_theme_id', theme.id);
  } catch {}
}

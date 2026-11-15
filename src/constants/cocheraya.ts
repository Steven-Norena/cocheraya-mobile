import { useColorScheme } from '../hooks/use-color-scheme';

const light = {
  background: '#F8F6F1', surface: '#FFFDF9', field: '#F5F2ED', ink: '#211D35', secondary: '#595467',
  outline: '#E4DFE9', accent: '#5638C6', onAccent: '#FFFFFF', selected: '#EEE8FF',
  success: '#246951', successBg: '#E1F2E8', danger: '#A22146', warning: '#865307',
};

const dark: typeof light = {
  background: '#181621', surface: '#211E2D', field: '#2B273A', ink: '#F8F5FE', secondary: '#C6BED3',
  outline: '#413A52', accent: '#C5B4FF', onAccent: '#26194D', selected: '#34284F',
  success: '#A2E2C6', successBg: '#254738', danger: '#FFA9C0', warning: '#FFCF85',
};

export function useCocheraTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

export const cocheraFonts = { regular: 'DMSans_400Regular', medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

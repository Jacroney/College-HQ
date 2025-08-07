import { createTheme, alpha } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    gradients: {
      primary: string;
      secondary: string;
      success: string;
      info: string;
      warning: string;
      error: string;
    };
  }
  
  interface PaletteOptions {
    neutral?: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    gradients?: {
      primary: string;
      secondary: string;
      success: string;
      info: string;
      warning: string;
      error: string;
    };
  }

  interface TypeBackground {
    neutral: string;
    paperInvert: string;
  }
}

// 60-30-10 Color Palette - Lighter & Warmer
// 60% - Primary background (warm light colors)
// 30% - Secondary elements (warm medium colors)
// 10% - Accent colors (warm bright colors)

// Primary Colors (60% - Background) - Warmer & Lighter
const PRIMARY = {
  light: '#F0F8FF', // Very light warm blue
  main: '#7BB3FF',  // Warm sky blue
  dark: '#5A9BFF',  // Deeper warm blue
  contrastText: '#FFFFFF',
};

// Secondary Colors (30% - Sidebars, Cards) - Warmer & Lighter
const SECONDARY = {
  light: '#F5F9FF', // Very light warm blue-grey
  main: '#8BB8E8',  // Warm medium blue
  dark: '#6B9BC8',  // Warmer medium blue
  contrastText: '#FFFFFF',
};

// Accent Colors (10% - Buttons, Highlights) - Warmer & Brighter
const ACCENT = {
  light: '#FFE8D6', // Soft warm coral
  main: '#FF8A65',  // Warm coral
  dark: '#FF7043',  // Deeper warm coral
  contrastText: '#FFFFFF',
};

const INFO = {
  light: '#E3F2FD',
  main: '#64B5F6', // Warmer blue
  dark: '#42A5F5',
  contrastText: '#FFFFFF',
};

const SUCCESS = {
  light: '#E8F5E8',
  main: '#81C784', // Warmer green
  dark: '#66BB6A',
  contrastText: '#FFFFFF',
};

const WARNING = {
  light: '#FFF8E1',
  main: '#FFB74D', // Warmer orange
  dark: '#FFA726',
  contrastText: '#212121',
};

const ERROR = {
  light: '#FFEBEE',
  main: '#E57373', // Warmer red
  dark: '#EF5350',
  contrastText: '#FFFFFF',
};

// Updated GREY palette to be warmer and lighter
const GREY = {
  0: '#FFFFFF',
  50: '#F8FBFF',   // Very light warm blue-tinted
  100: '#F0F7FF',  // Light warm blue-grey
  200: '#E5F0FF',  // Light grey with warm blue tint
  300: '#D1E3FF',  // Medium warm grey
  400: '#B8D1F0',  // Medium-dark warm grey
  500: '#8BA3C7',  // Neutral warm grey
  600: '#6B7A94',  // Dark warm grey
  700: '#4F5A6B',  // Darker warm grey
  800: '#2F3742',  // Very dark warm grey
  900: '#1A1F24',  // Almost black with warm tint
};

// Base theme options
const baseTheme: ThemeOptions = {
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  palette: {
    primary: PRIMARY,
    secondary: SECONDARY,
    info: INFO,
    success: SUCCESS,
    warning: WARNING,
    error: ERROR,
    neutral: {
      main: GREY[500],
      light: GREY[300],
      dark: GREY[700],
      contrastText: '#FFFFFF',
    },
    gradients: {
      primary: `linear-gradient(135deg, ${PRIMARY.main} 0%, ${PRIMARY.light} 100%)`,
      secondary: `linear-gradient(135deg, ${SECONDARY.main} 0%, ${SECONDARY.light} 100%)`,
      info: `linear-gradient(135deg, ${INFO.main} 0%, ${INFO.light} 100%)`,
      success: `linear-gradient(135deg, ${SUCCESS.main} 0%, ${SUCCESS.light} 100%)`,
      warning: `linear-gradient(135deg, ${WARNING.main} 0%, ${WARNING.light} 100%)`,
      error: `linear-gradient(135deg, ${ERROR.main} 0%, ${ERROR.light} 100%)`,
    },
    background: {
      default: GREY[100],   // 60% - Light warm blue background
      paper: '#FFFFFF',     // White cards
      neutral: GREY[200],   // Light warm blue-grey
      paperInvert: GREY[900],
    },
    text: {
      primary: GREY[900],
      secondary: GREY[600],
      disabled: GREY[400],
    },
    divider: alpha(GREY[500], 0.12),
    action: {
      hover: alpha(PRIMARY.main, 0.08),
      selected: alpha(PRIMARY.main, 0.16),
      disabled: alpha(GREY[500], 0.4),
      disabledBackground: alpha(GREY[500], 0.12),
      focus: alpha(PRIMARY.main, 0.2),
      hoverOpacity: 0.08,
      disabledOpacity: 0.4,
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 800,
      fontSize: '3rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: GREY[900],
    },
    h2: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      color: GREY[900],
    },
    h3: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      color: GREY[900],
    },
    h4: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      color: GREY[900],
    },
    h5: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      color: GREY[900],
    },
    h6: {
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.125rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: GREY[600],
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 700,
      letterSpacing: '0.5px',
      lineHeight: 1.5,
      textTransform: 'uppercase',
      color: GREY[600],
    },
    subtitle1: {
      fontWeight: 600,
      lineHeight: 1.5,
      color: GREY[800],
    },
    subtitle2: {
      fontWeight: 500,
      lineHeight: 1.5,
      color: GREY[700],
    },
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.04)',
    '0px 4px 8px -2px rgba(0, 0, 0, 0.06), 0px 2px 4px -2px rgba(0, 0, 0, 0.03)',
    '0px 12px 16px -4px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.03)',
    '0px 20px 24px -4px rgba(0, 0, 0, 0.08), 0px 12px 16px -4px rgba(0, 0, 0, 0.03)',
    '0px 24px 48px -12px rgba(0, 0, 0, 0.12), 0px 16px 32px -4px rgba(0, 0, 0, 0.04)',
    '0px 32px 64px -12px rgba(0, 0, 0, 0.16), 0px 20px 40px -4px rgba(0, 0, 0, 0.05)',
    '0px 40px 80px -16px rgba(0, 0, 0, 0.18), 0px 24px 48px -8px rgba(0, 0, 0, 0.06)',
    '0px 48px 96px -20px rgba(0, 0, 0, 0.20), 0px 32px 64px -12px rgba(0, 0, 0, 0.08)',
    '0px 64px 128px -24px rgba(0, 0, 0, 0.22), 0px 40px 80px -16px rgba(0, 0, 0, 0.10)',
    '0px 80px 160px -28px rgba(0, 0, 0, 0.24), 0px 48px 96px -20px rgba(0, 0, 0, 0.12)',
    '0px 96px 192px -32px rgba(0, 0, 0, 0.26), 0px 64px 128px -24px rgba(0, 0, 0, 0.14)',
    '0px 112px 224px -36px rgba(0, 0, 0, 0.28), 0px 80px 160px -28px rgba(0, 0, 0, 0.16)',
    '0px 128px 256px -40px rgba(0, 0, 0, 0.30), 0px 96px 192px -32px rgba(0, 0, 0, 0.18)',
    '0px 144px 288px -44px rgba(0, 0, 0, 0.32), 0px 112px 224px -36px rgba(0, 0, 0, 0.20)',
    '0px 160px 320px -48px rgba(0, 0, 0, 0.34), 0px 128px 256px -40px rgba(0, 0, 0, 0.22)',
    '0px 176px 352px -52px rgba(0, 0, 0, 0.36), 0px 144px 288px -44px rgba(0, 0, 0, 0.24)',
    '0px 192px 384px -56px rgba(0, 0, 0, 0.38), 0px 160px 320px -48px rgba(0, 0, 0, 0.26)',
    '0px 208px 416px -60px rgba(0, 0, 0, 0.40), 0px 176px 352px -52px rgba(0, 0, 0, 0.28)',
    '0px 224px 448px -64px rgba(0, 0, 0, 0.42), 0px 192px 384px -56px rgba(0, 0, 0, 0.30)',
    '0px 240px 480px -68px rgba(0, 0, 0, 0.44), 0px 208px 416px -60px rgba(0, 0, 0, 0.32)',
    '0px 256px 512px -72px rgba(0, 0, 0, 0.46), 0px 224px 448px -64px rgba(0, 0, 0, 0.34)',
    '0px 272px 544px -76px rgba(0, 0, 0, 0.48), 0px 240px 480px -68px rgba(0, 0, 0, 0.36)',
    '0px 288px 576px -80px rgba(0, 0, 0, 0.50), 0px 256px 512px -72px rgba(0, 0, 0, 0.38)',
    '0px 300px 600px -84px rgba(0, 0, 0, 0.52), 0px 272px 544px -76px rgba(0, 0, 0, 0.40)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1rem',
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease-in-out',
          background: '#FFFFFF',
          '&:hover': {
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: GREY[50],
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: GREY[400],
          },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
            boxShadow: `0 0 0 3px ${alpha(PRIMARY.main, 0.15)}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1,
            borderColor: PRIMARY.main,
          },
          '&.Mui-error': {
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(ERROR.main, 0.15)}`,
            },
          },
        },
        input: {
          padding: '12px 16px',
          '&::placeholder': {
            color: GREY[500],
            opacity: 1,
          },
        },
        notchedOutline: {
          borderColor: GREY[300],
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: GREY[700],
          fontWeight: 500,
          marginBottom: 4,
          display: 'block',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: GREY[800],
          fontSize: '0.8125rem',
          padding: '6px 12px',
          borderRadius: 6,
        },
        arrow: {
          color: GREY[800],
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: GREY[200],
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          '&.MuiChip-colorDefault': {
            backgroundColor: GREY[200],
            color: GREY[800],
          },
        },
      },
    },
  },
};

// Create theme instance with light mode as default
const theme = createTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    mode: 'light',
  },
});

export default theme;
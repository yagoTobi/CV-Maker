import type { Theme } from '@aws-amplify/ui-react';

export const authTheme: Theme = {
  name: 'cv-maker-auth-theme',
  tokens: {
    fonts: {
      default: {
        variable: { value: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" },
        static: { value: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" },
      },
    },
    colors: {
      brand: {
        primary: {
          10: { value: '#DBEAFE' },   // --accent-light
          20: { value: '#DBEAFE' },
          40: { value: '#93C5FD' },
          60: { value: '#3B82F6' },   // --accent
          80: { value: '#2563EB' },   // --accent-hover
          90: { value: '#1D4ED8' },
          100: { value: '#1E40AF' },
        },
      },
      font: {
        primary: { value: '#1E293B' },     // --text-primary
        secondary: { value: '#64748B' },   // --text-secondary
        interactive: { value: '#3B82F6' }, // --accent
      },
      background: {
        primary: { value: '#F8FAFC' },   // --bg-primary
        secondary: { value: '#FFFFFF' }, // --bg-secondary
      },
      border: {
        primary: { value: '#E2E8F0' },   // --border-color
        secondary: { value: '#CBD5E1' }, // --border-strong
      },
    },
    radii: {
      small: { value: '6px' },   // --radius-sm
      medium: { value: '8px' },  // --radius
      large: { value: '12px' },  // --radius-lg
    },
  },
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          bg: {
            light: '#F2F2F7',
            dark: '#000000',
          },
          card: {
            light: '#FFFFFF',
            dark: '#1C1C1E',
          },
          cardSecondary: {
            light: '#F2F2F7',
            dark: '#2C2C2E',
          },
          border: {
            light: '#E5E5EA',
            dark: '#2C2C2E',
          },
          separator: {
            light: '#C6C6C8',
            dark: '#38383A',
          },
          green: '#34C759',
          red: '#FF3B30',
          blue: '#007AFF',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          teal: '#5AC8FA',
          gray: {
            1: '#8E8E93',
            2: '#AEAEB2',
            3: '#C7C7CC',
            4: '#D1D1D6',
            5: '#E5E5EA',
            6: '#F2F2F7',
          }
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ]
      },
      boxShadow: {
        'ios-sm': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'ios': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 12px 36px rgba(0, 0, 0, 0.12)',
        'ios-sheet': '0 -10px 40px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors (kept for backward compatibility)
        lumaBlue: {
          50: '#f0f7ff',
          100: '#e1f1ff',
          200: '#bfe4ff',
          300: '#7cc9ff',
          400: '#4bb5ff',
          500: '#2d9dff',
          600: '#0070f3',
          700: '#0061d5',
          800: '#0050ad',
          900: '#004291',
        },
        // Neutral colors for dark mode
        slate: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Deep midnight surfaces
        ink: {
          950: '#070912',
          900: '#0D1220',
          850: '#11182A',
          800: '#161F34',
          700: '#1E2A44',
          600: '#2A3A5C',
        },
        // Aurora accent palette
        luma: {
          violet: '#7C3AED',
          violetLight: '#A78BFA',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          pink: '#EC4899',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glowViolet: '0 0 24px rgba(124, 58, 237, 0.35)',
        glowCyan: '0 0 24px rgba(6, 182, 212, 0.3)',
        glowSoft: '0 8px 40px rgba(0, 0, 0, 0.45)',
        glowCard: '0 4px 32px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'luma-gradient': 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
        'aurora-gradient': 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)',
        'text-gradient': 'linear-gradient(120deg, #A78BFA 0%, #7C3AED 35%, #3B82F6 70%, #06B6D4 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'aurora-drift': 'auroraDrift 24s ease-in-out infinite alternate',
        'page-in': 'pageIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'hero-in': 'heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
        'float-slow': 'floatSlow 9s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        auroraDrift: {
          '0%': { transform: 'translate3d(-6%, -4%, 0) scale(1)' },
          '50%': { transform: 'translate3d(5%, 6%, 0) scale(1.08)' },
          '100%': { transform: 'translate3d(-4%, 3%, 0) scale(0.98)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heroIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.995)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropFilter: {
        'glass': 'blur(10px) backdrop-brightness(1.1)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

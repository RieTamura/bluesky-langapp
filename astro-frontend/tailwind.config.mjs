/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        // Neutral grays with better contrast
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      screens: {
        'xs': '475px',
        'touch': { 'raw': '(hover: none)' },
        'print': { 'raw': 'print' },
      },
      spacing: {
        'touch': '44px', // Minimum touch target size (WCAG AA)
        'touch-lg': '48px', // Larger touch target for mobile
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        'touch': ['16px', '1.5'], // Prevent zoom on iOS
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [
    // Custom plugin for component classes
    function({ addComponents, theme }) {
      addComponents({
        // Button components
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme('borderRadius.md'),
          fontWeight: theme('fontWeight.medium'),
          transition: 'all 0.2s ease-in-out',
          touchAction: 'manipulation',
          minHeight: theme('spacing.touch'),
          '&:focus': {
            outline: '2px solid',
            outlineColor: theme('colors.primary.500'),
            outlineOffset: '2px',
          },
          '&:disabled': {
            opacity: '0.6',
            cursor: 'not-allowed',
          },
        },
        '.btn-primary': {
          backgroundColor: theme('colors.primary.600'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.primary.700'),
          },
          '&:active': {
            backgroundColor: theme('colors.primary.800'),
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.700'),
          border: `1px solid ${theme('colors.gray.300')}`,
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.200'),
            borderColor: theme('colors.gray.400'),
          },
        },
        '.btn-danger': {
          backgroundColor: theme('colors.red.600'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.red.700'),
          },
        },
        
        // Form components
        '.form-input': {
          width: '100%',
          padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
          border: `1px solid ${theme('colors.gray.300')}`,
          borderRadius: theme('borderRadius.md'),
          fontSize: theme('fontSize.base[0]'),
          lineHeight: theme('fontSize.base[1].lineHeight'),
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.primary.500'),
            boxShadow: `0 0 0 3px ${theme('colors.primary.100')}`,
          },
          '&::placeholder': {
            color: theme('colors.gray.400'),
          },
          '@media (max-width: 768px)': {
            fontSize: '16px', // Prevent zoom on iOS
            padding: `${theme('spacing.3')} ${theme('spacing.3')}`,
          },
        },
        
        // Card components
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.soft'),
          border: `1px solid ${theme('colors.gray.200')}`,
          overflow: 'hidden',
        },
        '.card-hover': {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.medium'),
            transform: 'translateY(-1px)',
          },
        },
        
        // Word highlight components
        '.word-highlight-base': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '6px',
          border: '1px solid',
          cursor: 'pointer',
          touchAction: 'manipulation',
          minHeight: '44px',
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: '2px solid #3b82f6',
            outlineOffset: '2px',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '@media (max-width: 768px)': {
            minHeight: '48px',
            padding: '4px 8px',
          },
        },
        
        // Accessibility helpers
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        '.focus-visible': {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: theme('colors.primary.500'),
            outlineOffset: '2px',
          },
        },
      })
    }
  ],
}
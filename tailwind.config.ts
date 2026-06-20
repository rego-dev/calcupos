import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace'],
        vintage: ['var(--font-vintage)'],
        nano: ['var(--font-nano)'],
      },
      colors: {
        /* Remap amber/yellow to CSS variables so ALL amber/yellow Tailwind
           classes (text-amber-*, bg-amber-*, from-amber-*, border-amber-*, etc.)
           automatically follow the active color theme. */
        amber: {
          50:  'hsl(var(--primary) / 0.06)',
          100: 'hsl(var(--primary) / 0.12)',
          200: 'hsl(var(--primary) / 0.28)',
          300: 'hsl(var(--primary) / 0.50)',
          400: 'hsl(var(--primary) / 0.80)',
          500: 'hsl(var(--primary) / <alpha-value>)',
          600: 'hsl(var(--primary) / 0.88)',
          700: 'hsl(var(--primary) / 0.72)',
          800: 'hsl(var(--primary) / 0.55)',
          900: 'hsl(var(--primary) / 0.38)',
          950: 'hsl(var(--primary) / 0.22)',
        },
        yellow: {
          50:  'hsl(var(--accent) / 0.06)',
          100: 'hsl(var(--accent) / 0.12)',
          200: 'hsl(var(--accent) / 0.35)',
          300: 'hsl(var(--accent) / 0.55)',
          400: 'hsl(var(--accent) / 0.80)',
          500: 'hsl(var(--accent) / <alpha-value>)',
          600: 'hsl(var(--accent) / 0.85)',
          700: 'hsl(var(--accent) / 0.70)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

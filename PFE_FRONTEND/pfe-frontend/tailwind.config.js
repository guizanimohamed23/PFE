/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        severity: {
          critical: 'hsl(var(--severity-critical))',
          high: 'hsl(var(--severity-high))',
          medium: 'hsl(var(--severity-medium))',
          low: 'hsl(var(--severity-low))',
        },
      },
    },
  },
  plugins: [],
}


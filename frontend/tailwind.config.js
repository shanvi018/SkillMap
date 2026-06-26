/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        heading: ["'Sora'", "'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        navy: {
          900: "#0B1120",
          800: "#111827",
          700: "#1E293B",
          600: "#334155",
        },
        ink: "#0B1120",
        surface: "#111827",
        gold: {
          DEFAULT: "#F2B84B",
          50: "#FEF7E0",
          100: "#FDEAB1",
          200: "#FBDB7E",
          300: "#F8CC5E",
          400: "#F5C054",
          500: "#F2B84B",
          600: "#D69A2A",
          700: "#A87521",
          dim: "#7A5B1F",
        },
        emerald: {
          DEFAULT: "#2DD4A0",
          400: "#34E4AE",
          500: "#2DD4A0",
          600: "#1FB081",
          dim: "#0F766E",
        },
        coral: {
          DEFAULT: "#FF6B4A",
          400: "#FF8A6E",
          500: "#FF6B4A",
          600: "#E2502E",
        },
        brand: {
          50: "#FEF7E0",
          100: "#FDEAB1",
          200: "#FBDB7E",
          400: "#F5C054",
          500: "#F2B84B",
          600: "#D69A2A",
          700: "#A87521",
          900: "#5A3E10",
        },
      },
      boxShadow: {
        "glow-gold": "0 0 22px rgba(242,184,75,0.45), 0 0 4px rgba(242,184,75,0.6)",
        "glow-emerald": "0 0 18px rgba(45,212,160,0.45)",
        "glow-coral": "0 0 18px rgba(255,107,74,0.55)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        flicker: {
          "0%, 100%": { transform: "scale(1) rotate(-1deg)", filter: "drop-shadow(0 0 6px rgba(255,107,74,0.6))" },
          "25%": { transform: "scale(1.05) rotate(1deg)", filter: "drop-shadow(0 0 12px rgba(255,140,80,0.85))" },
          "50%": { transform: "scale(0.97) rotate(-0.5deg)", filter: "drop-shadow(0 0 8px rgba(242,184,75,0.8))" },
          "75%": { transform: "scale(1.03) rotate(0.5deg)", filter: "drop-shadow(0 0 14px rgba(255,107,74,0.9))" },
        },
        "shine-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
        "unlock-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(242,184,75,0.5)" },
          "50%": { boxShadow: "0 0 0 14px rgba(242,184,75,0)" },
        },
        "level-flash": {
          "0%": { boxShadow: "0 0 0 0 rgba(45,212,160,0.0)", background: "rgba(45,212,160,0.0)" },
          "30%": { boxShadow: "0 0 30px rgba(45,212,160,0.6)", background: "rgba(45,212,160,0.06)" },
          "100%": { boxShadow: "0 0 0 0 rgba(45,212,160,0.0)", background: "rgba(45,212,160,0.0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flicker: "flicker 2.4s ease-in-out infinite",
        "shine-sweep": "shine-sweep 1.2s ease-out",
        "unlock-pulse": "unlock-pulse 1.8s ease-out infinite",
        "level-flash": "level-flash 1.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

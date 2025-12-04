/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Closures
        barrier: "#FB923C",
        segment: "#A855F7",
        zone: "#EF4444",

        // Interface
        primary: "#2563EB",
        "primary-hover": "#1D4ED8",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#DC2626",

        // Neutres (utilise les gray de Tailwind par défaut)
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      spacing: {
        // 8pt grid system
        1: "0.25rem", // 4px
        2: "0.5rem", // 8px
        3: "0.75rem", // 12px
        4: "1rem", // 16px
        5: "1.25rem", // 20px
        6: "1.5rem", // 24px
        8: "2rem", // 32px
        10: "2.5rem", // 40px
        12: "3rem", // 48px
        16: "4rem", // 64px
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        full: "9999px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 4px 6px rgba(0, 0, 0, 0.1)",
        focus: "0 0 0 3px rgba(37, 99, 235, 0.1)",
      },
    },
  },
  plugins: [],
};

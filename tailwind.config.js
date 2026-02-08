/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup.tsx",
    "./contents/**/*.tsx",
    "./components/**/*.tsx",
    "./hooks/**/*.ts"
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "var(--color-bg-primary)",
        "bg-secondary": "var(--color-bg-secondary)",
        "bg-tertiary": "var(--color-bg-tertiary)",
        "bg-hover": "var(--color-bg-hover)",
        "bg-input": "var(--color-bg-input)",
        "bg-input-hover": "var(--color-bg-input-hover)",

        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",
        "text-muted": "var(--color-text-muted)",

        "border-default": "var(--color-border-default)",
        "border-strong": "var(--color-border-strong)",

        "frame-main-bg": "var(--color-frame-main-bg)",
        "frame-main-badge-bg": "var(--color-frame-main-badge-bg)",
        "frame-main-badge-text": "var(--color-frame-main-badge-text)",

        "frame-iframe-bg": "var(--color-frame-iframe-bg)",
        "frame-iframe-badge-bg": "var(--color-frame-iframe-badge-bg)",
        "frame-iframe-badge-text": "var(--color-frame-iframe-badge-text)",

        "frame-crossorigin-badge-bg": "var(--color-frame-crossorigin-badge-bg)",
        "frame-crossorigin-badge-text":
          "var(--color-frame-crossorigin-badge-text)",

        "btn-primary-bg": "var(--color-btn-primary-bg)",
        "btn-primary-bg-hover": "var(--color-btn-primary-bg-hover)",
        "btn-primary-text": "var(--color-btn-primary-text)",

        "btn-secondary-bg": "var(--color-btn-secondary-bg)",
        "btn-secondary-bg-hover": "var(--color-btn-secondary-bg-hover)",
        "btn-secondary-text": "var(--color-btn-secondary-text)",

        "input-border": "var(--color-input-border)",
        "input-border-focus": "var(--color-input-border-focus)",
        "input-bg": "var(--color-input-bg)",

        accent: "var(--color-accent)"
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)"
      }
    }
  },
  plugins: []
}

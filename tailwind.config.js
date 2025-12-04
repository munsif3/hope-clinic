/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0ea5e9', // Sky 500
                secondary: '#10b981', // Emerald 500
                accent: '#f59e0b', // Amber 500
                background: '#f8fafc', // Slate 50
                surface: '#ffffff',
                text: '#0f172a', // Slate 900
                muted: '#64748b', // Slate 500
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

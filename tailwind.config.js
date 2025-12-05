/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#4f46e5', // Indigo 600 - Royal Indigo
                secondary: '#0d9488', // Teal 600 - Deep Teal
                accent: '#f59e0b', // Amber 500
                background: '#f8fafc', // Slate 50
                surface: '#ffffff',
                text: '#0f172a', // Slate 900
                muted: '#64748b', // Slate 500
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 4px 20px -4px rgba(0, 0, 0, 0.05)',
                'premium-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.08)',
            }
        },
    },
    plugins: [],
}

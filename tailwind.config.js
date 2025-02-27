const colors = require('tailwindcss/colors')

module.exports = {
    content: [
        "./public/*/**.{html,js,css,png}",
        "./views/*.ejs",
    ],
    theme: {
        extend: {
            fontFamily: {
                'poppins': ['Poppins', 'Helvetica', 'Arial', 'sans-serif'],
                'manrope': ['Manrope', 'Helvetica', 'Arial', 'sans-serif']
            },
            colors: {
                'jordyblue': {
                    '50': '#f1f6fd',
                    '100': '#dfebfa',
                    '200': '#c6dbf7',
                    '300': '#99c1f1',
                    '400': '#70a5ea',
                    '500': '#4f84e2',
                    '600': '#3a68d6',
                    '700': '#3154c4',
                    '800': '#2d46a0',
                    '900': '#293f7f',
                    '950': '#1d284e',
                },
                'como': {
                    '50': '#f2f7f4',
                    '100': '#e0ebe4',
                    '200': '#c4d6cc',
                    '300': '#9cb9aa',
                    '400': '#709784',
                    '500': '#507a67',
                    '600': '#3c5f50',
                    '700': '#304c41',
                    '800': '#273e34',
                    '900': '#21332c',
                    '950': '#121c19',
                },


                ...colors,
            }
        },
    },
    plugins: [
        {
            tailwindcss: {},
            autoprefixer: {},
        },
    ],
}
const postcss = require('rollup-plugin-postcss')
const autoprefixer = require('autoprefixer')
const tailwindcss = require('tailwindcss')
const cssnano = require('cssnano')

module.exports = {
    rollup(config, options) {
        config.plugins.push(
            postcss({
                plugins: [
                    tailwindcss({
                        content: ['./src/**/*.{tsx,ts,css}'],
                        darkMode: 'class', // or 'media' or 'class'
                        theme: { extend: {} },
                        plugins: [],
                    }),
                    autoprefixer(),
                    cssnano({ preset: 'default' }),
                ],

                minimize: true,
                inject: { insertAt: 'top' },
                // only write out CSS for the first bundle (avoids pointless extra files):
                extract: !!options.writeMeta,
            }),
        )
        return config
    },
}

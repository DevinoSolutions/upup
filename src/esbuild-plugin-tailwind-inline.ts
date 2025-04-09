import autoprefixer from 'autoprefixer'
import type { Plugin } from 'esbuild'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

const TAILWIND_CONFIG_PATH = path.resolve(__dirname, 'tailwind.config.js')

export function tailwindInlinePlugin(): Plugin {
    return {
        name: 'tailwind-inline-plugin',
        setup(build) {
            build.onLoad({ filter: /\.css$/ }, async args => {
                const source = await fs.promises.readFile(args.path, 'utf8')
                const result = await postcss([
                    tailwindcss(TAILWIND_CONFIG_PATH),
                    autoprefixer(),
                ]).process(source, {
                    from: args.path,
                })
                return {
                    contents: `
            if (typeof document !== 'undefined') {
              var style = document.createElement('style');
              style.textContent = ${JSON.stringify(result.css)};
              document.head.appendChild(style);
            }
          `,
                    loader: 'js',
                }
            })
        },
    }
}

import { withThemeByClassName } from '@storybook/addon-themes'
import { Preview, ReactRenderer } from '@storybook/react'
import '../src/frontend/tailwind.css'

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
    },
    decorators: [
        withThemeByClassName<ReactRenderer>({
            themes: {
                light: '',
                dark: 'dark',
            },
            defaultTheme: 'dark',
        }),
    ],
}

export default preview

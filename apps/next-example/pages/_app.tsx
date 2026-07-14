import type { AppProps } from 'next/app'
import '@upupjs/next/styles'

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />
}

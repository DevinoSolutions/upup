import type { AppProps } from 'next/app'
import '@useupup/next/styles'

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />
}

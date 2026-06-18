import type { AppProps } from 'next/app'
import '@upup/next/styles'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

import { clientEnv } from '@/lib/env'

export const GA_TRACKING_ID = clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

export const pageView = (url: string) => {
    if (
        process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined'
    ) {
        window.gtag('config', GA_TRACKING_ID || '', {
            page_path: url,
        })
    }
}

// `value` is GA4's numeric event parameter. It is typed `number` so a caller
// cannot smuggle free text — and in particular PII — into an analytics
// dimension; anything descriptive belongs in `event_label`.
type Params = {
    action: string
    event_category?: string
    event_label?: string
    value?: number
}

export const event = ({
    action,
    event_category,
    event_label,
    value,
}: Params) => {
    if (
        process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined'
    ) {
        window.gtag('event', action, {
            event_category,
            event_label,
            value,
        })
    }
}

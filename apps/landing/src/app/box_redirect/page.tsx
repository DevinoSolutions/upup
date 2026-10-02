import OAuthRedirectPage, {
    oauthRedirectMetadata,
} from '@/components/oauth-redirect-page'

export const metadata = oauthRedirectMetadata('Box')

export default function BoxRedirect() {
    return <OAuthRedirectPage provider="Box" />
}

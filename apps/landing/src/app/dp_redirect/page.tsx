import OAuthRedirectPage, {
    oauthRedirectMetadata,
} from '@/components/oauth-redirect-page'

export const metadata = oauthRedirectMetadata('Dropbox')

export default function DropboxRedirect() {
    return <OAuthRedirectPage provider="Dropbox" />
}

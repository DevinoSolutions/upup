import OAuthRedirectPage, {
    oauthRedirectMetadata,
} from '@/components/oauth-redirect-page'

export const metadata = oauthRedirectMetadata('OneDrive')

export default function OneDriveRedirect() {
    return <OAuthRedirectPage provider="OneDrive" />
}

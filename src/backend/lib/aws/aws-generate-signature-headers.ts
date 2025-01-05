import { S3ClientConfig } from '@aws-sdk/client-s3'
import { createHash, createHmac } from 'crypto'
import { UpupProvider } from '../../../shared/types/StorageSDK'

function hmac(key: string | Buffer, message: string) {
    return createHmac('sha256', key).update(message).digest()
}

function hash(message: string) {
    return createHash('sha256').update(message).digest('hex')
}

function getSignatureKey(
    key: string,
    dateStamp: string,
    region: string,
    service: string,
) {
    const kDate = hmac(`AWS4${key}`, dateStamp)
    const kRegion = hmac(kDate, region)
    const kService = hmac(kRegion, service)
    const kSigning = hmac(kService, 'aws4_request')
    return kSigning
}

function calculateMD5(content: string) {
    return createHash('md5').update(content).digest('base64')
}

export default function awsGenerateSignatureHeaders(
    corsConfig: string,
    bucketName: string,
    {
        region,
        credentials: { accessKeyId, secretAccessKey },
        endpoint,
    }: S3ClientConfig & {
        credentials?: any
    },
    provider: UpupProvider,
) {
    const service = 's3'
    const hostMap = {
        [UpupProvider.AWS]: `${bucketName}.s3.${region}.amazonaws.com`,
        [UpupProvider.BackBlaze]: (endpoint as string).split('https://')[1],
        [UpupProvider.DigitalOcean]: `${bucketName}.${region}.digitaloceanspaces.com`,
        [UpupProvider.Azure]: ``,
    }
    const host = hostMap[provider]

    // Calculate Content-MD5
    const contentMD5 = calculateMD5(corsConfig)

    // Step 1: Create date strings
    const date = new Date()
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)

    // Step 2: Create canonical request
    const method = 'PUT'

    const canonicalUriMap = {
        [UpupProvider.AWS]: '/',
        [UpupProvider.BackBlaze]: `/${bucketName}/`,
        [UpupProvider.DigitalOcean]: `/`,
        [UpupProvider.Azure]: ``,
    }
    const canonicalUri = canonicalUriMap[provider]

    const canonicalQueryStringMap = {
        [UpupProvider.AWS]: 'cors=',
        [UpupProvider.BackBlaze]: 'cors=null',
        [UpupProvider.DigitalOcean]: 'cors=',
        [UpupProvider.Azure]: ``,
    }
    const canonicalQueryString = canonicalQueryStringMap[provider]

    const payloadHash = hash(corsConfig)

    const canonicalHeaders =
        `content-md5:${contentMD5}\n` +
        `content-type:application/xml\n` +
        `host:${host}\n` +
        `x-amz-content-sha256:${payloadHash}\n` +
        `x-amz-date:${amzDate}\n`

    const signedHeaders =
        'content-md5;content-type;host;x-amz-content-sha256;x-amz-date'

    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n')

    // Step 3: Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        hash(canonicalRequest),
    ].join('\n')

    // Step 4: Calculate signature
    const signingKey = getSignatureKey(
        secretAccessKey,
        dateStamp,
        region as string,
        service,
    )
    const signature = createHmac('sha256', signingKey)
        .update(stringToSign)
        .digest('hex')

    // Step 5: Create authorization header
    const authorizationHeader =
        `${algorithm} ` +
        `Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, ` +
        `Signature=${signature}`

    return {
        'Content-Type': 'application/xml',
        'Content-MD5': contentMD5, // Added Content-MD5 header
        Authorization: authorizationHeader,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Host: host,
    }
}

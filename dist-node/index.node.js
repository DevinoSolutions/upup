'use strict'
var _ = Object.defineProperty
var X = Object.getOwnPropertyDescriptor
var Y = Object.getOwnPropertyNames
var Z = Object.prototype.hasOwnProperty
var J = (e, r) => {
        for (var t in r) _(e, t, { get: r[t], enumerable: !0 })
    },
    ee = (e, r, t, i) => {
        if ((r && typeof r == 'object') || typeof r == 'function')
            for (let n of Y(r))
                !Z.call(e, n) &&
                    n !== t &&
                    _(e, n, {
                        get: () => r[n],
                        enumerable: !(i = X(r, n)) || i.enumerable,
                    })
        return e
    }
var te = e => ee(_({}, '__esModule', { value: !0 }), e)
var ce = {}
J(ce, {
    UpupProvider: () => E,
    azureGenerateSasUrl: () => T,
    s3GeneratePresignedUrl: () => P,
    s3GenerateSignedUrl: () => O,
})
module.exports = te(ce)
var w = require('@aws-sdk/client-s3'),
    b = require('@aws-sdk/s3-request-presigner'),
    z = require('uuid')
var E = (n => (
    (n.AWS = 'aws'),
    (n.Azure = 'azure'),
    (n.BackBlaze = 'backblaze'),
    (n.DigitalOcean = 'digitalocean'),
    n
))(E || {})
var l = class extends Error {
    constructor(t, i = 'UNKNOWN_UPLOAD_ERROR', n = !1, o) {
        super(t)
        this.type = i
        this.retryable = n
        this.status = o
        this.DEFAULT_ERROR_STATUS_CODE = 500
        ;(this.name = 'UploadError'),
            (this.status = o ?? this.DEFAULT_ERROR_STATUS_CODE)
    }
}
function y(e, r) {
    var o
    let t = r.type
    if (!e) return !1
    if (t) {
        let [a, g] = t.split('/')
        if (a && g) {
            let s = e.split(',').map(c => c.trim())
            if (
                s.includes('*') ||
                s.some(c => {
                    if (c.includes('/*')) {
                        let [p] = c.split('/')
                        return t.startsWith(p)
                    }
                    return c.toLowerCase() === t.toLowerCase()
                })
            )
                return !0
        }
    }
    let i = r.name ?? ''
    if (!i) return !1
    let n = ((o = i.split('.').pop()) == null ? void 0 : o.toLowerCase()) || ''
    return !!(
        n &&
        e
            .split(',')
            .map(s => s.trim().toLowerCase())
            .some(s => (s.startsWith('.') ? s.slice(1) === n : !1))
    )
}
var re = 10 * 1024 * 1024
function C(e) {
    let t = ['name', 'type', 'size'].filter(g => !e[g])
    if (t.length > 0)
        throw new l(
            `Missing required file param: ${t.join(', ')}`,
            'FILE_VALIDATION_ERROR',
            !1,
            400,
        )
    let { type: i, accept: n = '*', size: o, maxFileSize: a = re } = e
    if (!y(n, e))
        throw new l(
            `File type ${i} not allowed. Accepted types: ${n}`,
            'FILE_VALIDATION_ERROR',
            !1,
            400,
        )
    if (o > a)
        throw new l(
            `File size: ${o} exceeds maximum limit of ${a / (1024 * 1024)}MB`,
            'FILE_VALIDATION_ERROR',
            !1,
            413,
        )
}
var U = require('@aws-sdk/client-s3'),
    N = require('@aws-sdk/s3-request-presigner')
var ne = 3600 * 24 * 3
async function O(e, r, t, i = ne) {
    try {
        let n = new U.S3Client(e)
        return await (0, N.getSignedUrl)(
            n,
            new U.GetObjectCommand({ Bucket: t, Key: r }),
            { expiresIn: i },
        )
    } catch (n) {
        throw new l(n.message, 'SIGNED_URL_ERROR', !1)
    }
}
var f = require('crypto')
function h(e, r) {
    return (0, f.createHmac)('sha256', e).update(r).digest()
}
function M(e) {
    return (0, f.createHash)('sha256').update(e).digest('hex')
}
function ie(e, r, t, i) {
    let n = h(`AWS4${e}`, r),
        o = h(n, t),
        a = h(o, i)
    return h(a, 'aws4_request')
}
function oe(e) {
    return (0, f.createHash)('md5').update(e).digest('base64')
}
function se(e, r, { endpoint: t, region: i }) {
    switch (r) {
        case 'aws':
            return `${e}.s3.${i}.amazonaws.com`
        case 'backblaze':
            return t.split('https://')[1]
        case 'digitalocean':
            return `${e}.${i}.digitaloceanspaces.com`
        default:
            return ''
    }
}
function A(
    e,
    r,
    {
        region: t,
        credentials: { accessKeyId: i, secretAccessKey: n },
        endpoint: o,
    },
    a,
) {
    let g = 's3',
        s = se(r, a, { endpoint: o, region: t }),
        d = oe(e),
        p = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
        m = p.slice(0, 8),
        R = 'PUT',
        H = { aws: '/', backblaze: `/${r}/`, digitalocean: '/', azure: '' }[a],
        W = {
            aws: 'cors=',
            backblaze: 'cors=null',
            digitalocean: 'cors=',
            azure: '',
        }[a],
        I = M(e),
        k = `content-md5:${d}
content-type:application/xml
host:${s}
x-amz-content-sha256:${I}
x-amz-date:${p}
`,
        v = 'content-md5;content-type;host;x-amz-content-sha256;x-amz-date',
        V = [R, H, W, k, v, I].join(`
`),
        L = 'AWS4-HMAC-SHA256',
        B = `${m}/${t}/${g}/aws4_request`,
        K = [L, p, B, M(V)].join(`
`),
        j = ie(n, m, t, g),
        q = (0, f.createHmac)('sha256', j).update(K).digest('hex'),
        Q = `${L} Credential=${i}/${B}, SignedHeaders=${v}, Signature=${q}`
    return {
        'Content-Type': 'application/xml',
        'Content-MD5': d,
        Authorization: Q,
        'x-amz-content-sha256': I,
        'x-amz-date': p,
        Host: s,
    }
}
async function F(e, r, t, i) {
    let o = {
            aws: `https://${r}.s3.${t.region}.amazonaws.com/?cors`,
            backblaze: `${t.endpoint}/${r}/?cors=null`,
            digitalocean: `https://${r}.${t.region}.digitaloceanspaces.com/?cors`,
            azure: '',
        }[i],
        a = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration>
    <CORSRule>
        <ID>Allow S3 Operations from my site: ${e}</ID>
        <AllowedOrigin>${e}</AllowedOrigin>
        <AllowedHeader>*</AllowedHeader>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3600</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`,
        g = A(a, r, t, i),
        s = await fetch(o, { method: 'PUT', body: a, headers: g })
    if (!s.ok) {
        let c = await s.text()
        throw new l(c, 'CORS_CONFIG_ERROR', !1, s.status)
    }
    return await s.text()
}
var ae = 3600
function le(e) {
    let r = (e == null ? void 0 : e.Message) ?? e.message,
        t = (e == null ? void 0 : e.Code) ?? 'PRESIGNED_URL_ERROR'
    return { message: r, errorType: t }
}
async function P({
    fileParams: e,
    bucketName: r,
    s3ClientConfig: t,
    expiresIn: i = ae,
    origin: n,
    provider: o,
    enableAutoCorsConfig: a = !1,
}) {
    let { name: g, type: s, size: d } = e
    try {
        C(e), a && (await F(n, r, t, o))
        let c = new w.S3Client(t),
            p = `${(0, z.v4)()}-${g}`,
            m = new w.PutObjectCommand({
                Bucket: r,
                Key: p,
                ContentType: s,
                ContentLength: d,
            }),
            R = await (0, b.getSignedUrl)(c, m, {
                expiresIn: i,
                signableHeaders: new Set(['content-type', 'content-length']),
            }),
            x = await O(t, p, r)
        return { key: p, publicUrl: x, uploadUrl: R, expiresIn: i }
    } catch (c) {
        if (c instanceof l) throw c
        let { message: p, errorType: m } = le(c)
        throw new l(p, m, !1, 500)
    }
}
var $ = require('@azure/identity'),
    u = require('@azure/storage-blob'),
    G = require('uuid')
async function D(e, r = 3600) {
    try {
        let t = new Date(),
            i = new Date(t)
        return (
            i.setMinutes(t.getMinutes() + r / 60),
            await e.getUserDelegationKey(t, i)
        )
    } catch (t) {
        throw new l(t.message, 'TEMPORARY_CREDENTIALS_ERROR', !1, 500)
    }
}
async function T({
    fileParams: e,
    containerName: r,
    credentials: t,
    expiresIn: i = 3600,
}) {
    try {
        C(e)
        let n = new $.ClientSecretCredential(
                t.tenantId,
                t.clientId,
                t.clientSecret,
            ),
            o = new u.BlobServiceClient(
                `https://${t.storageAccount}.blob.core.windows.net`,
                n,
            ),
            a = await D(o),
            { name: g, type: s } = e,
            d = `${(0, G.v4)()}-${g}`,
            p = o.getContainerClient(r).getBlobClient(d),
            m = (0, u.generateBlobSASQueryParameters)(
                {
                    containerName: r,
                    blobName: d,
                    permissions: u.BlobSASPermissions.parse('racw'),
                    startsOn: new Date(),
                    expiresOn: new Date(Date.now() + i * 1e3),
                    protocol: u.SASProtocol.Https,
                    contentType: s,
                },
                a,
                t.storageAccount,
            ).toString(),
            R = `${p.url}?${m}`
        return { key: d, publicUrl: p.url, uploadUrl: R, expiresIn: i }
    } catch (n) {
        throw n instanceof l
            ? n
            : new l(n.message, 'PRESIGNED_URL_ERROR', !1, 500)
    }
}
0 &&
    (module.exports = {
        UpupProvider,
        azureGenerateSasUrl,
        s3GeneratePresignedUrl,
        s3GenerateSignedUrl,
    })
//# sourceMappingURL=index.node.js.map

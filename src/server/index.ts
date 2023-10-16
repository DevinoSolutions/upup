import { S3 } from '@aws-sdk/client-s3'
import nextConnect from 'next-connect'
import multer from 'multer'
import type { S3Configs } from 'types/S3Configs'
import type { NextApiRequest, NextApiResponse } from 'next'

interface ExtendedNextApiRequest extends NextApiRequest {
    files: {
        fieldname: string
        originalname: string
        encoding: string
        mimetype: string
        buffer: Buffer
        size: number
    }[]
    accepts?: string
}

export function UploadEndpoint(
    s3configs: S3Configs,
    bucket: (accepts?: string) => string,
) {
    const handler = nextConnect<ExtendedNextApiRequest, NextApiResponse>({
        onError(error, _req, res) {
            res.status(501).json({
                error: `Sorry something Happened! ${error.message}`,
            })
        },
        onNoMatch(req, res) {
            res.status(405).json({
                error: `Method "${req.method}" Not Allowed`,
            })
        },
    })

    handler.use(multer().any())

    handler.post(async (req, res) => {
        const client = new S3(s3configs)

        const { files, accepts } = req
        const image = files[0]
        const key = image.filename

        client.putObject(
            {
                Bucket: bucket(accepts),
                Key: `${key}`,
                Body: image.buffer,
                ContentType: image.mimetype,
                ACL: 'public-read',
            },
            (err, _data) => {
                if (err) return res.status(500).json({ error: err.message })

                res.status(200).json({
                    response: 'Image uploaded successfully.',
                    key,
                })
            },
        )

        res.status(200).json({ response: 'Image uploaded successfully.', key })
    })

    const config = {
        api: {
            bodyParser: false,
        },
    }

    return { handler, config }
}

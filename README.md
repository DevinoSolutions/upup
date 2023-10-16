<h1 align="center">
   Upup
</h1>

<br/>

<div align="center">
  Easily handle your file upload needs. Easily integrate our API into your application to upload files to the cloud.

Goodbye to nasty configs, painful APIs and hello to a simple, easy to use, file uploader.

</div>

<p align="center">
  <a href="https://github.com/uNotesOfficial/upup">
    <img src="https://img.shields.io/badge/gzipped-206kb-4ba0f6" />
  </a>

<hr/>
<br />

## Installation

Install via NPM:

```shell
npm install @bassem97/upup
```

Or via YARN:

```shell
yarn add @bassem97/upup
```

## Usage

### 1 - Inside you component or App.tsx import UpupUploader and the types you need :

```javascript
// imports
import {
    BaseConfigs,
    CloudStorageConfigs,
    GoogleConfigs,
    OneDriveConfigs,
    Is3Configs,
    UploadAdapter,
    UpupUploader,
} from '@bassem97/upup'
```

### 2 - Set your configurations keys from your .env file ( ex: .env.local ) :

```javascript
const space_secret = process.env.SPACE_SECRET
const space_key = process.env.SPACE_KEY
const space_endpoint = process.env.SPACE_ENDPOINT
const space_region = process.env.SPACE_REGION
const document_space = process.env.SPACE_DOCUMENTS
const image_space = process.env.SPACE_IMAGES
const onedrive_client_id = process.env.ONEDRIVE_CLIENT_ID
const google_client_id = process.env.GOOGLE_CLIENT_ID
const google_app_id = process.env.GOOGLE_APP_ID
const google_api_key = process.env.GOOGLE_API_KEY
const endpoint = process.env.ENDPOINT_UPUP
```

### 3 - Create 2 states one for key (which will be the final link of you file. ex: 'https://example-documents.nyc3.cdn.digitaloceanspaces.com/file.pdf') and another for canUpload ( which will be changed after uploading file and submitting )

```javascript
const [key, setKey] = useState('')
const [canUpload, setCanUpload] = useState(false)
```

### 4 - initialize the configs from the provider you want to use ( ex: DigitalOceanSpaces, GoogleDriveUploader, OneDriveUploader, S3 )

```javascript
const s3Configs: S3Configs = {
    region: space_region,
    endpoint: space_endpoint,
    credentials: {
        accessKeyId: space_key,
        secretAccessKey: space_secret,
    },
}

const baseConfigs: BaseConfigs = {
    canUpload: canUpload,
    setKey: setKey,
    endpoint: endpoint
}

const cloudStorageConfigs: CloudStorageConfigs = {
    bucket: document_space,
    s3Configs,
}

const googleConfigs: GoogleConfigs = {
    google_api_key,
    google_app_id,
    google_client_id,
}

const oneDriveConfigs: OneDriveConfigs = {
    onedrive_client_id,
    multiSelect: false,
}
```

### 4 - Render the UpupUploader component and pass the configs and the adapter you want to use :

```javascript
return (
    <div>
        <UpupUploader
            baseConfigs={baseConfigs}
            cloudStorageConfigs={cloudStorageConfigs}
            googleConfigs={googleConfigs}
            oneDriveConfigs={oneDriveConfigs}
            uploadAdapters={[
                UploadAdapter.INTERNAL,
                UploadAdapter.GOOGLE_DRIVE,
                UploadAdapter.ONE_DRIVE,
            ]}
        />
        <button onClick={() => setCanUpload(true)}> upload </button>
    </div>
)
```

### 5 - You can also use the UpupUploader component with the default configs and adapter :

```javascript
return (
    <div>
        <UpupUploader
            baseConfigs={baseConfigs}
            cloudStorageConfigs={cloudStorageConfigs}
            uploadAdapters={[UploadAdapter.internal]}
        />
        <button onClick={() => setCanUpload(true)}> upload </button>
    </div>
)
```

## All done! 🎉

### Contributions

Contributions to this project are welcome! Feel free to submit issues or pull requests on the [GitHub repository](https://github.com/uNotesOfficial/upup.git).

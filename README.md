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
    <img src="https://img.shields.io/badge/gzipped-80%20kb-4ba0f6" />
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

1 - Inside you component or App.tsx import UpupUploader and the types you need : 

```javascript
// imports
import {
  IBaseConfigs,
  ICloudStorageConfigs,
  IGoogleConfigs,
  IOneDriveConfigs,
  Is3Configs,
  UploadAdapter,
  UpupUploader,
} from '@bassem97/upup'
```

### 2 - Create 2 states one for key (which will be the final link of you file. ex: 'https://example-documents.nyc3.cdn.digitaloceanspaces.com/file.pdf') and another for canUpload ( which will be changed after uploading file and submitting )

```javascript
const [key, setKey] = useState('');
const [canUpload, setCanUpload] = useState(false);
```

### 3 - initialize the configs from the provider you want to use ( ex: DigitalOceanSpaces, GoogleDrive, OneDrive, S3 )

```javascript
  const s3Configs: Is3Configs = {
  region: space_region,
  endpoint: space_endpoint,
  credentials: {
    accessKeyId: space_key,
    secretAccessKey: space_secret,
  },
}

const baseConfigs: IBaseConfigs = {
  canUpload: canUpload,
  setKey: setKey,
}

const cloudStorageConfigs: ICloudStorageConfigs = {
  bucket: document_space,
  s3Configs,
}

const googleConfigs: IGoogleConfigs = {
  GOOGLE_API_KEY: google_api_key,
  GOOGLE_APP_ID: google_app_id,
  GOOGLE_CLIENT_ID: google_client_id,
}

const oneDriveConfigs: IOneDriveConfigs = {
  ONEDRIVE_CLIENT_ID: onedrive_client_id,
  multiSelect: false,
}

```

### 4 - Render the UpupUploader component and pass the configs and the provider you want to use ( ex: Provider.internal_upload, Provider.google_drive_upload, Provider.one_drive_upload )

```javascript
return (
  <div>
    <UpupUploader
      baseConfigs={baseConfigs}
      cloudStorageConfigs={cloudStorageConfigs}
      googleConfigs={googleConfigs}
      oneDriveConfigs={oneDriveConfigs}
      uploadProviders={[
        Provider.internal_upload,
        Provider.google_drive_upload,
        Provider.one_drive_upload,
      ]}
    />
    <button onClick={() => setCanUpload(true)}> upload </button>
  </div>
);
```

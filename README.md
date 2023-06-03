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

### 1 - Inside you component or App.tsx import UpupUploader and the types you need : 

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

### 2 - Set your configurations keys from your .env file ( ex: .env.local ) :

```javascript
const space_secret = process.env.NEXT_PUBLIC_UNOTES_SPACE_SECRET || ''
const space_key = process.env.NEXT_PUBLIC_UNOTES_SPACE_KEY || ''
const space_endpoint = process.env.NEXT_PUBLIC_UNOTES_SPACE_ENDPOINT || ''
const space_region = process.env.NEXT_PUBLIC_UNOTES_SPACE_REGION || ''
const document_space = process.env.NEXT_PUBLIC_UNOTES_DOCUMENT_SPACE || ''
const onedrive_client_id = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || ''
const google_client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PICKER || ''
const google_app_id = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || ''
const google_api_key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
```


### 3 - Create 2 states one for key (which will be the final link of you file. ex: 'https://example-documents.nyc3.cdn.digitaloceanspaces.com/file.pdf') and another for canUpload ( which will be changed after uploading file and submitting )


```javascript
const [key, setKey] = useState('');
const [canUpload, setCanUpload] = useState(false);
```

### 4 - initialize the configs from the provider you want to use ( ex: DigitalOceanSpaces, GoogleDrive, OneDrive, S3 )

```javascript
const s3Configs: Is3Configs = {
  region: space_region,
  endpoint: space_endpoint,
  credentials: {
    accessKeyId: space_key,
    secretAccessKey: space_secret,
  },
};

const baseConfigs: IBaseConfigs = {
  canUpload: canUpload,
  setKey: setKey,
};

const cloudStorageConfigs: ICloudStorageConfigs = {
  bucket: document_space,
  s3Configs,
};

const googleConfigs: IGoogleConfigs = {
  google_api_key,
  google_app_id,
  google_client_id,
};

const oneDriveConfigs: IOneDriveConfigs = {
  onedrive_client_id,
  multiSelect: false,
};

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
        UploadAdapter.internal,
        UploadAdapter.google_drive,
        UploadAdapter.one_drive,
      ]}
    />
    <button onClick={() => setCanUpload(true)}> upload </button>
  </div>
);
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
);
```
## All done! 🎉

### Contributions

Contributions to this project are welcome! Feel free to submit issues or pull requests on the [GitHub repository](https://github.com/uNotesOfficial/upup.git).

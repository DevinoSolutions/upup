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

### Initialize

Initialize s3 client inside you component :

```javascript
// imports
import { UploadFiles, getClient, s3Configs } from "@bassem97/upup";

 const client = getClient({
    region: process.env.REGION,
    endpoint: process.env.ENDPOINT,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
  } as s3Configs);
```

create state for key (which will be the final link of you file. ex: 'https://example-documents.nyc3.cdn.digitaloceanspaces.com/file.pdf')

```javascript
const [key, setKey] = useState('');
```

create state for canUpload ( which will be changed after uploading file and submiting )

```javascript
const [canUpload, setCanUpload] = useState(false);
```

### call the File uploader component with props bellow:

```javascript
<UploadFiles
  bucket={process.env.SPACE_OR_BUCKET}
  client={client}
  setKey={setKey}
  canUpload={canUpload}
/>
```

### create a button that handle submitting file:

```javascript
  <button onClick={ () => setCanUpload(true) }
```

/**
 * UploadAdapter enum to control which upload provider the user want to use to upload the file
 * @enum
 * @type {{internal: number, google_drive: number, one_drive: number}}
 * @property {number} internal - internal storage
 * @property {number} google_drive - google drive storage provider (https://developers.google.com/drive/api/v3/about-sdk)
 * @property {number} one_drive - one drive storage provider (https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_put_content?view=odsp-graph-online)
 */
export enum UploadAdapter {
  internal,
  google_drive,
  one_drive,
}

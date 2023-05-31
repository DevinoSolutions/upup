// window.google object is not natively defined in TypeScript.
// declare global {
//   interface Window {
//     google: any;
//     OneDrive: any;
//   }
// }

export { getClient, s3Configs } from './lib/S3';
export * from './UpupUploader';

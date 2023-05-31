/**
 *
 * @param bytes assign keyword depend on size
 */
export const bytesToSize = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

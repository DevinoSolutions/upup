import pako from 'pako';

interface props {
  element: any;
  element_name: string;
}

/**
 * Read the file content as a Buffer
 * @param element element to convert to Buffer
 * @param element_name element name ex: element.name
 */
export async function compressFile({
  element,
  element_name,
}: props): Promise<File> {
  const buffer: ArrayBuffer = await element.arrayBuffer();
  return new File([pako.gzip(buffer)], element_name + '.gz', {
    type: 'application/octet-stream',
  });
}

import pako from "pako";

interface props {
    element : any
    element_name: string
}

/**
 * Read the file content as a Buffer
 * @param element
 * @param element_name
 */
export async function compressFile({element, element_name} : props) {
    const buffer: ArrayBuffer = await element.arrayBuffer();
    return  new File(
        [pako.gzip(buffer)],
        element_name + ".gz",
        {
            type: "application/octet-stream"
        }
    );
}

import React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { ImCross } from 'react-icons/im';
import { bytesToSize } from '../../lib/bytesToSize';

type Props = {
  file: File;
  setFiles: Dispatch<SetStateAction<File[]>>;
};

/**
 *
 * @param file
 * @param setFiles
 * @constructor
 */
const FileItem = ({ file, setFiles }: Props) => {
  const getFileType = (file: File) => file.type.split('/')[1];
  return (
    <div className="flex items-center w-full py-1 font-poppins gap-2 relative justify-between">
      <div className="flex items-center gap-2 overflow-hidden w-[calc(100%-1.25rem)]">
        <div className="h-12 text-primary font-bold uppercase text-sm flex items-center justify-center p-2 bg-primary bg-opacity-40 aspect-square rounded-full border border-primary ">
          {getFileType(file)}
        </div>
        <div className="flex flex-col gap-1 relative w-[calc(100%-3.5rem)]">
          <h1
            title={file.name}
            className="flex text-ellipsis whitespace-nowrap overflow-hidden w-full"
          >
            {file.name}
          </h1>
          <h2 className=" text-[10px] font-bold text-font3 ">
            {bytesToSize(file.size)}
          </h2>
        </div>
      </div>
      <ImCross
        className="text-black min-w-[0.75rem] h-3 w-3 cursor-pointer opacity-80"
        onClick={() =>
          setFiles((prev) => prev.filter((f) => f.name !== file.name))
        }
      />
    </div>
  );
};

export default FileItem;

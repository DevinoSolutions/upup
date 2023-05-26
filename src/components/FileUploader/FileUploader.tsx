import FileItem from './FileItem';
import React, { Dispatch, DragEvent, SetStateAction } from 'react';

type Props = {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  dragging?: boolean;
  multiple?: boolean;
  setDragging?: (value: boolean) => void;
};

/**
 *
 * @param files
 * @param setFiles
 * @param dragging
 * @param setDragging
 * @param multiple
 * @constructor
 */
const FileUploader = ({
  files,
  setFiles,
  dragging,
  setDragging,
  multiple = true,
}: Props) => {
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (setDragging) setDragging(false);

    const fileList = e.dataTransfer.files
      ? Array.from(e.dataTransfer.files)
      : [];
    if (fileList.length === 0) return;
    if (!multiple) {
      // @ts-ignore
      setFiles([fileList[0]]);
    } else setFiles([...files, ...fileList]);
  };
  const handleDragLeave = () => {
    if (setDragging) setDragging(false);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    if (fileList.length === 0) return;
    if (!multiple) {
      setFiles([fileList[0]]);
    } else setFiles([...files, ...fileList]);
    e.target.value = '';
  };
  return (
    <div className="flex flex-col gap-4 items-center z-50 w-full">
      {dragging && (
        <div className="z-50 flex items-center justify-center fixed h-screen w-screen bg-black bg-opacity-80 top-0 left-0 pointer-events-none">
          <input
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            id="dropzone-files"
            type="file"
            className="w-full h-full z-50 opacity-0  pointer-events-auto"
            multiple={multiple}
            onChange={onUpload}
          />
        </div>
      )}
      <div className="flex w-full items-center justify-center h-[16rem]  ">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col relative items-center justify-center w-full h-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              aria-hidden="true"
              className="w-10 h-10 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {/*SVG, PNG, JPG or GIF (MAX. 800x400px)*/}
              PDF, DOC, DOCX OR TXT (MAX. 10MB)
            </p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="w-full pointer-events-auto cursor-pointer absolute max-w-full h-full opacity-0 top-0 left-0"
            multiple={multiple}
            onChange={onUpload}
          />
        </label>
      </div>
      <div
        className={
          'w-full max-h-[10rem] py-1 px-2 flex justify-center flex-wrap gap-2 bg-bg2 rounded-3xl bg-opacity-60 scroller2 overflow-y-auto overflow-x-hidden'
        }
      >
        {files && files.length > 0 ? (
          files.map((f, key) => (
            <FileItem setFiles={setFiles} key={key} file={f} />
          ))
        ) : (
          <h1 className="text-center text-gray-400">No files</h1>
        )}
      </div>
    </div>
  );
};

export default FileUploader;

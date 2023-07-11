import { Dispatch, SetStateAction } from 'react';

export interface IBaseConfigs {
  setKey: Dispatch<SetStateAction<string[]>>;
  canUpload: boolean;
  toBeCompressed?: boolean;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
}

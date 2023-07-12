import { Dispatch, SetStateAction } from 'react';

export interface IBaseConfigs {
  setKeys: Dispatch<SetStateAction<string[]>>;
  canUpload: boolean;
  toBeCompressed?: boolean;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
}

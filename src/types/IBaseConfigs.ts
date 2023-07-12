export interface IBaseConfigs {
  setKeys: (keys: string[]) => void;
  canUpload: boolean;
  toBeCompressed?: boolean;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
}

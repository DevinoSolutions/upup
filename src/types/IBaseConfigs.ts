export interface IBaseConfigs {
  setKeys: (key: string[]) => void;
  canUpload: boolean;
  toBeCompressed?: boolean;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
}

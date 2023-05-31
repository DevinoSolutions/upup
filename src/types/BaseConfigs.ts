export interface BaseConfigs {
  setKey: (key: string) => void;
  canUpload: boolean;
  toBeCompressed?: boolean;
}

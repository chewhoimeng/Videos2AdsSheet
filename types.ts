
export enum UploadStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

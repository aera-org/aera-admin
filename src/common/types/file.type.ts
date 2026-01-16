export enum FileDir {
  Public = 'public',
  Private = 'private',
}

export interface SignUploadDto {
  fileName: string;
  mime: string;
  folder: FileDir;
}

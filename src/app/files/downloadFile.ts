import { getFileSignedUrl } from './filesApi';

const fallbackDownloadError = 'Unable to download file.';

type DownloadFileParams = {
  id?: string | null;
  url?: string | null;
  fileName?: string | null;
  fallbackName?: string;
};

function resolveFileName(fileName?: string | null, fallbackName?: string) {
  const trimmed = fileName?.trim();
  return trimmed || fallbackName || 'download';
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadFile({
  id,
  url,
  fileName,
  fallbackName,
}: DownloadFileParams) {
  const downloadUrl = id ? await getFileSignedUrl(id) : url;
  if (!downloadUrl) {
    throw new Error(fallbackDownloadError);
  }

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(fallbackDownloadError);
  }

  const blob = await res.blob();
  triggerBrowserDownload(blob, resolveFileName(fileName, fallbackName));
}

import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { IFile, SignUploadDto } from '@/common/types';

type PresignedPayload = {
  url: string;
  fields: Record<string, string>;
};

export type SignUploadResponse = {
  presigned: PresignedPayload;
  file: IFile;
};

type MarkUploadedResponse = {
  success: boolean;
};

const signFallbackError = 'Unable to prepare upload.';
const markFallbackError = 'Unable to finalize upload.';

export async function signUpload(payload: SignUploadDto) {
  const res = await apiFetch('/admin/files/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, signFallbackError);
  }
  return (await res.json()) as SignUploadResponse;
}

export async function markFileUploaded(fileId: string) {
  const res = await apiFetch(`/admin/files/${fileId}/mark-uploaded`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw await buildApiError(res, markFallbackError);
  }
  const payload = (await res.json()) as MarkUploadedResponse;
  return payload.success;
}

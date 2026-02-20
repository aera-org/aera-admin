# Frontend API Contract - Dataset ZIP Download

This document describes how frontend should download a dataset archive.

## Endpoint

`GET /admin/datasets/:id/download`

Example:

`GET /admin/datasets/6a5c5ba5-6c0d-4fe2-8c9b-7dc4be1afc3d/download`

## Response

- Status: `200 OK`
- Body: binary ZIP stream
Headers:
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="<dataset-name>.zip"`
- `Cache-Control: no-store`

Notes:

- `Content-Length` may be absent because response is streamed.
- If dataset has no items with generated files, ZIP is valid but empty.

## ZIP Structure

Flat structure, no nested folders.

For every dataset item that has a file:

- image: `<dataset-name>-<item-number>.<extension>`
- prompt: `<dataset-name>-<item-number>.json`

Rules:

- `item-number` starts from `1`.
- Numbering is based only on items that have a file.
- Items are ordered by `createdAt` ascending before numbering.
- `<dataset-name>` is sanitized for filesystem-safe names.

Example ZIP content:

```text
my-dataset-1.png
my-dataset-1.json
my-dataset-2.jpg
my-dataset-2.json
```

## Error Responses

- `404 Not Found` - dataset with provided `id` does not exist.

## Frontend Example

```ts
const res = await fetch(`/admin/datasets/${datasetId}/download`, {
  method: 'GET',
  credentials: 'include',
});

if (!res.ok) {
  throw new Error(`Download failed: ${res.status}`);
}

const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');

const contentDisposition = res.headers.get('content-disposition');
const fileNameMatch = contentDisposition?.match(/filename="(.+?)"/);
const fileName = fileNameMatch?.[1] ?? 'dataset.zip';

a.href = url;
a.download = fileName;
a.click();
URL.revokeObjectURL(url);
```

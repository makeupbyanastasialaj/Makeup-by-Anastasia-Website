import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Brand images (logo, about photo) live in Blob Storage on the same account as
// the tables — full resolution, no tight size limit like Table Storage strings.

function connectionString(): string {
  const c = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!c) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  return c;
}

const CONTAINER = "media";
let service: BlobServiceClient | undefined;
let ensured = false;

async function container(): Promise<ContainerClient> {
  service ??= BlobServiceClient.fromConnectionString(connectionString());
  const c = service.getContainerClient(CONTAINER);
  if (!ensured) {
    await c.createIfNotExists(); // private container; we serve via /api/media
    ensured = true;
  }
  return c;
}

// Allowed image keys and their parsing.
const DATA_URL = /^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/;

/** Store a data URL as a blob under `key`. Returns nothing. */
export async function putImage(key: string, dataUrl: string): Promise<void> {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new Error("Unsupported image format.");
  const contentType = m[1];
  const buffer = Buffer.from(m[3], "base64");
  const c = await container();
  const blob = c.getBlockBlobClient(key);
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
}

/** Delete a blob under `key` (no error if it doesn't exist). */
export async function deleteImage(key: string): Promise<void> {
  const c = await container();
  await c.getBlockBlobClient(key).deleteIfExists();
}

/** Fetch a blob's bytes + content type, or null if it doesn't exist. */
export async function getImage(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const c = await container();
  const blob = c.getBlockBlobClient(key);
  try {
    const buffer = await blob.downloadToBuffer();
    const props = await blob.getProperties();
    return { buffer, contentType: props.contentType || "application/octet-stream" };
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 404) return null;
    throw err;
  }
}

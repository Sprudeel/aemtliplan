export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export type ImageType = { ext: "png" | "jpg" | "webp"; mime: string };

/** Detects the image type from the file's first bytes, not from its name or claimed MIME type. */
export function detectImageType(data: Uint8Array): ImageType | null {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => data[i] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", mime: "image/png" };
  if (starts(0xff, 0xd8, 0xff)) return { ext: "jpg", mime: "image/jpeg" };
  const ascii = (from: number, to: number) => String.fromCharCode(...data.subarray(from, to));
  if (data.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function mimeForKey(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

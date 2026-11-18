/**
 * Client-side image downscale/compress so uploads stay well under Vercel's
 * ~4.5 MB request body limit. Returns the original file when it is already
 * small enough or when the browser cannot decode it.
 */
export const TARGET_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function compressImage(file: File, targetBytes: number = TARGET_IMAGE_BYTES): Promise<File> {
  if (file.size <= targetBytes && file.type !== 'image/png') return file;
  // Small PNGs are fine as-is (text screenshots compress badly as JPEG).
  if (file.size <= targetBytes) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let quality = 0.85;
    let blob = await toBlob(canvas, quality);
    while (blob && blob.size > targetBytes && quality > 0.4) {
      quality -= 0.15;
      blob = await toBlob(canvas, quality);
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

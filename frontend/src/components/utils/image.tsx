// The largest a team logo needs to be anywhere it is shown, and small enough that a photo
// straight from a phone shrinks to something worth sending over a festival's mobile data.
const MAX_EDGE = 512;
const JPEG_QUALITY = 0.85;

/**
 * Reads a picked file and returns it as a data URL, scaled down to fit within MAX_EDGE.
 * PNGs stay PNGs so a logo keeps its transparent background; everything else becomes JPEG.
 */
export async function shrinkToDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Not a picture'));
    element.src = original;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  if (scale === 1 && original.length < 512 * 1024) {
    return original;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

  const keepsTransparency = file.type === 'image/png';
  return keepsTransparency
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

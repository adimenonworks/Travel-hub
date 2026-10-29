/** Largest cover photo we store (as text, in the trip itself). The security rules allow up to 500 KB. */
const MAX_BYTES = 300_000;

/**
 * Shrinks a photo from the user's device to a small JPEG, returned as a data URL
 * ("data:image/jpeg;base64,…") that can be saved straight into Firestore. That
 * keeps cover photos free: Firebase Storage would need the paid plan.
 */
export async function shrinkPhoto(file: File, maxWidth = 1600, maxHeight = 1000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');
  const img = await load(file);
  const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Step the quality down, then the size, until it fits.
  for (const [q, s] of [[0.8, 1], [0.7, 1], [0.6, 1], [0.6, 0.75], [0.55, 0.5]] as const) {
    let c = canvas;
    if (s < 1) {
      c = document.createElement('canvas');
      c.width = Math.round(canvas.width * s);
      c.height = Math.round(canvas.height * s);
      c.getContext('2d')!.drawImage(canvas, 0, 0, c.width, c.height);
    }
    const url = c.toDataURL('image/jpeg', q);
    if (url.length <= MAX_BYTES) return url;
  }
  throw new Error('That photo is too large. Try another one.');
}

function load(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That photo couldn't be opened. Try a JPEG or PNG.")); };
    img.src = url;
  });
}

/** CSS object-position for a trip's cover photo: the part the owner dragged into view, or the centre. */
export const coverPosition = (t: { coverPosition?: { x: number; y: number } | null }) =>
  t.coverPosition ? `${t.coverPosition.x}% ${t.coverPosition.y}%` : '50% 50%';

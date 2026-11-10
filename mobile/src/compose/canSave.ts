export const maxPhotos = 5;
export const maxDescriptionLength = 500;

export function canSave(description: string, photoCount: number) {
  const text = description.trim();
  return (
    text.length > 0 &&
    text.length <= maxDescriptionLength &&
    photoCount >= 1 &&
    photoCount <= maxPhotos
  );
}

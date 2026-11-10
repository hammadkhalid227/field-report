import {
  compressPhoto,
  compressSteps,
  maxPhotoBytes,
  PhotoTooLargeError,
} from './compressPhoto';

type StepCall = { edge: number; quality: number };

function fakeCompress(calls: StepCall[]) {
  return async (
    uri: string,
    options: { maxWidth: number; quality: number },
  ) => {
    calls.push({ edge: options.maxWidth, quality: options.quality });
    return `${uri}#${options.maxWidth}`;
  };
}

describe('compressPhoto', () => {
  it('stops at the first step when the photo is under 5 MB', async () => {
    const calls: StepCall[] = [];

    const result = await compressPhoto('camera.jpg', {
      compress: fakeCompress(calls),
      sizeOf: async () => maxPhotoBytes,
    });

    expect(result).toBe('camera.jpg#2048');
    expect(calls).toEqual([
      { edge: compressSteps[0].edge, quality: compressSteps[0].quality },
    ]);
  });

  it('tries a smaller step when the first file is still too big', async () => {
    const calls: StepCall[] = [];

    const result = await compressPhoto('camera.jpg', {
      compress: fakeCompress(calls),
      sizeOf: async path =>
        path.endsWith('#2048') ? maxPhotoBytes + 1 : maxPhotoBytes,
    });

    expect(result).toBe('camera.jpg#2048#1600');
    expect(calls).toEqual(
      compressSteps.slice(0, 2).map(step => ({
        edge: step.edge,
        quality: step.quality,
      })),
    );
  });

  it('refuses a photo that is still over 5 MB after every step', async () => {
    const calls: StepCall[] = [];

    await expect(
      compressPhoto('camera.jpg', {
        compress: fakeCompress(calls),
        sizeOf: async () => maxPhotoBytes + 1,
      }),
    ).rejects.toBeInstanceOf(PhotoTooLargeError);

    expect(calls).toEqual(
      compressSteps.map(step => ({
        edge: step.edge,
        quality: step.quality,
      })),
    );
  });
});

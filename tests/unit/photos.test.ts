import {
  generatePhotoSeed,
  generateProductPhotos,
  PHOTO_URL_PATTERN,
  photoUrl,
} from '@/lib/photos';

describe('photos', () => {
  test('U-PHOTO-01 photoUrl("pcc-mug-1") returns the exact URL string', () => {
    expect(photoUrl('pcc-mug-1')).toBe('https://picsum.photos/400/400?seed=pcc-mug-1');
  });

  test('U-PHOTO-02 generatePhotoSeed() is 12 chars of [a-z0-9]', () => {
    expect(generatePhotoSeed()).toMatch(/^[a-z0-9]{12}$/);
  });

  test('U-PHOTO-03 generateProductPhotos() → 3 distinct URLs, all matching PHOTO_URL_PATTERN', () => {
    const [a, b, c] = generateProductPhotos();
    expect([a, b, c]).toHaveLength(3);
    expect(new Set([a, b, c]).size).toBe(3);
    for (const url of [a, b, c]) {
      expect(url).toMatch(PHOTO_URL_PATTERN);
    }
  });
});

import crypto from 'node:crypto';

export const PHOTO_URL_PATTERN = /^https:\/\/picsum\.photos\/400\/400\?seed=[A-Za-z0-9-]{4,40}$/;

const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SEED_LENGTH = 12;

export function generatePhotoSeed(): string {
  let seed = '';
  for (let i = 0; i < SEED_LENGTH; i++) {
    seed += SEED_ALPHABET[crypto.randomInt(SEED_ALPHABET.length)];
  }
  return seed;
}

export function photoUrl(seed: string): string {
  const url = `https://picsum.photos/400/400?seed=${seed}`;
  if (!PHOTO_URL_PATTERN.test(url)) {
    throw new RangeError(`Invalid photo seed: ${seed}`);
  }
  return url;
}

export function generateProductPhotos(): [string, string, string] {
  for (;;) {
    const seeds = [generatePhotoSeed(), generatePhotoSeed(), generatePhotoSeed()];
    if (new Set(seeds).size === 3) {
      return [photoUrl(seeds[0]), photoUrl(seeds[1]), photoUrl(seeds[2])];
    }
  }
}

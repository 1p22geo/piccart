'use client';

import { productImage } from '@/lib/product-image';
import { useState } from 'react';

type Props = { photos: string[]; name: string };

export function ProductGallery({ photos, name }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div className="gallery">
      <img data-testid="photo-main" src={productImage(photos[active])} alt={name} className="gallery__main" />
      <div className="gallery__thumbs">
        {photos.map((photo, index) => (
          <button
            key={index}
            type="button"
            data-testid="photo-thumb"
            data-photo-index={index}
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
            aria-label={`photo ${index + 1}`}
          >
            <img src={productImage(photo)} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}

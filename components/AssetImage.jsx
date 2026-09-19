'use client';

import { useState } from 'react';
import { safeURL } from '@/lib/repository';

export default function AssetImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const url = safeURL(src);
  if (!url || failed) return <div className={`image-missing ${className}`}>Image unavailable</div>;
  // Original URLs may be signed or externally hosted. Do not proxy or cache them through image optimization.
  return <img src={url} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

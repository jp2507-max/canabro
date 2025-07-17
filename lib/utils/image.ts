// lib/utils/image.ts

// Utility constants and helper functions for working with remote images
// across the CanaBro application. These helpers centralise the logic for
// building CDN-optimised URLs and configuring `expo-image` with
// performance-focused defaults.

 

export type ImageSize = 'thumbnail' | 'small' | 'medium';

/**
 * Mapping between logical size names and the concrete pixel width we
 * request from the CDN. The height is assumed to match the width since
 * strain card thumbnails are rendered in a square.
 */
const SIZE_TO_WIDTH: Record<ImageSize, number> = {
  thumbnail: 150,
  small: 300,
  medium: 600,
};

/**
 * Default placeholder blur-hash used while a remote image is loading or
 * when the requested image cannot be fetched.
 *
 * This generic blurhash renders a neutral greyish placeholder which
 * blends in nicely with both light and dark themes.
 */
export const PLACEHOLDER_BLUR_HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export const IMAGE_CACHE_POLICY = 'memory-disk' as const;
export const IMAGE_PRIORITY_HIGH = 'high' as const;
export const IMAGE_TRANSITION_DURATION = 200; // milliseconds

/**
 * generateCDNImageURL
 * -------------------
 * Appends size and format parameters to a base image URL so that the
 * CDN delivers an appropriately sized and compressed asset.
 *
 * @example
 * generateCDNImageURL('https://cdn.myimages.com/strain/abc123.jpg', 'thumbnail');
 * // -> 'https://cdn.myimages.com/strain/abc123.jpg?w=150&format=webp'
 */
export function generateCDNImageURL(baseUrl?: string, size: ImageSize = 'thumbnail'): string {
  if (!baseUrl || typeof baseUrl !== 'string') return '';

  // Prevent double-encoding when the URL already contains query params
  const separator = baseUrl.includes('?') ? '&' : '?';

  const width = SIZE_TO_WIDTH[size];

  // Request WebP by default (better compression) – the CDN should fall
  // back to JPEG/PNG automatically when the client does not support WebP.
  return `${baseUrl}${separator}w=${width}&format=webp`;
} 
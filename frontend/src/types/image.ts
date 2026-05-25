// Image System

export interface ImageUploadOptions {
  maxSize?: number;           // Max file size in bytes (default: 5MB)
  maxFiles?: number;          // Max number of files (default: 10)
  acceptedFormats?: string[]; // Accepted formats (default: jpg, png, webp)
  resize?: {
    width?: number;
    height?: number;
    quality?: number;         // 0-100
  };
  optimize?: boolean;         // Auto-optimize (default: true)
}

export interface ImageFile {
  id: string;
  file: File;
  preview: string;            // Base64 or blob URL
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;           // 0-100
  error?: string;
  url?: string;               // CDN URL after upload
  optimized?: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  };
}

export interface ImageVariant {
  name: string;
  width: number;
  height?: number;
  quality: number;
  url: string;
}

export interface ProcessedImage {
  id: string;
  original: string;           // Original URL
  variants: ImageVariant[];   // Resized variants
  thumbnail: string;          // Small thumbnail
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface CDNConfig {
  baseUrl: string;
  bucket?: string;
  region?: string;
}

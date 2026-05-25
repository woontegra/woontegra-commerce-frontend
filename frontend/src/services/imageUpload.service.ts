import type { ImageUploadOptions, ProcessedImage, ImageVariant } from '../types/image';

class ImageUploadService {
  private readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_MAX_FILES = 10;
  private readonly DEFAULT_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  
  // CDN base URL (in production: use actual CDN)
  private readonly CDN_BASE_URL = import.meta.env.VITE_CDN_URL || '/uploads';

  // Validate files
  validateFiles(files: File[], options: ImageUploadOptions = {}): { valid: File[]; errors: string[] } {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    const maxFiles = options.maxFiles || this.DEFAULT_MAX_FILES;
    const acceptedFormats = options.acceptedFormats?.map(f => `image/${f}`) || this.DEFAULT_FORMATS;
    
    const valid: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Maksimum ${maxFiles} dosya yükleyebilirsiniz`);
      return { valid, errors };
    }

    files.forEach((file) => {
      // Check format
      if (!acceptedFormats.includes(file.type)) {
        errors.push(`${file.name}: Desteklenmeyen format`);
        return;
      }

      // Check size
      if (file.size > maxSize) {
        errors.push(`${file.name}: Dosya boyutu çok büyük (max: ${this.formatBytes(maxSize)})`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }

  // Create image preview
  async createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to create preview'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Resize image
  async resizeImage(
    file: File,
    width: number,
    height?: number,
    quality: number = 0.9
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate dimensions
        let targetWidth = width;
        let targetHeight = height || (img.height * (width / img.width));

        // Maintain aspect ratio if only width is provided
        if (!height) {
          const ratio = img.width / img.height;
          targetHeight = targetWidth / ratio;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw resized image
        ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Optimize image
  async optimizeImage(file: File, quality: number = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx?.drawImage(img, 0, 0);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/webp', // Use WebP for better compression
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Create multiple variants
  async createVariants(file: File): Promise<ImageVariant[]> {
    const variants: ImageVariant[] = [];

    // Thumbnail (150x150)
    const thumbnail = await this.resizeImage(file, 150, 150, 0.8);
    variants.push({
      name: 'thumbnail',
      width: 150,
      height: 150,
      quality: 80,
      url: URL.createObjectURL(thumbnail),
    });

    // Small (400px width)
    const small = await this.resizeImage(file, 400, undefined, 0.85);
    variants.push({
      name: 'small',
      width: 400,
      quality: 85,
      url: URL.createObjectURL(small),
    });

    // Medium (800px width)
    const medium = await this.resizeImage(file, 800, undefined, 0.9);
    variants.push({
      name: 'medium',
      width: 800,
      quality: 90,
      url: URL.createObjectURL(medium),
    });

    // Large (1200px width)
    const large = await this.resizeImage(file, 1200, undefined, 0.9);
    variants.push({
      name: 'large',
      width: 1200,
      quality: 90,
      url: URL.createObjectURL(large),
    });

    return variants;
  }

  // Upload to CDN (mock)
  async uploadToCDN(_file: File | Blob, filename: string): Promise<string> {
    // In production: Upload to S3, Cloudinary, etc.
    // const formData = new FormData();
    // formData.append('file', file, filename);
    // const response = await fetch('/api/upload', { method: 'POST', body: formData });
    // return response.json().url;

    // Mock upload
    return new Promise((resolve) => {
      setTimeout(() => {
        const url = `${this.CDN_BASE_URL}/${filename}`;
        console.log('📤 Uploaded to CDN:', url);
        resolve(url);
      }, 1000);
    });
  }

  // Process and upload image
  async processAndUpload(
    file: File,
    options: ImageUploadOptions = {}
  ): Promise<ProcessedImage> {
    const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Optimize if enabled
    let processedFile: File | Blob = file;
    let optimizedSize = file.size;
    
    if (options.optimize !== false) {
      processedFile = await this.optimizeImage(file, options.resize?.quality || 0.85);
      optimizedSize = processedFile.size;
    }

    // Resize if specified
    if (options.resize?.width) {
      processedFile = await this.resizeImage(
        file,
        options.resize.width,
        options.resize.height,
        options.resize.quality || 0.9
      );
    }

    // Upload original
    const originalUrl = await this.uploadToCDN(processedFile, `${id}-original.webp`);

    // Create variants
    const variants = await this.createVariants(file);
    
    // Upload variants (in production)
    // for (const variant of variants) {
    //   variant.url = await this.uploadToCDN(variant.blob, `${id}-${variant.name}.webp`);
    // }

    // Get metadata
    const img = await this.loadImage(file);
    
    return {
      id,
      original: originalUrl,
      variants,
      thumbnail: variants.find(v => v.name === 'thumbnail')?.url || originalUrl,
      metadata: {
        width: img.width,
        height: img.height,
        size: optimizedSize,
        format: 'webp',
      },
    };
  }

  // Load image to get metadata
  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Format bytes
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const imageUploadService = new ImageUploadService();

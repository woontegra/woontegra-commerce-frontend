import { useState, useRef } from 'react';
import type { ImageFile, ImageUploadOptions } from '../../types/image';
import { imageUploadService } from '../../services/imageUpload.service';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void;
  options?: ImageUploadOptions;
  maxFiles?: number;
}

export default function ImageUploader({ onUpload, options = {}, maxFiles = 10 }: ImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate
    const { valid, errors } = imageUploadService.validateFiles(fileArray, options);
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    // Create image files with previews
    const newImages: ImageFile[] = await Promise.all(
      valid.map(async (file) => {
        const preview = await imageUploadService.createPreview(file);
        return {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          status: 'pending' as const,
          progress: 0,
        };
      })
    );

    setImages([...images, ...newImages]);

    // Auto-upload
    uploadImages(newImages);
  };

  const uploadImages = async (imagesToUpload: ImageFile[]) => {
    const uploadedUrls: string[] = [];

    for (const image of imagesToUpload) {
      try {
        // Update status
        updateImageStatus(image.id, 'uploading', 0);

        // Process and upload
        const processed = await imageUploadService.processAndUpload(image.file, options);

        // Update status
        updateImageStatus(image.id, 'success', 100, processed.original);
        
        uploadedUrls.push(processed.original);
        
        toast.success(`${image.file.name} yüklendi`);
      } catch (error) {
        console.error('Upload error:', error);
        updateImageStatus(image.id, 'error', 0, undefined, 'Yükleme başarısız');
        toast.error(`${image.file.name} yüklenemedi`);
      }
    }

    if (uploadedUrls.length > 0) {
      onUpload(uploadedUrls);
    }
  };

  const updateImageStatus = (
    id: string,
    status: ImageFile['status'],
    progress: number,
    url?: string,
    error?: string
  ) => {
    setImages(prev =>
      prev.map(img =>
        img.id === id
          ? { ...img, status, progress, url, error }
          : img
      )
    );
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Görselleri sürükleyin veya tıklayın
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          PNG, JPG, WEBP (max. {maxFiles} dosya)
        </p>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                
                {/* Status Overlay */}
                {image.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                      <p className="text-xs">{image.progress}%</p>
                    </div>
                  </div>
                )}
                
                {image.status === 'success' && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                {image.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                    <p className="text-xs text-red-600 dark:text-red-400">Hata</p>
                  </div>
                )}
              </div>
              
              {/* Remove Button */}
              <button
                onClick={() => removeImage(image.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

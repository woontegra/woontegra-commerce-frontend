interface GallerySectionProps {
  content: {
    images: string[];
    columns: number;
  };
}

export default function GallerySection({ content }: GallerySectionProps) {
  // Mock images if empty
  const displayImages = content.images.length > 0 
    ? content.images 
    : Array.from({ length: 6 }, () => '');

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 md:grid-cols-${content.columns} gap-4`}>
          {displayImages.map((image, index) => (
            <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
              {image ? (
                <img src={image} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

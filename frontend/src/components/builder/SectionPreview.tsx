import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import ProductGrid from './sections/ProductGrid';
import TextBlock from './sections/TextBlock';
import CTASection from './sections/CTASection';
import GallerySection from './sections/GallerySection';
import type { Section } from './SectionLibrary';

interface SectionPreviewProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SectionPreview({ 
  section, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: SectionPreviewProps) {
  const renderSection = () => {
    switch (section.type) {
      case 'hero':
        return <HeroSection content={section.content} />;
      case 'features':
        return <FeaturesSection content={section.content} />;
      case 'products':
        return <ProductGrid content={section.content} />;
      case 'text':
        return <TextBlock content={section.content} />;
      case 'cta':
        return <CTASection content={section.content} />;
      case 'gallery':
        return <GallerySection content={section.content} />;
      default:
        return <div className="p-8 bg-gray-100 text-center">Unknown section type</div>;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative group cursor-pointer transition-all ${
        isSelected ? 'border-2 border-blue-500 rounded-xl' : 'border-2 border-transparent'
      }`}
    >
      {renderSection()}
      
      {/* Section Toolbar */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="bg-white text-blue-600 p-2 rounded-lg shadow-lg hover:bg-blue-50"
          title="Düzenle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="bg-white text-red-600 p-2 rounded-lg shadow-lg hover:bg-red-50"
          title="Sil"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

import type { Section } from './SectionLibrary';

interface SectionRendererProps {
  section: Section;
  isEditing?: boolean;
  onEdit?: (section: Section) => void;
}

export default function SectionRenderer({ section, isEditing, onEdit }: SectionRendererProps) {
  const handleClick = () => {
    if (isEditing && onEdit) {
      onEdit(section);
    }
  };

  const renderContent = () => {
    switch (section.type) {
      case 'hero':
        return (
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {section.content.title}
              </h1>
              <p className="text-xl md:text-2xl mb-8">
                {section.content.subtitle}
              </p>
              <a
                href={section.content.buttonLink}
                className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                {section.content.buttonText}
              </a>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">
                {section.content.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.content.items.map((item: any, index: number) => (
                  <div key={index} className="text-center">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="py-16">
            <div className="container mx-auto px-4">
              <h2 className={`text-3xl font-bold mb-4 text-${section.content.alignment}`}>
                {section.content.title}
              </h2>
              <p className={`text-gray-600 text-${section.content.alignment}`}>
                {section.content.content}
              </p>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div
            className="py-16 text-white"
            style={{ backgroundColor: section.content.backgroundColor }}
          >
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">{section.content.title}</h2>
              <p className="text-xl mb-8">{section.content.description}</p>
              <a
                href={section.content.buttonLink}
                className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                {section.content.buttonText}
              </a>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-16 bg-gray-100">
            <div className="container mx-auto px-4 text-center">
              <p className="text-gray-600">Section type: {section.type}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      onClick={handleClick}
      className={isEditing ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 relative' : ''}
    >
      {renderContent()}
      {isEditing && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Click to edit
        </div>
      )}
    </div>
  );
}

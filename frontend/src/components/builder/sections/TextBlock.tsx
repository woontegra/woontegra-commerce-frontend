interface TextBlockProps {
  content: {
    title: string;
    content: string;
    alignment: 'left' | 'center' | 'right';
  };
}

export default function TextBlock({ content }: TextBlockProps) {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h2 className={`text-3xl font-bold mb-4 text-${content.alignment}`}>
          {content.title}
        </h2>
        <p className={`text-gray-600 text-${content.alignment} max-w-3xl ${content.alignment === 'center' ? 'mx-auto' : ''}`}>
          {content.content}
        </p>
      </div>
    </div>
  );
}

interface CTASectionProps {
  content: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    backgroundColor: string;
  };
}

export default function CTASection({ content }: CTASectionProps) {
  return (
    <div
      className="py-16 text-white"
      style={{ backgroundColor: content.backgroundColor }}
    >
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{content.title}</h2>
        <p className="text-xl mb-8">{content.description}</p>
        <a
          href={content.buttonLink}
          className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          {content.buttonText}
        </a>
      </div>
    </div>
  );
}

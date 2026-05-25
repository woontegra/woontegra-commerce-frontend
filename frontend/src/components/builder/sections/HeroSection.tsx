interface HeroSectionProps {
  content: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    backgroundImage?: string;
  };
}

export default function HeroSection({ content }: HeroSectionProps) {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          {content.title}
        </h1>
        <p className="text-xl md:text-2xl mb-8">
          {content.subtitle}
        </p>
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

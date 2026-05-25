export interface Section {
  id: string;
  type: string;
  content: any;
}

export const sectionTypes = {
  hero: {
    id: 'hero',
    name: 'Hero Section',
    icon: '🎯',
    defaultContent: {
      title: 'Welcome to Our Store',
      subtitle: 'Discover amazing products',
      buttonText: 'Shop Now',
      buttonLink: '/products',
      backgroundImage: '',
    },
  },
  features: {
    id: 'features',
    name: 'Features',
    icon: '⭐',
    defaultContent: {
      title: 'Our Features',
      items: [
        { icon: '🚚', title: 'Free Shipping', description: 'On orders over $50' },
        { icon: '🔒', title: 'Secure Payment', description: '100% secure transactions' },
        { icon: '↩️', title: 'Easy Returns', description: '30-day return policy' },
      ],
    },
  },
  products: {
    id: 'products',
    name: 'Product Grid',
    icon: '🛍️',
    defaultContent: {
      title: 'Featured Products',
      limit: 8,
      showPrice: true,
      showAddToCart: true,
    },
  },
  text: {
    id: 'text',
    name: 'Text Block',
    icon: '📝',
    defaultContent: {
      title: 'Section Title',
      content: 'Add your content here...',
      alignment: 'left',
    },
  },
  cta: {
    id: 'cta',
    name: 'Call to Action',
    icon: '📢',
    defaultContent: {
      title: 'Ready to get started?',
      description: 'Join thousands of satisfied customers',
      buttonText: 'Get Started',
      buttonLink: '/products',
      backgroundColor: '#3B82F6',
    },
  },
  gallery: {
    id: 'gallery',
    name: 'Image Gallery',
    icon: '🖼️',
    defaultContent: {
      images: [],
      columns: 3,
    },
  },
};

export function createSection(type: string): Section {
  const sectionType = sectionTypes[type as keyof typeof sectionTypes];
  return {
    id: `${type}-${Date.now()}`,
    type,
    content: { ...sectionType.defaultContent },
  };
}

interface ProductGridProps {
  content: {
    title: string;
    limit: number;
    showPrice: boolean;
    showAddToCart: boolean;
  };
}

export default function ProductGrid({ content }: ProductGridProps) {
  // Mock products for preview
  const mockProducts = Array.from({ length: content.limit }, (_, i) => ({
    id: i + 1,
    name: `Ürün ${i + 1}`,
    price: 99.99,
    image: '',
  }));

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {content.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {mockProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
              <h3 className="font-semibold mb-2">{product.name}</h3>
              {content.showPrice && (
                <p className="text-blue-600 font-bold mb-2">${product.price}</p>
              )}
              {content.showAddToCart && (
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Sepete Ekle
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

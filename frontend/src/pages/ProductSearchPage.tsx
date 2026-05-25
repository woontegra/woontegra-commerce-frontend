import React from 'react';
import ProductSearch from '../components/ProductSearch';

const ProductSearchPage: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürün Arama</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Meilisearch ile anlık arama — typo toleranslı, filtrelenebilir
      </p>
    </div>
    <ProductSearch />
  </div>
);

export default ProductSearchPage;

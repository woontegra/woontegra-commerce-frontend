import { Link } from 'react-router-dom';
import type { StorefrontCategory } from '../../contexts/StorefrontTenantContext';

type Props = {
  category: StorefrontCategory;
  url: string;
};

export function CategoryCard({ category, url }: Props) {
  return (
    <Link
      to={url}
      className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition"
    >
      {category.imageUrl ? (
        <img src={category.imageUrl} alt="" className="h-20 w-full object-cover rounded-lg mb-3" />
      ) : null}
      <span className="font-medium text-slate-800">{category.name}</span>
    </Link>
  );
}

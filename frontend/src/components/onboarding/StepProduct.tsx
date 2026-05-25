import { useState } from 'react';
import { 
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Upload,
  Plus,
  Package
} from 'lucide-react';

interface ProductData {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  stock: string;
  sku: string;
  imageUrl: string;
  isActive: boolean;
}

interface StepProductProps {
  data: ProductData;
  onChange: (data: ProductData) => void;
  onSkip?: () => void;
}

export default function StepProduct({ data, onChange, onSkip }: StepProductProps) {
  const [mode, setMode] = useState<'choice' | 'form'>('choice');

  const handleOptionClick = (optionId: string) => {
    if (optionId === 'quick') {
      setMode('form');
    } else if (optionId === 'xml') {
      // Open XML import in new tab, then skip
      window.open('/dashboard/xml-import', '_blank');
      onSkip?.();
    } else {
      // For integration, skip to next step
      onSkip?.();
    }
  };

  const handleChange = (field: keyof ProductData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Product Form Mode
  if (mode === 'form') {
    return (
      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => setMode('choice')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Geri dön</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-brand-600 mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            İlk Ürününüzü Ekleyin
          </h2>
          <p className="text-slate-600">
            Mağazanızda satışa sunacağınız ilk ürünü oluşturun
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-5">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ürün Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Örn: El Yapımı Sabun"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Açıklama
            </label>
            <textarea
              value={data.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ürününüzü müşterilere nasıl tanımlarsınız?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Category & SKU */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kategori
              </label>
              <select
                value={data.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
              >
                <option value="">Kategori seçin</option>
                <option value="giyim">Giyim</option>
                <option value="elektronik">Elektronik</option>
                <option value="ev-yasam">Ev & Yaşam</option>
                <option value="kozmetik">Kozmetik</option>
                <option value="kitap">Kitap & Kırtasiye</option>
                <option value="spor">Spor & Outdoor</option>
                <option value="oyuncak">Oyuncak & Hobi</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SKU (Stok Kodu)
              </label>
              <input
                type="text"
                value={data.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                placeholder="Örn: PRD-001"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Price and Stock */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fiyat (₺) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={data.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="99.99"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stok <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={data.stock}
                onChange={(e) => handleChange('stock', e.target.value)}
                placeholder="10"
                min="0"
                step="1"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durum
              </label>
              <select
                value={data.isActive ? 'active' : 'inactive'}
                onChange={(e) => handleChange('isActive', e.target.value === 'active' ? 'true' : 'false')}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
              >
                <option value="active">Aktif (Satışta)</option>
                <option value="inactive">Pasif (Taslak)</option>
              </select>
            </div>
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ürün Görseli
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={data.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
              <button
                type="button"
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Yükle</span>
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Ürün görseli URL'i veya görsel yükleyin (opsiyonel)
            </p>
          </div>

          {/* Image Preview */}
          {data.imageUrl && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <img 
                src={data.imageUrl} 
                alt="Product preview" 
                className="w-20 h-20 object-cover rounded-lg bg-white border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div>
                <p className="font-medium text-slate-700">Ürün Önizleme</p>
                <p className="text-sm text-slate-500">Mağazada böyle görünecek</p>
              </div>
            </div>
          )}

          {/* Summary Preview */}
          {data.name && data.price && (
            <div className="p-4 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-sm font-medium text-brand-800 mb-1">Ürün Özeti</p>
              <p className="text-brand-700">
                <strong>{data.name}</strong> — ₺{data.price}
                {data.stock && ` (${data.stock} adet stok)`}
                {data.categoryId && ` • ${data.categoryId}`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">
            💡 <strong>Bilgi:</strong> Bu sadece ilk ürününüz. Daha sonra 
            ürünler sayfasından istediğiniz kadar ürün ekleyebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  // Choice Mode (Default) - NEW DESIGN
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="text-center mb-12 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Ürünlerinizi Nasıl Eklemek İstersiniz?
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Size en uygun yöntemi seçin. İsterseniz daha sonra ürün ekleyebilirsiniz.
        </p>
      </div>

      {/* Options - Full Width Cards */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6">
        <div className="space-y-6 mb-12">
          {/* PRIMARY: XML/Excel Upload */}
          <div
            onClick={() => handleOptionClick('xml')}
            className="group relative p-8 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/80 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01] hover:border-violet-300"
          >
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileSpreadsheet className="w-10 h-10" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  XML / Excel ile Yükle
                </h3>
                <p className="text-slate-600 text-lg mb-4">
                  Mevcut ürün listenizi toplu olarak içe aktarın. En verimli yöntem.
                </p>
                
                {/* Button */}
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 group-hover:scale-105">
                  Toplu Ürün Yükle
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Recommended Badge */}
              <div className="px-4 py-2 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full border border-violet-200">
                Önerilen
              </div>
            </div>
          </div>

          {/* SECONDARY: Quick Start */}
          <div
            onClick={() => handleOptionClick('quick')}
            className="group p-8 rounded-2xl border-2 border-slate-200 bg-white cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-slate-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                <Plus className="w-10 h-10" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Hızlı Başla
                </h3>
                <p className="text-slate-600 text-lg mb-4">
                  Tek ürün ekleyerek hemen satışa başlayın.
                </p>
                
                {/* Button */}
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-200">
                  Ürün Ekle
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skip Link */}
        <div className="text-center pb-8">
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-700 font-medium transition-colors inline-flex items-center gap-2"
          >
            Şimdilik atla ve dashboard'a git
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

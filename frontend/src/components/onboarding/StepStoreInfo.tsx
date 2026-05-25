import { useState, useCallback } from 'react';
import { Store, Upload, ArrowRight, X } from 'lucide-react';

interface StoreInfo {
  name: string;
  description: string;
  logoUrl: string;
}

interface StepStoreInfoProps {
  data: StoreInfo;
  onChange: (data: StoreInfo) => void;
  onNext: () => void;
}

export default function StepStoreInfo({ data, onChange, onNext }: StepStoreInfoProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (field: keyof StoreInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: Handle file upload
  }, []);

  const clearLogo = () => {
    handleChange('logoUrl', '');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="text-center mb-10 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 mb-6">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Mağazanızı Tanımlayın
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Markanızı oluşturun ve müşterilerinizin size nasıl ulaşacağını belirleyin.
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">
                Mağaza Adı
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Mağazanızın adı"
                className="w-full px-6 py-4 text-lg rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">
                Açıklama
              </label>
              <textarea
                value={data.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Mağazanızı kısaca tanıtın..."
                rows={4}
                className="w-full px-6 py-4 text-lg rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm resize-none"
              />
              <p className="mt-2 text-sm text-slate-400">
                SEO için önemli, kısa ve öz yazın.
              </p>
            </div>
          </div>

          {/* Right Column - Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">
              Mağaza Logosu
            </label>
            
            {!data.logoUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-2xl p-12
                  flex flex-col items-center justify-center
                  transition-all duration-200 cursor-pointer
                  ${isDragging
                    ? 'border-violet-500 bg-violet-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                  }
                `}
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-slate-500" />
                </div>
                <p className="text-lg font-medium text-slate-700 mb-1">
                  Logo yükleyin
                </p>
                <p className="text-sm text-slate-400">
                  veya sürükleyip bırakın
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  PNG, JPG, SVG (max 5MB)
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl p-8 bg-slate-50 border border-slate-200">
                <button
                  onClick={clearLogo}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
                <div className="flex flex-col items-center">
                  <img
                    src={data.logoUrl}
                    alt="Logo preview"
                    className="w-32 h-32 object-contain rounded-xl bg-white shadow-sm mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="text-sm text-slate-500">Logo önizlemesi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex justify-end max-w-4xl mx-auto w-full px-6 pb-8 mt-10">
        <button
          onClick={onNext}
          disabled={!data.name}
          className={`
            group flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg
            transition-all duration-200
            ${data.name
              ? 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          Devam Et
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

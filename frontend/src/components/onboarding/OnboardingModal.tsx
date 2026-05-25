import { useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Step = 'store-name' | 'logo' | 'first-product';

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('store-name');
  const [storeName, setStoreName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');

  const steps: Step[] = ['store-name', 'logo', 'first-product'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep === 'store-name' && storeName.trim()) {
      setCurrentStep('logo');
    } else if (currentStep === 'logo') {
      setCurrentStep('first-product');
    } else if (currentStep === 'first-product' && productName.trim() && productPrice.trim()) {
      handleComplete();
    }
  };

  const handleSkip = () => {
    if (currentStep === 'logo') {
      setCurrentStep('first-product');
    } else if (currentStep === 'first-product') {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Save onboarding data to localStorage or API
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('store_name', storeName);
    onComplete();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full animate-scale-in">
        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white">
              Hoş Geldiniz! 🎉
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Store Name */}
          {currentStep === 'store-name' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-2">
                  Mağazanızın adı nedir?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
                  Müşterilerinizin göreceği mağaza adını girin
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Örn: Woontegra Store"
                  className="input-standard w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Logo */}
          {currentStep === 'logo' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-2">
                  Mağaza logonuzu ekleyin
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
                  İsteğe bağlı - Daha sonra da ekleyebilirsiniz
                </p>
              </div>
              <div className="flex flex-col items-center">
                {logo ? (
                  <div className="mb-4">
                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {logo.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Logo yüklemek için tıklayın
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      PNG, JPG (max. 2MB)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 3: First Product */}
          {currentStep === 'first-product' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-2">
                  İlk ürününüzü ekleyin
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
                  Hızlıca başlamak için bir ürün ekleyin
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
                    Ürün Adı
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Örn: Premium T-Shirt"
                    className="input-standard w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
                    Fiyat
                  </label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="0.00"
                    className="input-standard w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            {currentStep === 'first-product' ? 'Şimdi Değil' : 'Atla'}
          </button>
          <button
            onClick={handleNext}
            disabled={
              (currentStep === 'store-name' && !storeName.trim()) ||
              (currentStep === 'first-product' && (!productName.trim() || !productPrice.trim()))
            }
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {currentStep === 'first-product' ? 'Tamamla' : 'Devam Et'}
          </button>
        </div>
      </div>
    </div>
  );
}

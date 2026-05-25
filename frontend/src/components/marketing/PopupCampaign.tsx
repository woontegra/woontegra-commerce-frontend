import { useState, useEffect } from 'react';
import type { PopupCampaign } from '../../types/marketing';

interface PopupCampaignProps {
  campaign: PopupCampaign;
  onClose: () => void;
  onSubmit: (data: { email?: string }) => void;
}

export default function PopupCampaignComponent({ campaign, onClose, onSubmit }: PopupCampaignProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Track view
    console.log('Popup viewed:', campaign.id);
  }, [campaign.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({ email: campaign.collectEmail ? email : undefined });
      onClose();
    } catch (error) {
      console.error('Popup submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        {campaign.image && (
          <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600">
            <img 
              src={campaign.image} 
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {campaign.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {campaign.description}
          </p>

          {/* Discount Code */}
          {campaign.discountCode && (
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                İndirim Kodu
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                {campaign.discountCode}
              </p>
              {campaign.discountAmount && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  %{campaign.discountAmount} indirim
                </p>
              )}
            </div>
          )}

          {/* Email Collection Form */}
          {campaign.collectEmail ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={campaign.emailPlaceholder || 'Email adresiniz'}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Gönderiliyor...' : campaign.buttonText}
              </button>
            </form>
          ) : (
            <a
              href={campaign.buttonLink || '#'}
              onClick={onClose}
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-center hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              {campaign.buttonText}
            </a>
          )}

          {/* Privacy Note */}
          {campaign.collectEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Email adresiniz güvende. İstediğiniz zaman abonelikten çıkabilirsiniz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

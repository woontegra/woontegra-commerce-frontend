import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Popup as PopupType } from '../types/popup';

interface PopupProps {
  popup: PopupType;
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ popup, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      switch (popup.triggerType) {
        case 'time':
          // Show after specified milliseconds
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, popup.triggerValue);
          return () => clearTimeout(timer);

        case 'exit_intent':
          // Show when mouse leaves viewport
          const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) {
              setIsVisible(true);
            }
          };
          document.addEventListener('mouseleave', handleMouseLeave);
          return () => document.removeEventListener('mouseleave', handleMouseLeave);

        case 'scroll':
          // Show when scrolled to specified percentage
          const handleScroll = () => {
            const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercentage >= popup.triggerValue) {
              setIsVisible(true);
            }
          };
          window.addEventListener('scroll', handleScroll);
          return () => window.removeEventListener('scroll', handleScroll);

        default:
          setIsVisible(true);
      }
    };

    const cleanup = handleTrigger();
    return cleanup;
  }, [popup.triggerType, popup.triggerValue]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleButtonClick = () => {
    if (popup.buttonLink) {
      window.location.href = popup.buttonLink;
    }
    handleClose();
  };

  if (!isVisible) return null;

  const getPositionClasses = () => {
    switch (popup.position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      case 'center':
      default:
        return 'items-center';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Popup Container */}
      <div className={`flex min-h-full justify-center p-4 ${getPositionClasses()}`}>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Image */}
          {popup.imageUrl && (
            <div className="w-full h-48 overflow-hidden rounded-t-2xl">
              <img
                src={popup.imageUrl}
                alt={popup.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {popup.title}
            </h2>
            
            <div 
              className="text-gray-600 mb-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: popup.content }}
            />

            {/* Button */}
            {popup.buttonText && (
              <button
                onClick={handleButtonClick}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {popup.buttonText}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Popup;

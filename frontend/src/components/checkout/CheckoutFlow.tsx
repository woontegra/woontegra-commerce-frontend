import { useState } from 'react';
import type { OrderStep, CheckoutData } from '../../types/order';
import CartStep from './CartStep';
import AddressStep from './AddressStep';
import PaymentStep from './PaymentStep';
import ConfirmationStep from './ConfirmationStep';

export default function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState<OrderStep>('cart');
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    step: 'cart',
    cart: {
      items: [],
      subtotal: 0,
    },
    useSameAddress: true,
  });

  const steps: { key: OrderStep; label: string; icon: string }[] = [
    { key: 'cart', label: 'Sepet', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { key: 'address', label: 'Adres', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'payment', label: 'Ödeme', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { key: 'confirmation', label: 'Onay', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const handleNext = (data?: Partial<CheckoutData>) => {
    if (data) {
      setCheckoutData(prev => ({ ...prev, ...data }));
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${index <= currentStepIndex 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }
                `}>
                  {index < currentStepIndex ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                    </svg>
                  )}
                </div>
                <span className={`
                  text-sm font-medium mt-2
                  ${index <= currentStepIndex 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-400'
                  }
                `}>
                  {step.label}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-1 mx-4 transition-all duration-200
                  ${index < currentStepIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-200 dark:bg-gray-700'
                  }
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        {currentStep === 'cart' && (
          <CartStep 
            data={checkoutData} 
            onNext={handleNext}
          />
        )}
        
        {currentStep === 'address' && (
          <AddressStep 
            data={checkoutData} 
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        
        {currentStep === 'payment' && (
          <PaymentStep 
            data={checkoutData} 
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        
        {currentStep === 'confirmation' && (
          <ConfirmationStep 
            data={checkoutData}
          />
        )}
      </div>
    </div>
  );
}

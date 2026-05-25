import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trendyolApi } from '../../../pages/TrendyolIntegration';
import { useMatchingCompletion } from './useMatchingCompletion';
import { StepProgress } from './StepProgress';
import { ConnectionStep } from './ConnectionStep';
import { MatchingStep } from './MatchingStep';
import { ProductSendStep } from './ProductSendStep';
import { PricingSyncStep } from './PricingSyncStep';
import { CompletedStep } from './CompletedStep';
import { GeneralSettingsPanel } from './GeneralSettingsPanel';
import { GeneralSettingsProvider } from './GeneralSettingsContext';
import type { FlowStep } from './types';
import { FLOW_STEPS } from './types';

const STORAGE_KEY = 'trendyol-flow-step';

function readStoredStep(): FlowStep | null {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    if (n >= 1 && n <= 5) return n as FlowStep;
  } catch {
    /* ignore */
  }
  return null;
}

export default function TrendyolIntegrationFlow() {
  const [currentStep, setCurrentStep] = useState<FlowStep>(() => readStoredStep() ?? 1);
  const [maxUnlocked, setMaxUnlocked] = useState<FlowStep>(() => readStoredStep() ?? 1);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['trendyol-stats'],
    queryFn: trendyolApi.getStats,
    staleTime: 30_000,
    retry: false,
  });

  const { matchingComplete } = useMatchingCompletion();

  useEffect(() => {
    if (stats?.connected && maxUnlocked < 2) {
      setMaxUnlocked(2);
    }
  }, [stats?.connected, maxUnlocked]);

  useEffect(() => {
    if (matchingComplete && maxUnlocked < 3) {
      setMaxUnlocked(3);
    }
  }, [matchingComplete, maxUnlocked]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(currentStep));
  }, [currentStep]);

  const goToStep = useCallback((step: FlowStep) => {
    if (step > maxUnlocked) return;
    setCurrentStep(step);
  }, [maxUnlocked]);

  const unlockAndGo = useCallback((next: FlowStep) => {
    setMaxUnlocked(prev => (next > prev ? next : prev));
    setCurrentStep(next);
    void refetchStats();
  }, [refetchStats]);

  const stepMeta = FLOW_STEPS.find(s => s.id === currentStep);

  return (
    <GeneralSettingsProvider>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Trendyol Entegrasyonu</h1>
              <p className="text-sm text-gray-500">Bağlan → Eşleştir → Gönder → Fiyat ayarla → Bitti</p>
            </div>
          </div>
          {stats?.connected && (
            <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Bağlı
            </span>
          )}
        </div>

        <StepProgress
          currentStep={currentStep}
          maxUnlocked={maxUnlocked}
          onStepClick={goToStep}
        />
      </div>

      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <GeneralSettingsPanel />
      </div>

      <div className="p-6 w-full">
        {stepMeta && currentStep !== 5 && (
          <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Adım {currentStep} — {stepMeta.label}
            </p>
            <p className="text-sm text-slate-700 mt-0.5">{stepMeta.description}</p>
          </div>
        )}

        {currentStep === 1 && (
          <ConnectionStep
            stats={stats}
            onContinue={() => {
              if (!stats?.connected) return;
              unlockAndGo(2);
            }}
          />
        )}

        {currentStep === 2 && (
          <MatchingStep
            onBack={() => goToStep(1)}
            onContinue={() => unlockAndGo(3)}
          />
        )}

        {currentStep === 3 && (
          <ProductSendStep
            isActive
            onBack={() => goToStep(2)}
            onContinue={() => unlockAndGo(4)}
          />
        )}

        {currentStep === 4 && (
          <PricingSyncStep
            onBack={() => goToStep(3)}
            onContinue={() => unlockAndGo(5)}
          />
        )}

        {currentStep === 5 && (
          <CompletedStep
            stats={stats}
            onRestart={() => {
              setCurrentStep(1);
              setMaxUnlocked(1);
              localStorage.removeItem(STORAGE_KEY);
            }}
          />
        )}
      </div>
    </div>
    </GeneralSettingsProvider>
  );
}

import React from 'react';
import { useFeature } from '../../hooks/useFeature';
import { useFeatureContext } from '../../context/FeatureContext';
import type { FeatureKey } from '../../context/FeatureContext';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /**
   * 'hide'    → renders nothing when disabled (default)
   * 'lock'    → renders a locked-state placeholder
   * 'disable' → renders children but visually disabled (pointer-events none)
   */
  fallback?: 'hide' | 'lock' | 'disable';
  /** Custom fallback element */
  fallbackElement?: React.ReactNode;
}

const LockedPlaceholder: React.FC<{ feature: FeatureKey }> = ({ feature }) => {
  const navigate = useNavigate();
  return (
    <div className="relative rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-8 text-center select-none">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Bu özellik planınızda aktif değil
        </p>
        <p className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {feature}
        </p>
        <button
          onClick={() => navigate('/plans')}
          className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Planı Yükselt
        </button>
      </div>
    </div>
  );
};

/**
 * Wraps a section of UI and conditionally renders based on feature flag.
 *
 * Usage:
 *   <FeatureGate feature="campaigns">
 *     <CampaignsPage />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="b2b" fallback="lock">
 *     <B2BSection />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = 'hide',
  fallbackElement,
}) => {
  const { loading } = useFeatureContext();
  const enabled = useFeature(feature);

  // While loading, render children (optimistic) to avoid flash
  if (loading) return <>{children}</>;

  if (enabled) return <>{children}</>;

  if (fallbackElement) return <>{fallbackElement}</>;

  if (fallback === 'lock')    return <LockedPlaceholder feature={feature} />;
  if (fallback === 'disable') {
    return (
      <div className="pointer-events-none opacity-40 select-none cursor-not-allowed">
        {children}
      </div>
    );
  }

  return null; // 'hide'
};

export default FeatureGate;

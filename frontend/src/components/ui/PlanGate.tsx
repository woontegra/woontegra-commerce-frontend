import React, { useState } from 'react';
import { useFeatureContext, getMinPlanForFeature, PLAN_META } from '../../context/FeatureContext';
import type { FeatureKey, PlanTier } from '../../context/FeatureContext';
import { useNavigate } from 'react-router-dom';

// ── Plan badge colors ─────────────────────────────────────────────────────────
const PLAN_COLORS: Record<PlanTier, string> = {
  STARTER:    'bg-gray-100   text-gray-700   border-gray-200',
  PRO:        'bg-indigo-50  text-indigo-700 border-indigo-200',
  ENTERPRISE: 'bg-amber-50   text-amber-700  border-amber-200',
};

// ── Lock icon ─────────────────────────────────────────────────────────────────
function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  );
}

// ── Tooltip wrapper ───────────────────────────────────────────────────────────
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-xs pointer-events-none">
          <span className="block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            {text}
          </span>
          <span className="block w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  );
}

// ── PlanBadge — inline plan pill ──────────────────────────────────────────────
export function PlanBadge({ plan, className = '' }: { plan: PlanTier; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan]} ${className}`}>
      <LockIcon className="w-3 h-3" />
      {PLAN_META[plan].label}
    </span>
  );
}

// ── FeatureLock — small inline lock shown next to disabled items ──────────────
export function FeatureLock({ featureKey }: { featureKey: FeatureKey }) {
  const requiredPlan = getMinPlanForFeature(featureKey);
  const label        = PLAN_META[requiredPlan].label;

  return (
    <Tooltip text={`Bu özellik ${label} planına dahildir`}>
      <span className="inline-flex items-center gap-1 ml-1.5">
        <PlanBadge plan={requiredPlan} />
      </span>
    </Tooltip>
  );
}

// ── PlanGate — wraps any UI section, shows upgrade wall if feature disabled ───
interface PlanGateProps {
  /** Feature key to check */
  featureKey: FeatureKey;
  /** Rendered normally when feature is enabled */
  children: React.ReactNode;
  /**
   * "overlay"  → shows children dimmed + lock overlay (default)
   * "hide"     → hides children entirely, shows upgrade card
   * "disabled" → shows children, adds disabled overlay without card
   */
  mode?: 'overlay' | 'hide' | 'disabled';
  /** Custom label for the upgrade button */
  ctaLabel?: string;
}

export function PlanGate({ featureKey, children, mode = 'overlay', ctaLabel }: PlanGateProps) {
  const { isEnabled } = useFeatureContext();
  const navigate            = useNavigate();
  const enabled             = isEnabled(featureKey);

  if (enabled) return <>{children}</>;

  const requiredPlan = getMinPlanForFeature(featureKey);
  const planLabel    = PLAN_META[requiredPlan].label;

  if (mode === 'hide') {
    return <UpgradeCard plan={requiredPlan} ctaLabel={ctaLabel} onUpgrade={() => navigate('/billing')} />;
  }

  return (
    <div className="relative">
      {/* Dimmed content */}
      <div className={`${mode === 'disabled' ? 'opacity-40' : 'opacity-30'} pointer-events-none select-none`}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl">
        {mode === 'overlay' ? (
          <UpgradeCard compact plan={requiredPlan} ctaLabel={ctaLabel} onUpgrade={() => navigate('/billing')} />
        ) : (
          <Tooltip text={`${planLabel} planına yükseltin`}>
            <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-md rounded-xl px-4 py-2">
              <LockIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{planLabel} planı gerekli</span>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ── UpgradeCard ───────────────────────────────────────────────────────────────
function UpgradeCard({
  plan,
  compact = false,
  ctaLabel,
  onUpgrade,
}: {
  plan:       PlanTier;
  compact?:   boolean;
  ctaLabel?:  string;
  onUpgrade:  () => void;
}) {
  const label = PLAN_META[plan].label;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 bg-white border border-gray-200 shadow-xl rounded-2xl px-6 py-5 max-w-xs text-center">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <LockIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{label} planı gerekli</p>
          <p className="text-xs text-gray-500 mt-0.5">Bu özelliğe erişmek için planınızı yükseltin</p>
        </div>
        <button
          onClick={onUpgrade}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {ctaLabel ?? `${label} Planına Yükselt`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 bg-white border border-gray-200 shadow-xl rounded-2xl px-8 py-8 max-w-sm text-center">
      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
        <LockIcon className="w-7 h-7 text-indigo-600" />
      </div>
      <div>
        <PlanBadge plan={plan} className="mb-2" />
        <p className="text-lg font-semibold text-gray-900 mt-2">{label} Planına Dahil</p>
        <p className="text-sm text-gray-500 mt-1">
          Bu özelliği kullanmak için {label} planına geçmeniz gerekiyor.
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-6 py-2.5 transition-colors shadow-sm"
      >
        {ctaLabel ?? `${label} Planına Yükselt →`}
      </button>
      <a href="/billing" className="text-xs text-gray-400 hover:text-gray-600 underline">
        Planları karşılaştır
      </a>
    </div>
  );
}

// ── PlanGateButton — disabled button with lock icon + tooltip ─────────────────
interface PlanGateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  featureKey: FeatureKey;
  children:   React.ReactNode;
}

export function PlanGateButton({ featureKey, children, className = '', onClick, ...rest }: PlanGateButtonProps) {
  const { isEnabled } = useFeatureContext();
  const enabled       = isEnabled(featureKey);
  const requiredPlan  = getMinPlanForFeature(featureKey);
  const navigate      = useNavigate();

  if (enabled) {
    return (
      <button className={className} onClick={onClick} {...rest}>
        {children}
      </button>
    );
  }

  return (
    <Tooltip text={`${PLAN_META[requiredPlan].label} planına yükseltin`}>
      <button
        className={`${className} opacity-50 cursor-not-allowed`}
        onClick={() => navigate('/billing')}
        {...rest}
        disabled={false}
      >
        <LockIcon className="w-4 h-4 inline mr-1.5" />
        {children}
      </button>
    </Tooltip>
  );
}

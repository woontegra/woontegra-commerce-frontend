import type { FlowStep } from './types';
import { FLOW_STEPS } from './types';

interface StepProgressProps {
  currentStep: FlowStep;
  maxUnlocked: FlowStep;
  onStepClick?: (step: FlowStep) => void;
}

export function StepProgress({ currentStep, maxUnlocked, onStepClick }: StepProgressProps) {
  return (
    <nav aria-label="Trendyol kurulum adımları" className="overflow-x-auto pb-1">
      <ol className="flex items-center min-w-max gap-1 sm:gap-0">
        {FLOW_STEPS.map((step, index) => {
          const done = step.id < currentStep || (step.id < maxUnlocked && step.id !== currentStep);
          const active = step.id === currentStep;
          const unlocked = step.id <= maxUnlocked;
          const locked = !unlocked;

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                disabled={locked || !onStepClick}
                onClick={() => unlocked && onStepClick?.(step.id)}
                className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                    : done
                      ? 'text-green-700 hover:bg-green-50'
                      : locked
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                    active
                      ? 'bg-orange-500 text-white border-orange-500'
                      : done
                        ? 'bg-green-500 text-white border-green-500'
                        : locked
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {done && !active ? '✔' : active ? '⏳' : step.id}
                </span>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{step.label}</span>
              </button>
              {index < FLOW_STEPS.length - 1 && (
                <span
                  className={`hidden sm:block w-6 lg:w-10 h-px mx-1 ${
                    step.id < maxUnlocked ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { useState, useEffect } from 'react';

interface CampaignCountdownProps {
  endDate: string;
  onExpire?: () => void;
}

export default function CampaignCountdown({ endDate, onExpire }: CampaignCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(endDate).getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  if (timeLeft.expired) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          Kampanya Sona Erdi
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Gün</div>
          </div>
        )}
        
        {(timeLeft.days > 0 || timeLeft.hours > 0) && (
          <>
            <span className="text-gray-400">:</span>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {String(timeLeft.hours).padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Saat</div>
            </div>
          </>
        )}
        
        <span className="text-gray-400">:</span>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Dk</div>
        </div>
        
        <span className="text-gray-400">:</span>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Sn</div>
        </div>
      </div>
    </div>
  );
}

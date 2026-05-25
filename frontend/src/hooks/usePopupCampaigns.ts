import { useState, useEffect } from 'react';
import type { PopupCampaign } from '../types/marketing';

export function usePopupCampaigns(campaigns: PopupCampaign[]) {
  const [activePopup, setActivePopup] = useState<PopupCampaign | null>(null);
  const [displayedPopups, setDisplayedPopups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkTriggers = () => {
      for (const campaign of campaigns) {
        if (!campaign.isActive) continue;
        if (displayedPopups.has(campaign.id)) continue;

        // Check max display per user
        const viewCount = getPopupViewCount(campaign.id);
        if (campaign.maxDisplayPerUser && viewCount >= campaign.maxDisplayPerUser) {
          continue;
        }

        // Check trigger
        if (shouldShowPopup(campaign)) {
          setActivePopup(campaign);
          incrementPopupViewCount(campaign.id);
          setDisplayedPopups(prev => new Set([...prev, campaign.id]));
          break;
        }
      }
    };

    // Page Load Trigger
    const pageLoadCampaigns = campaigns.filter(c => c.trigger === 'page_load' && c.isActive);
    if (pageLoadCampaigns.length > 0) {
      setTimeout(() => checkTriggers(), 1000);
    }

    // Time Delay Trigger
    campaigns.forEach(campaign => {
      if (campaign.trigger === 'time_delay' && campaign.triggerValue) {
        setTimeout(() => {
          if (!displayedPopups.has(campaign.id)) {
            setActivePopup(campaign);
            incrementPopupViewCount(campaign.id);
            setDisplayedPopups(prev => new Set([...prev, campaign.id]));
          }
        }, campaign.triggerValue * 1000);
      }
    });

    // Scroll Trigger
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      campaigns.forEach(campaign => {
        if (
          campaign.trigger === 'scroll' &&
          campaign.triggerValue &&
          scrollPercent >= campaign.triggerValue &&
          !displayedPopups.has(campaign.id)
        ) {
          setActivePopup(campaign);
          incrementPopupViewCount(campaign.id);
          setDisplayedPopups(prev => new Set([...prev, campaign.id]));
        }
      });
    };

    // Exit Intent Trigger
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        const exitCampaign = campaigns.find(
          c => c.trigger === 'exit_intent' && c.isActive && !displayedPopups.has(c.id)
        );
        
        if (exitCampaign) {
          setActivePopup(exitCampaign);
          incrementPopupViewCount(exitCampaign.id);
          setDisplayedPopups(prev => new Set([...prev, exitCampaign.id]));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [campaigns, displayedPopups]);

  const closePopup = () => {
    setActivePopup(null);
  };

  return {
    activePopup,
    closePopup,
  };
}

function shouldShowPopup(campaign: PopupCampaign): boolean {
  // Check date range
  if (campaign.startDate && new Date(campaign.startDate) > new Date()) {
    return false;
  }
  if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
    return false;
  }

  // Check page targeting
  if (campaign.showOnPages && campaign.showOnPages.length > 0) {
    const currentPath = window.location.pathname;
    const matches = campaign.showOnPages.some(pattern => 
      new RegExp(pattern).test(currentPath)
    );
    if (!matches) return false;
  }

  return true;
}

function getPopupViewCount(popupId: string): number {
  const counts = JSON.parse(localStorage.getItem('popup_views') || '{}');
  return counts[popupId] || 0;
}

function incrementPopupViewCount(popupId: string) {
  const counts = JSON.parse(localStorage.getItem('popup_views') || '{}');
  counts[popupId] = (counts[popupId] || 0) + 1;
  localStorage.setItem('popup_views', JSON.stringify(counts));
}

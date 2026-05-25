import { useState, useEffect } from 'react';
import { popupService } from '../services/popup.service';
import type { Popup } from '../types/popup';

export const usePopup = () => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [isShown, setIsShown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivePopup();
  }, []);

  const loadActivePopup = async () => {
    try {
      setLoading(true);
      
      // Check if popup was already shown in this session
      const shownPopupId = sessionStorage.getItem('popup_shown');
      
      const activePopup = await popupService.getActive();
      
      if (activePopup && shownPopupId !== activePopup.id) {
        setPopup(activePopup);
      }
    } catch (error) {
      console.error('Error loading popup:', error);
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => {
    if (popup) {
      // Mark as shown in this session
      sessionStorage.setItem('popup_shown', popup.id);
    }
    setPopup(null);
    setIsShown(true);
  };

  return {
    popup,
    loading,
    closePopup,
    isShown,
  };
};

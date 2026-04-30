import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const GUEST_START_KEY = 'zetryl_guest_first_visit';
const GUEST_DISMISSED_BANNER_KEY = 'zetryl_guest_banner_dismissed_day';

export function useGuestMode() {
  const [isGuest, setIsGuest] = useState(false);
  const [daysElapsed, setDaysElapsed] = useState(0);
  const [firstVisit, setFirstVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        setIsGuest(false);
        setLoading(false);
        return;
      }

      // Guest: init or read first visit timestamp
      let storedDate = localStorage.getItem(GUEST_START_KEY);
      if (!storedDate) {
        storedDate = new Date().toISOString();
        localStorage.setItem(GUEST_START_KEY, storedDate);
      }

      const start = new Date(storedDate);
      const now = new Date();
      const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));

      setIsGuest(true);
      setFirstVisit(start);
      setDaysElapsed(elapsed);
      setLoading(false);
    };

    init();
  }, []);

  const daysRemaining = Math.max(0, 14 - daysElapsed);
  const isExpired = daysElapsed >= 14;
  const showBanner = isGuest && daysElapsed >= 12 && !isExpired;

  const dismissedDay = localStorage.getItem(GUEST_DISMISSED_BANNER_KEY);
  const isBannerDismissed = dismissedDay === String(daysElapsed);

  const dismissBanner = () => {
    localStorage.setItem(GUEST_DISMISSED_BANNER_KEY, String(daysElapsed));
  };

  return { isGuest, daysElapsed, daysRemaining, firstVisit, isExpired, showBanner: showBanner && !isBannerDismissed, dismissBanner, loading };
}
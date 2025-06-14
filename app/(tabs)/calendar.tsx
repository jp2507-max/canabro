import { useState, useCallback } from 'react';

import { useAuth } from '../../lib/contexts/AuthProvider';
import CalendarScreenContainer from '../../screens/calendar/CalendarScreenContainer';

export default function CalendarTabEntry() {
  // This file is now only the navigation entry point for Expo Router
  // All logic is handled in the container
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { session } = useAuth();

  const handleDateSelect = useCallback((date: Date) => {
    // Validate the incoming date before setting it
    if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) {
      console.warn('[CalendarTabEntry] Invalid date received, ignoring:', date);
      return;
    }
    
    console.log('[CalendarTabEntry] Setting selected date:', date);
    setSelectedDate(date);
  }, []);

  return (
    <CalendarScreenContainer
      selectedDate={selectedDate}
      userId={session?.user?.id}
      setIsTaskActionsVisible={(setIsTaskActionsVisible) => {}}
      onDateSelect={handleDateSelect}
    />
  );
}

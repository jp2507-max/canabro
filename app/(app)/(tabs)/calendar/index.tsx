import { useState, useCallback } from 'react';

import { useAuth } from '../../../../lib/contexts/AuthProvider';
import CalendarScreenContainer from '../../../../screens/calendar/CalendarScreenContainer';

export default function CalendarIndex() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isTaskActionsVisible, setIsTaskActionsVisible] = useState(false);
  const { session } = useAuth();

  const handleDateSelect = useCallback((date: Date) => {
    if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) {
      console.warn('[CalendarIndex] Invalid date received, ignoring:', date);
      return;
    }

    console.log('[CalendarIndex] Setting selected date:', date);
    setSelectedDate(date);
  }, []);

  return (
    <CalendarScreenContainer
      selectedDate={selectedDate}
      userId={session?.user?.id}
      setIsTaskActionsVisible={setIsTaskActionsVisible}
      onDateSelect={handleDateSelect}
    />
  );
}

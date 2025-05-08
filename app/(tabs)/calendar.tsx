import { useState } from 'react';

import { useAuth } from '../../lib/contexts/AuthProvider';
import CalendarScreenContainer from '../../screens/calendar/CalendarScreenContainer';

export default function CalendarTabEntry() {
  // This file is now only the navigation entry point for Expo Router
  // All logic is handled in the container
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { session } = useAuth();

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
  }

  return (
    <CalendarScreenContainer
      selectedDate={selectedDate}
      userId={session?.user?.id}
      setIsTaskActionsVisible={(setIsTaskActionsVisible) => {}}
      onDateSelect={handleDateSelect}
    />
  );
}

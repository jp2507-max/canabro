import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { PlantTask } from '@/lib/models/PlantTask';
import { isWithinInterval, parseISO } from '@/lib/utils/date';

interface StrainMilestoneBannerProps {
  date: Date;
  tasks: PlantTask[];
}

/**
 * Compact banner that summarizes strain-related milestone windows (e.g., harvest window)
 * for the currently selected date, using per-task strainMetadata where available.
 */
export const StrainMilestoneBanner: React.FC<StrainMilestoneBannerProps> = ({ date, tasks }) => {
  const { t } = useTranslation();

  const summary = useMemo(() => {
    const strainIdsInWindow = new Set<string>();
    let totalTasksInWindow = 0;

    for (const task of tasks) {
      const win = task.strainMetadata?.harvestWindow;
      const strainId = task.strainMetadata?.strainId;
      if (!win || !win.start || !win.end || !strainId) continue;

      const start = parseISO(win.start);
      const end = parseISO(win.end);
      if (!start || !end) continue;

      if (isWithinInterval(date, start, end)) {
        strainIdsInWindow.add(strainId);
        totalTasksInWindow += 1;
      }
    }

    return {
      strains: strainIdsInWindow.size,
      tasks: totalTasksInWindow,
      show: strainIdsInWindow.size > 0,
    };
  }, [date, tasks]);

  if (!summary.show) return null;

  return (
    <ThemedView className="mx-4 mt-3 mb-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
      <ThemedText className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
        {t('calendar.strain_banner.title', 'Strain milestones today')}
      </ThemedText>
      <View className="flex-row items-center justify-between">
        <ThemedText className="text-xs text-neutral-700 dark:text-neutral-300">
          {t('calendar.strain_banner.within_window', {
            countStrains: summary.strains,
            countTasks: summary.tasks,
            defaultValue: '{{countStrains}} strain(s) within window • {{countTasks}} related task(s)'
          })}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

export default StrainMilestoneBanner;



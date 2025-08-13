import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { PlantTask } from '@/lib/models/PlantTask';
import { isWithinInterval, parseISO, isValid } from '@/lib/utils/date';

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
      if (!isValid(start) || !isValid(end)) continue;

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
    <ThemedView
      accessible
      accessibilityLabel={`${t('calendar.strain_banner.title')} — ${t('calendar.strain_banner.within_window', {
        countStrains: summary.strains,
        countTasks: summary.tasks,
      })}`}
      className="mx-4 mt-3 mb-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3 transition-colors animate-fade-in">
      <ThemedText
        accessibilityRole="header"
        className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 transition-colors">
        {t('calendar.strain_banner.title')}
      </ThemedText>
      <ThemedView accessibilityRole="text" className="flex-row items-center justify-between">
        <ThemedText className="text-xs text-neutral-700 dark:text-neutral-300 transition-colors">
          {t('calendar.strain_banner.within_window', {
            countStrains: summary.strains,
            countTasks: summary.tasks,
          })}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

export default StrainMilestoneBanner;



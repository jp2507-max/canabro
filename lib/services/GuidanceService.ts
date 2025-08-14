import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import i18n from '../config/i18n';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'unknown';
export type StrainType = 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';

export function normalizeDifficultyString(value?: string | null): DifficultyLevel {
  if (!value) return 'unknown';
  const v = String(value).toLowerCase();
  if (v.includes('easy') || v.includes('beginner')) return 'easy';
  if (v.includes('moderate') || v.includes('intermediate') || v === 'medium') return 'medium';
  if (v.includes('hard') || v.includes('advanced') || v.includes('expert')) return 'hard';
  return 'unknown';
}

export function getGeneticsTip(strainType: StrainType, growthStage: GrowthStage): string | null {
  switch (strainType) {
    case 'indica':
      if (growthStage === 'pre_flower' || growthStage === 'flowering') {
        return i18n.t('guidance.genetics.indica.flowering');
      }
      return i18n.t('guidance.genetics.indica.default');
    case 'sativa':
      if (growthStage === 'pre_flower') {
        return i18n.t('guidance.genetics.sativa.pre_flower');
      }
      return i18n.t('guidance.genetics.sativa.default');
    case 'hybrid':
      return i18n.t('guidance.genetics.hybrid.default');
    case 'cbd':
      return i18n.t('guidance.genetics.cbd.default');
    default:
      return null;
  }
}

export function getDifficultyTip(
  difficulty: DifficultyLevel,
  taskType: TaskType,
  growthStage: GrowthStage
): string | null {
  if (difficulty === 'easy') {
    switch (taskType) {
      case 'watering':
        return i18n.t('guidance.difficulty.easy.watering');
      case 'feeding':
        return i18n.t('guidance.difficulty.easy.feeding');
      case 'inspection':
        return i18n.t('guidance.difficulty.easy.inspection');
      default:
        return i18n.t('guidance.difficulty.easy.default');
    }
  }
  if (difficulty === 'hard') {
    switch (taskType) {
      case 'feeding':
        return i18n.t('guidance.difficulty.hard.feeding');
      case 'inspection':
        return i18n.t('guidance.difficulty.hard.inspection');
      case 'defoliation':
        return i18n.t('guidance.difficulty.hard.defoliation');
      default:
        return i18n.t('guidance.difficulty.hard.default');
    }
  }
  if (difficulty === 'medium') {
    if (taskType === 'training' && (growthStage === 'vegetative' || growthStage === 'pre_flower')) {
      return i18n.t('guidance.difficulty.medium.training');
    }
    return i18n.t('guidance.difficulty.medium.default');
  }
  return null;
}

export function buildTaskGuidanceSnippet(
  params: {
    taskType: TaskType;
    growthStage: GrowthStage;
    strainType: StrainType;
    difficulty: DifficultyLevel;
  }
): string | null {
  const difficultyTip = getDifficultyTip(params.difficulty, params.taskType, params.growthStage);
  const geneticsTip = getGeneticsTip(params.strainType, params.growthStage);

  const parts: string[] = [];
  if (difficultyTip) parts.push(difficultyTip);
  if (geneticsTip) parts.push(geneticsTip);

  if (parts.length === 0) return null;
  // Keep snippet concise; join with separator
  return parts.join(' ');
}



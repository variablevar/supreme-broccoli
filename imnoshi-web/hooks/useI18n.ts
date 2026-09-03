'use client';

import { translate } from '@/lib/i18n';
import { useDashboardStore } from '@/stores/useDashboardStore';

export function useI18n() {
  const language = useDashboardStore((state) => state.language);
  return {
    language,
    t: (key: Parameters<typeof translate>[1]) => translate(language, key),
  };
}

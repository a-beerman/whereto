/**
 * Copy templates for bot messages
 * Principle: neutral-first for fairness in group voting
 */

export const COPY_TEMPLATES = {
  hero: {
    // Neutral templates (no venue bias) - default for groups
    neutral: [
      {
        title: '🎉 Время собраться вместе!',
        subtitle: 'Выбираем место встречи голосованием',
      },
      {
        title: '✨ Создан новый план встречи',
        subtitle: 'Голосуйте за понравившиеся варианты',
      },
      {
        title: '🗓️ Планируем встречу',
        subtitle: 'Быстрое голосование — честный выбор',
      },
    ],
    // Category-specific (when single category dominates)
    dinner: {
      title: '🍽️ Куда пойдём поужинать?',
      subtitle: 'Выбираем ресторан вместе',
    },
    cafe: {
      title: '☕ Встречаемся за кофе',
      subtitle: 'Выбираем уютное место',
    },
    bar: {
      title: '🍺 Пора в бар!',
      subtitle: 'Голосуем за лучший вариант',
    },
    // Seasonal (optional, can be time-based)
    seasonal: {
      winter: {
        title: '❄️ Зимняя встреча',
        subtitle: 'Выбираем тёплое место',
      },
      spring: {
        title: '🌸 Весенняя встреча',
        subtitle: 'Голосуем за место встречи',
      },
      summer: {
        title: '☀️ Летняя встреча',
        subtitle: 'Выбираем место на свежем воздухе',
      },
      fall: {
        title: '🍂 Осенняя встреча',
        subtitle: 'Выбираем уютное место',
      },
    },
  },
  poll: {
    question: '🗳️ Куда идём?',
    instructions: 'Голосуйте за понравившиеся варианты 👆',
  },
  results: {
    winner: (venueName: string) => `🏆 Победитель: ${venueName}`,
    tie: '🤝 Ничья! Выбираем первый вариант из лидеров',
    noVotes: '😔 Никто не проголосовал',
  },
  cta: {
    vote: '📱 Голосовать в приложении',
    viewCard: '📋 Посмотреть карточку',
    showMore: '🔄 Показать ещё варианты',
    closeVoting: '🏁 Закрыть голосование',
  },
};

/**
 * Select hero copy based on context
 * @param format Plan format (dinner, cafe, bar, etc.)
 * @param fairnessMode Force neutral (default true for groups)
 */
export function selectHeroCopy(
  format?: string,
  fairnessMode = true,
): {
  title: string;
  subtitle: string;
} {
  // Always neutral in fairness mode
  if (fairnessMode || !format || format === 'any') {
    const neutralTemplates = COPY_TEMPLATES.hero.neutral;
    return neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
  }

  // Category-specific if available
  const categoryKey = format as keyof typeof COPY_TEMPLATES.hero;
  if (
    categoryKey in COPY_TEMPLATES.hero &&
    categoryKey !== 'neutral' &&
    categoryKey !== 'seasonal'
  ) {
    const categoryTemplate = COPY_TEMPLATES.hero[categoryKey];
    if (typeof categoryTemplate === 'object' && 'title' in categoryTemplate) {
      return categoryTemplate as { title: string; subtitle: string };
    }
  }

  // Fallback to neutral
  const neutralTemplates = COPY_TEMPLATES.hero.neutral;
  return neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
}

/**
 * Get seasonal copy (optional, can be time-based)
 */
export function getSeasonalCopy(): { title: string; subtitle: string } {
  const month = new Date().getMonth();
  let season: keyof typeof COPY_TEMPLATES.hero.seasonal;

  if (month >= 11 || month <= 1) season = 'winter';
  else if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else season = 'fall';

  return COPY_TEMPLATES.hero.seasonal[season];
}

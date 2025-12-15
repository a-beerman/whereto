import { InlineKeyboardMarkup } from 'telegraf/types';

/**
 * City selection keyboard
 */
export function getCityKeyboard(cities: Array<{ id: string; name: string }>): InlineKeyboardMarkup {
  const buttons = cities.map((city) => [
    {
      text: city.name,
      callback_data: `city:${city.id}`,
    },
  ]);

  return {
    inline_keyboard: buttons,
  };
}

/**
 * Category selection keyboard
 */
export function getCategoryKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '🍽️ Еда', callback_data: 'category:restaurant' }],
      [{ text: '☕ Кофе', callback_data: 'category:cafe' }],
      [{ text: '🍺 Бар', callback_data: 'category:bar' }],
      [{ text: '🔍 Поиск', callback_data: 'search' }],
    ],
  };
}

/**
 * Venue list navigation keyboard
 */
export function getVenueListKeyboard(
  hasNext: boolean,
  hasPrev: boolean,
  currentPage: number,
): InlineKeyboardMarkup {
  const buttons: any[] = [];

  if (hasPrev || hasNext) {
    const navButtons: any[] = [];
    if (hasPrev) {
      navButtons.push({ text: '⬅️ Назад', callback_data: `page:${currentPage - 1}` });
    }
    if (hasNext) {
      navButtons.push({ text: 'Вперёд ➡️', callback_data: `page:${currentPage + 1}` });
    }
    buttons.push(navButtons);
  }

  buttons.push([{ text: '⬅️ Назад к категориям', callback_data: 'back:categories' }]);

  return {
    inline_keyboard: buttons,
  };
}

/**
 * Venue card keyboard (mass venue)
 */
export function getVenueCardKeyboard(
  venueId: string,
  isSaved: boolean,
  hasPhone: boolean,
  hasWebsite: boolean,
  isPartner: boolean = false,
): InlineKeyboardMarkup {
  const buttons: any[] = [];

  // Save button
  buttons.push([
    {
      text: isSaved ? '✅ Сохранено' : '❤️ Сохранить',
      callback_data: `save:${venueId}`,
    },
  ]);

  // Action buttons row
  const actionButtons: any[] = [{ text: '📍 Маршрут', callback_data: `route:${venueId}` }];

  if (isPartner) {
    actionButtons.push({ text: '📋 Запросить бронь', callback_data: `book:${venueId}` });
  } else if (hasPhone) {
    actionButtons.push({ text: '📞 Позвонить', callback_data: `call:${venueId}` });
  }

  if (hasWebsite) {
    actionButtons.push({ text: '🌐 Сайт', callback_data: `site:${venueId}` });
  }

  buttons.push(actionButtons);

  // Share and back
  buttons.push([
    { text: '🔗 Поделиться', callback_data: `share:${venueId}` },
    { text: '⬅️ Назад', callback_data: 'back:list' },
  ]);

  return {
    inline_keyboard: buttons,
  };
}

/**
 * Back to categories keyboard
 */
export function getBackKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: '⬅️ Назад к категориям', callback_data: 'back:categories' }]],
  };
}

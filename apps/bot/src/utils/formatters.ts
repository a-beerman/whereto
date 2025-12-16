/**
 * Format venue for display in list (text only)
 */
export function formatVenueList(venue: any, index: number): string {
  const rating = venue.rating ? `⭐ ${venue.rating}` : '';
  const ratingCount = venue.ratingCount ? ` (${venue.ratingCount})` : '';
  const distance = venue.distance ? ` · ${Math.round(venue.distance)}м` : '';

  return `${index + 1}. **${venue.name}**\n${rating}${ratingCount}${distance}\n${venue.address}`;
}

/**
 * Format venue for photo card in list (caption for photo)
 */
export function formatVenueListItem(venue: any): string {
  let text = `*${venue.name}*\n`;

  // Rating line
  if (venue.rating) {
    text += `⭐ ${venue.rating}`;
    if (venue.ratingCount) {
      text += ` (${venue.ratingCount})`;
    }
    text += '\n';
  }

  // Address
  text += `📍 ${venue.address}`;

  return text;
}

/**
 * Format venue card (text-only, no photo)
 */
export function formatVenueCard(venue: any): string {
  let text = `**${venue.name}**\n\n`;

  // Categories
  if (venue.categories && venue.categories.length > 0) {
    text += `${getCategoryEmojis(venue.categories)} ${venue.categories.join(' · ')}\n`;
  }

  // Rating
  if (venue.rating) {
    text += `⭐ ${venue.rating}`;
    if (venue.ratingCount) {
      text += ` (${venue.ratingCount} отзывов)`;
    }
    text += '\n\n';
  }

  // Address
  text += `📍 ${venue.address}\n`;

  // Distance
  if (venue.distance) {
    text += `📏 ${Math.round(venue.distance)}м от вас\n`;
  }

  // Hours
  const hoursText = formatHoursToday(venue.hours);
  if (hoursText) {
    text += `\n🕐 ${hoursText}`;
  }

  return text;
}

/**
 * Format venue caption for photo (shorter, optimized for photo cards)
 */
export function formatVenueCaption(venue: any): string {
  let text = `*${venue.name}*\n`;

  // Categories with emoji
  if (venue.categories && venue.categories.length > 0) {
    text += `${getCategoryEmojis(venue.categories)} ${venue.categories.join(' · ')}\n`;
  }

  // Rating
  if (venue.rating) {
    text += `⭐ ${venue.rating}`;
    if (venue.ratingCount) {
      text += ` (${venue.ratingCount})`;
    }
    text += '\n';
  }

  // Address
  text += `📍 ${venue.address}`;

  // Hours (compact)
  const hoursText = formatHoursToday(venue.hours);
  if (hoursText) {
    text += `\n🕐 ${hoursText}`;
  }

  return text;
}

/**
 * Get emoji for categories
 */
function getCategoryEmojis(categories: string[]): string {
  const emojiMap: Record<string, string> = {
    restaurant: '🍽️',
    cafe: '☕',
    bar: '🍺',
    food: '🍴',
  };

  const emojis = categories.map((cat) => emojiMap[cat.toLowerCase()]).filter(Boolean);

  return emojis.length > 0 ? emojis[0] : '📍';
}

/**
 * Format hours for today
 */
function formatHoursToday(hours: any): string | null {
  if (!hours) return null;

  // Handle array of strings format
  if (Array.isArray(hours) && hours.length > 0) {
    const today = new Date();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      today.getDay()
    ];
    const todayHours = hours.find((h: string) => h.startsWith(dayName));
    if (todayHours) {
      // Extract just the time part
      return todayHours.replace(`${dayName}: `, '').replace(dayName, 'Сегодня');
    }
  }

  return null;
}

/**
 * Format distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}м`;
  }
  return `${(meters / 1000).toFixed(1)}км`;
}

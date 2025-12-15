/**
 * Format venue for display in list
 */
export function formatVenueList(venue: any, index: number): string {
  const rating = venue.rating ? `⭐ ${venue.rating}` : '';
  const ratingCount = venue.ratingCount ? ` (${venue.ratingCount})` : '';
  const distance = venue.distance ? ` · ${Math.round(venue.distance)}м` : '';

  return `${index + 1}. **${venue.name}**\n${rating}${ratingCount}${distance}\n${venue.address}`;
}

/**
 * Format venue card
 */
export function formatVenueCard(venue: any): string {
  let text = `**${venue.name}**\n\n`;

  // Categories
  if (venue.categories && venue.categories.length > 0) {
    text += `${venue.categories.join(' · ')}\n`;
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
  if (venue.hours && Array.isArray(venue.hours) && venue.hours.length > 0) {
    const today = new Date();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      today.getDay()
    ];
    const todayHours = venue.hours.find((h: string) => h.startsWith(dayName));
    if (todayHours) {
      text += `\n🕐 ${todayHours}`;
    }
  }

  return text;
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

import { Injectable } from '@nestjs/common';
import { OpeningHours, OpeningHoursPeriod } from '../dto/venue-response';

@Injectable()
export class HoursService {
  /**
   * Check if venue is open at a specific date/time
   */
  isOpenAt(hours: OpeningHours | null | undefined, date: Date, time?: string): boolean {
    if (!hours) {
      return false; // Unknown hours = not open
    }

    // If we have periods (structured format from Google)
    if (hours.periods && Array.isArray(hours.periods)) {
      return this.isOpenFromPeriods(hours.periods, date, time);
    }

    // If we have weekday_text (human-readable format)
    if (hours.weekday_text && Array.isArray(hours.weekday_text)) {
      return this.isOpenFromWeekdayText(hours.weekday_text, date);
    }

    return false;
  }

  /**
   * Check if open using Google Places periods format
   */
  private isOpenFromPeriods(periods: OpeningHoursPeriod[], date: Date, time?: string): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const checkTime = time
      ? this.parseTime(time)
      : { hours: date.getHours(), minutes: date.getMinutes() };

    // Google uses 0 = Sunday, 1 = Monday, etc.
    // Filter periods that match the day - open is required in OpeningHoursPeriod
    // Use type guard to ensure open exists
    const dayPeriods = periods.filter(
      (p): p is OpeningHoursPeriod & { open: NonNullable<OpeningHoursPeriod['open']> } =>
        p.open !== null && p.open !== undefined && p.open.day === dayOfWeek,
    );

    if (dayPeriods.length === 0) {
      return false; // Closed on this day
    }

    // Check if current time is within any open period
    for (const period of dayPeriods) {
      const openTime = this.parseGoogleTime(period.open.time);
      const closeTime = period.close ? this.parseGoogleTime(period.close.time) : null;

      if (closeTime) {
        if (this.isTimeBetween(checkTime, openTime, closeTime)) {
          return true;
        }
      } else {
        // Open 24 hours
        return true;
      }
    }

    return false;
  }

  /**
   * Check if open using weekday_text format (fallback)
   */
  private isOpenFromWeekdayText(weekdayText: string[], date: Date): boolean {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];

    const dayLine = weekdayText.find((line) => line.startsWith(dayName));
    if (!dayLine) {
      return false;
    }

    // Parse "Monday: 9:00 AM – 5:00 PM" or "Monday: Closed"
    if (dayLine.includes('Closed')) {
      return false;
    }

    // For MVP, if we have hours text and it's not "Closed", assume open
    // More sophisticated parsing can be added later
    return true;
  }

  /**
   * Parse time string (HH:mm) to hours and minutes
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Parse Google Places time format (HHMM as string, e.g., "0900")
   */
  private parseGoogleTime(timeStr: string): { hours: number; minutes: number } {
    const hours = parseInt(timeStr.substring(0, 2), 10);
    const minutes = parseInt(timeStr.substring(2, 4), 10);
    return { hours, minutes };
  }

  /**
   * Check if time is between two times
   */
  private isTimeBetween(
    check: { hours: number; minutes: number },
    start: { hours: number; minutes: number },
    end: { hours: number; minutes: number },
  ): boolean {
    const checkMinutes = check.hours * 60 + check.minutes;
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    // Handle overnight hours (e.g., 22:00 - 02:00)
    if (endMinutes < startMinutes) {
      return checkMinutes >= startMinutes || checkMinutes <= endMinutes;
    }

    return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
  }

  /**
   * Format hours for display
   */
  formatHours(hours: OpeningHours | null | undefined): string[] {
    if (!hours) {
      return [];
    }

    if (hours.weekday_text && Array.isArray(hours.weekday_text)) {
      return hours.weekday_text;
    }

    // Convert periods to weekday_text format if needed
    if (hours.periods && Array.isArray(hours.periods)) {
      return this.formatPeriodsToWeekdayText(hours.periods);
    }

    return [];
  }

  /**
   * Convert periods to weekday_text format
   */
  private formatPeriodsToWeekdayText(periods: OpeningHoursPeriod[]): string[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const result: string[] = [];

    for (let day = 0; day < 7; day++) {
      // Filter periods that match the day - use type guard to ensure open exists
      const dayPeriods = periods.filter(
        (p): p is OpeningHoursPeriod & { open: NonNullable<OpeningHoursPeriod['open']> } =>
          p.open !== null && p.open !== undefined && p.open.day === day,
      );
      const dayName = dayNames[day];

      if (dayPeriods.length === 0) {
        result.push(`${dayName}: Closed`);
      } else {
        const timeRanges = dayPeriods.map((p) => {
          const openTime = this.formatGoogleTime(p.open.time);
          const closeTime = p.close ? this.formatGoogleTime(p.close.time) : '24:00';
          return `${openTime} – ${closeTime}`;
        });
        result.push(`${dayName}: ${timeRanges.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Format Google time (HHMM) to HH:mm
   */
  private formatGoogleTime(timeStr: string): string {
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    return `${hours}:${minutes}`;
  }
}

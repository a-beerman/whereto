import { selectHeroCopy, COPY_TEMPLATES } from '@whereto/shared/constants/copy';

/**
 * Hero image selection service
 * Principle: neutral-first for fairness in group voting
 */
export class HeroService {
  private readonly heroImages = {
    neutral: ['hero-neutral-1.svg', 'hero-neutral-2.svg', 'hero-neutral-3.svg'],
    dinner: ['hero-dinner-1.svg', 'hero-dinner-2.svg'],
    cafe: ['hero-cafe-1.svg'],
    bar: ['hero-bar-1.svg'],
    seasonal: {
      winter: ['hero-neutral-1.svg'], // Reuse neutral for now
      spring: ['hero-neutral-2.svg'],
      summer: ['hero-neutral-3.svg'],
      fall: ['hero-neutral-1.svg'],
    },
  };

  /**
   * Select hero image URL based on context
   * @param format Plan format (dinner, cafe, bar, etc.)
   * @param fairnessMode Force neutral (default true for groups)
   * @param baseUrl Base URL for assets (e.g., miniapp public URL)
   */
  selectHeroImage(
    format?: string,
    fairnessMode = true,
    baseUrl = process.env.MINIAPP_URL || 'https://whereto.app',
  ): string {
    // Always neutral in fairness mode
    if (fairnessMode || !format || format === 'any') {
      return this.randomImage(this.heroImages.neutral, baseUrl);
    }

    // Category-specific if available
    const categoryKey = format as keyof typeof this.heroImages;
    if (categoryKey in this.heroImages && categoryKey !== 'neutral' && categoryKey !== 'seasonal') {
      const categoryImages = this.heroImages[categoryKey];
      if (Array.isArray(categoryImages) && categoryImages.length > 0) {
        return this.randomImage(categoryImages, baseUrl);
      }
    }

    // Fallback to neutral
    return this.randomImage(this.heroImages.neutral, baseUrl);
  }

  /**
   * Get random image from array
   */
  private randomImage(images: string[], baseUrl: string): string {
    const filename = images[Math.floor(Math.random() * images.length)];
    return `${baseUrl}/assets/hero/${filename}`;
  }

  /**
   * Build hero message with image, copy, and CTA
   */
  buildHeroMessage(
    planId: string,
    format?: string,
    fairnessMode = true,
    miniappUrl = process.env.MINIAPP_URL || 'https://whereto.app',
  ): {
    photo: string;
    caption: string;
    replyMarkup: {
      inline_keyboard: Array<Array<{ text: string; web_app: { url: string } }>>;
    };
  } {
    const heroImage = this.selectHeroImage(format, fairnessMode, miniappUrl);
    const copy = selectHeroCopy(format, fairnessMode);

    const caption = `${copy.title}\n${copy.subtitle}`;

    return {
      photo: heroImage,
      caption,
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: COPY_TEMPLATES.cta.vote,
              web_app: { url: `${miniappUrl}?startapp=plan_${planId}` },
            },
          ],
        ],
      },
    };
  }
}

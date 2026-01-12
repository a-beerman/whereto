import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';

/**
 * Inline query handler for plan sharing
 * Allows sharing plans without adding bot to group
 */
export class InlineHandler {
  constructor(private readonly apiClient: ApiClientService) {}

  /**
   * Handle inline query
   * @example @WhereTo_City_Bot создать план
   */
  async handleInlineQuery(ctx: Context): Promise<void> {
    try {
      const inlineQuery = (ctx as { inlineQuery?: { query?: string } }).inlineQuery;
      const query = inlineQuery?.query || '';
      const userId = ctx.from?.id.toString();

      if (!userId) {
        return;
      }

      // For MVP: return generic "create plan" card
      // Future: could search user's recent plans
      const miniappUrl = process.env.MINIAPP_URL || 'https://whereto.app';
      const botUsername = ctx.botInfo?.username || 'WhereTo_City_Bot';

      const results = [
        {
          type: 'article' as const,
          id: 'create-plan',
          title: '📅 Создать план встречи',
          description: 'Создать новый план и начать голосование',
          thumb_url: `${miniappUrl}/assets/hero/hero-neutral-1.jpg`,
          input_message_content: {
            message_text: `🎉 Создаём план встречи!\n\nНачнём голосование — нажмите кнопку ниже 👇`,
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Создать план',
                  url: `https://t.me/${botUsername}?start=create_plan`,
                },
              ],
            ],
          },
        },
      ];

      // If query matches a plan format, add specific options
      if (typeof query === 'string' && query.match(/ужин|dinner/i)) {
        results.unshift({
          type: 'article' as const,
          id: 'dinner-plan',
          title: '🍽️ План: Ужин',
          description: 'Создать план для ужина в ресторане',
          thumb_url: `${miniappUrl}/assets/hero/hero-dinner-1.jpg`,
          input_message_content: {
            message_text: `🍽️ Планируем ужин!\n\nВыбираем ресторан — нажмите кнопку ниже 👇`,
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Создать план',
                  url: `https://t.me/${botUsername}?start=dinner_plan`,
                },
              ],
            ],
          },
        });
      }

      if (typeof query === 'string' && query.match(/кофе|cafe|coffee/i)) {
        results.unshift({
          type: 'article' as const,
          id: 'cafe-plan',
          title: '☕ План: Кофе',
          description: 'Создать план для встречи за кофе',
          thumb_url: `${miniappUrl}/assets/hero/hero-cafe-1.jpg`,
          input_message_content: {
            message_text: `☕ Встречаемся за кофе!\n\nВыбираем кафе — нажмите кнопку ниже 👇`,
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Создать план',
                  url: `https://t.me/${botUsername}?start=cafe_plan`,
                },
              ],
            ],
          },
        });
      }

      await ctx.answerInlineQuery(results, {
        cache_time: 60,
        is_personal: true,
      });
    } catch (error) {
      console.error('Error handling inline query:', error);
    }
  }
}

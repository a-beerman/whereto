import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { StateService } from '../services/state.service';
import { getVenueCardKeyboard } from '../utils/keyboards';
import { formatVenueCard, formatVenueCaption } from '../utils/formatters';

export class VenueHandler {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly stateService: StateService,
  ) {}

  async handleVenueView(ctx: Context, venueId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      // Get venue details
      const venueResponse = await this.apiClient.getVenue(venueId);
      const venue = venueResponse.data;

      if (!venue) {
        await ctx.reply('Заведение не найдено.');
        return;
      }

      // Check if saved
      let isSaved = false;
      try {
        const savedResponse = await this.apiClient.getSavedVenues(userId, 100, 0);
        const savedVenues = savedResponse.data || [];
        isSaved = savedVenues.some((v: any) => v.id === venueId);
      } catch (error) {
        // Ignore error, assume not saved
      }

      // Check if partner (simplified - would need venue partner check)
      const isPartner = false; // TODO: Check if venue has active partner

      const keyboard = getVenueCardKeyboard(
        venueId,
        isSaved,
        false, // hasPhone - would need phone field
        false, // hasWebsite - would need website field
        isPartner,
      );

      // Get all photo URLs (prefer photoUrls, fallback to photoRefs)
      const photoUrls = venue.photoUrls || venue.photoRefs || [];
      const validPhotoUrls = photoUrls.filter((url: string) => url && url.startsWith('http'));

      if (validPhotoUrls.length > 0) {
        const caption = formatVenueCaption(venue);

        try {
          if (validPhotoUrls.length === 1) {
            // Single photo - send with caption and buttons
            await ctx.replyWithPhoto(validPhotoUrls[0], {
              caption,
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
          } else {
            // Multiple photos - send as Media Group (carousel)
            // Limit to 3 photos for better UX
            const photosToSend = validPhotoUrls.slice(0, 3);

            // Create media group: first photo has caption, others don't
            const mediaGroup = photosToSend.map((url: string, index: number) => ({
              type: 'photo' as const,
              media: url,
              caption: index === 0 ? caption : undefined, // Only first photo has caption
              parse_mode: index === 0 ? 'Markdown' : undefined,
            }));

            // Send media group
            await ctx.replyWithMediaGroup(mediaGroup as any);

            // Send buttons as separate message (Media Group doesn't support reply_markup on individual items)
            await ctx.reply('Выберите действие:', {
              reply_markup: keyboard,
            });
          }
        } catch (photoError) {
          // If photo fails, fallback to text
          console.error('Failed to send photo, falling back to text:', photoError);
          const cardText = formatVenueCard(venue);
          await ctx.reply(cardText, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          });
        }
      } else {
        // No photo available, send text only
        const cardText = formatVenueCard(venue);
        await ctx.reply(cardText, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      }

      this.stateService.updateUserState(userId, { viewingVenueId: venueId });
    } catch (error) {
      console.error('Error in venue view:', error);
      await ctx.reply('Произошла ошибка при загрузке заведения.');
    }
  }

  async handleSaveVenue(ctx: Context, venueId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      // Check if already saved
      const savedResponse = await this.apiClient.getSavedVenues(userId, 100, 0);
      const savedVenues = savedResponse.data || [];
      const isSaved = savedVenues.some((v: any) => v.id === venueId);

      if (isSaved) {
        // Remove from saved
        await this.apiClient.removeSavedVenue(userId, venueId);
        await ctx.answerCbQuery('Удалено из сохранённых');
      } else {
        // Save venue
        await this.apiClient.saveVenue(userId, venueId);
        await ctx.answerCbQuery('Сохранено');
      }

      // Update venue card
      await this.handleVenueView(ctx, venueId);
    } catch (error) {
      console.error('Error saving venue:', error);
      await ctx.answerCbQuery('Ошибка при сохранении');
    }
  }

  async handleRoute(ctx: Context, venueId: string) {
    try {
      const venueResponse = await this.apiClient.getVenue(venueId);
      const venue = venueResponse.data;

      if (!venue || !venue.lat || !venue.lng) {
        await ctx.answerCbQuery('Координаты не найдены');
        return;
      }

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
      await ctx.reply(`📍 Маршрут к ${venue.name}:\n${googleMapsUrl}`);
    } catch (error) {
      console.error('Error getting route:', error);
      await ctx.answerCbQuery('Ошибка при получении маршрута');
    }
  }

  async handleShare(ctx: Context, venueId: string) {
    try {
      const venueResponse = await this.apiClient.getVenue(venueId);
      const venue = venueResponse.data;

      if (!venue) {
        await ctx.answerCbQuery('Заведение не найдено');
        return;
      }

      // Create shareable link (would need mini app URL or bot deep link)
      const shareText = `📍 ${venue.name}\n${venue.address}\n\nПосмотреть в WhereTo: t.me/your_bot?start=venue_${venueId}`;

      await ctx.reply(shareText, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error sharing venue:', error);
      await ctx.answerCbQuery('Ошибка при отправке');
    }
  }
}

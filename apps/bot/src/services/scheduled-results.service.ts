import { Telegraf } from 'telegraf';
import { ApiClientService } from './api-client.service';
import { HeroService } from './hero.service';

/**
 * Scheduled results service
 * Publishes voting results when deadline is reached
 */
export class ScheduledResultsService {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly bot: Telegraf,
    private readonly apiClient: ApiClientService,
    private readonly heroService: HeroService,
  ) {}

  /**
   * Schedule result publishing for a plan
   */
  scheduleResults(planId: string, chatId: number, deadline: Date): void {
    const now = new Date();
    const delay = deadline.getTime() - now.getTime();

    if (delay <= 0) {
      // Deadline already passed, publish immediately
      void this.publishResults(planId, chatId);
      return;
    }

    // Schedule for later
    const timeoutId = setTimeout(() => {
      void this.publishResults(planId, chatId);
      this.scheduledJobs.delete(planId);
    }, delay);

    this.scheduledJobs.set(planId, timeoutId);
  }

  /**
   * Cancel scheduled results (e.g., plan closed early)
   */
  cancelScheduled(planId: string): void {
    const timeoutId = this.scheduledJobs.get(planId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledJobs.delete(planId);
    }
  }

  /**
   * Publish voting results
   */
  private async publishResults(planId: string, chatId: number): Promise<void> {
    try {
      // Get plan details and votes
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const planResponse = await this.apiClient.getPlanDetails(planId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const plan = planResponse.data as { id: string; status: string } | undefined;

      if (!plan) {
        console.error('Plan not found:', planId);
        return;
      }

      // Get vote results
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const resultsResponse = await this.apiClient.getPlanVoteResults(planId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const results = resultsResponse.data as
        | Array<{
            venue: { id: string; name: string; rating?: number; address?: string };
            voteCount: number;
          }>
        | undefined;

      if (!results || results.length === 0) {
        await this.bot.telegram.sendMessage(
          chatId,
          '🗳️ Голосование завершено!\n\n😔 Никто не проголосовал.',
        );
        return;
      }

      // Find winner(s) - venues with most votes
      const maxVotes = Math.max(...results.map((r) => r.voteCount || 0));
      const winners = results.filter((r) => (r.voteCount || 0) === maxVotes);

      const winnerVenue = winners[0].venue;
      let resultMessage: string;

      if (winners.length === 1) {
        // Clear winner
        resultMessage = `🏆 Победитель: ${winnerVenue.name}`;
      } else {
        // Tie - pick first (earliest lead or random)
        resultMessage = `🤝 Ничья (${maxVotes} голосов)! Выбираем: ${winnerVenue.name}`;
      }

      const rating = winnerVenue.rating ? ` ⭐ ${winnerVenue.rating}` : '';
      const address = winnerVenue.address ? `\n📍 ${winnerVenue.address}` : '';

      // Build result message
      const message = `🗳️ Голосование завершено!\n\n${resultMessage}${rating}${address}`;

      // Get miniapp URL for venue card
      const miniappUrl = process.env.MINIAPP_URL || 'https://whereto.app';
      const venueCardUrl = `${miniappUrl}/venues/${winnerVenue.id}`;

      await this.bot.telegram.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📋 Посмотреть карточку',
                web_app: { url: venueCardUrl },
              },
            ],
          ],
        },
      });

      // Update plan status to closed
      await this.apiClient.closePlan(planId);
    } catch (error) {
      console.error('Error publishing results:', error);
    }
  }
}

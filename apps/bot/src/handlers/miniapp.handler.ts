import { Context } from 'telegraf';

export class MiniAppHandler {
  private readonly webAppUrl: string | undefined;

  constructor() {
    this.webAppUrl = process.env.TG_WEBAPP_URL;
  }

  async handleOpen(ctx: Context): Promise<void> {
    if (!this.webAppUrl) {
      await ctx.reply('TG_WEBAPP_URL is not set. Please configure the Mini App URL.');
      return;
    }

    await ctx.reply('Открой мини-приложение:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть WhereTo Miniapp',
              web_app: { url: this.webAppUrl },
            } as any,
          ],
        ],
      },
    });
  }
}

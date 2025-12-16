import { Telegraf } from 'telegraf';
import { BotModule } from './bot.module';

async function bootstrap() {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error('BOT_TOKEN environment variable is required');
  }

  const bot = new Telegraf(botToken);

  // Set bot commands (visible in "/" menu)
  await bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Начать / выбрать город' },
    { command: 'plan', description: '📅 Создать план встречи (в группе)' },
    { command: 'saved', description: '❤️ Мои сохранённые места' },
    { command: 'help', description: '❓ Помощь' },
  ]);

  // Register handlers
  const botModule = new BotModule(bot);
  botModule.registerHandlers();

  // Error handling
  bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(console.error);
  });

  // Launch bot
  await bot.launch();

  console.log('🤖 Telegram bot is running...');
  console.log('📋 Commands registered: /start, /plan, /saved, /help');

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

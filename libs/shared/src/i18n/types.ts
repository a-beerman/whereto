import { SupportedLanguage } from './translations';

export type { SupportedLanguage };

// Translation key types (can be auto-generated from translation files)
export type TranslationKey =
  | 'bot.start.welcome'
  | 'bot.start.selectCity'
  | 'bot.venue.card.title'
  | 'bot.venue.card.rating'
  | 'bot.venue.card.save'
  | 'bot.venue.card.saved'
  | 'bot.venue.card.route'
  | 'bot.venue.card.call'
  | 'bot.venue.card.website'
  | 'bot.venue.card.share'
  | 'bot.venue.card.back'
  | 'bot.venue.card.requestBooking'
  | 'bot.plan.create.when'
  | 'bot.plan.create.time'
  | 'bot.plan.create.area'
  | 'bot.plan.create.budget'
  | 'bot.plan.create.format'
  | 'bot.plan.create.votingDuration'
  | 'bot.plan.created'
  | 'bot.plan.join'
  | 'bot.plan.preferences'
  | 'bot.plan.showOptions'
  | 'bot.plan.cancel'
  | 'bot.errors.notFound'
  | 'bot.errors.generic'
  | 'bot.errors.venueNotFound';

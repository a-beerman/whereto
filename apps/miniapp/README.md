# WhereTo Telegram Miniapp

Modern Angular 21 + Tailwind CSS miniapp for creating and managing group meeting plans.

## Features

✨ **Plan Creation Wizard**

- Date selection (today, tomorrow, specific days)
- Time selection (multiple convenient time slots)
- Area/location preference
- Budget selection (economy, mid-range, premium)
- Format selection (dinner, cafe, bar)

🗳️ **Interactive Voting**

- Beautiful venue cards with ratings and photos
- Single-choice voting system
- Real-time vote percentages
- Creator-controlled voting close

🏆 **Results Display**

- Winner announcement with celebration animation
- Complete venue details
- Google Maps integration
- Share functionality

## Technology Stack

- **Angular 21** - Latest Angular with standalone components and signals
- **Tailwind CSS** - Modern utility-first CSS framework
- **Telegram Web App SDK** - Native Telegram integration
- **TypeScript** - Type-safe development
- **Nx** - Monorepo tooling and build system

## Architecture

### Services

**TelegramService** (`services/telegram.service.ts`)

- Wraps Telegram Web App SDK
- Handles app initialization, buttons, popups
- Manages theme colors and user info

**ApiService** (`services/api.service.ts`)

- HTTP client for backend API
- Type-safe API calls
- Telegram authentication headers

**PlanStateService** (`services/plan-state.service.ts`)

- Reactive state management using Angular signals
- Step-by-step wizard flow control
- Form data persistence

### Components

**PlanCreateComponent** (`components/plan-create/`)

- Multi-step wizard for plan creation
- Modern card-based UI with animations
- Progress indicator
- Back button support

**VotingComponent** (`components/voting/`)

- Venue list with detailed cards
- Vote toggle with visual feedback
- Vote percentage visualization
- Creator controls

**ResultComponent** (`components/result/`)

- Winner celebration UI
- Venue details and contact info
- Maps and share integration

### Models

All types are defined in `models/types.ts` with TODO to migrate to generated API client:

```typescript
(Plan, CreatePlanDto, Venue, VoteOption, City, BudgetLevel, FormatType);
```

## Setup & Development

### Prerequisites

```bash
npm install
```

### Running the Miniapp

```bash
# Development server
npm run dev:miniapp

# Or with nx directly
npx nx serve miniapp
```

The app will be available at `http://localhost:4200`

### Building

```bash
# Production build
npx nx build miniapp

# Output will be in dist/apps/miniapp
```

## API Client Generation

The miniapp uses temporary type definitions. To generate the proper API client:

1. Start the API server:

```bash
npm run dev:api
```

2. Generate the API clients (both Axios for bot and Angular for miniapp):

```bash
npm run generate:api-client
```

3. Update imports in services to use generated client:

```typescript
// Instead of: import { Plan } from '../models/types';
// Use: import { Plan } from '@whereto/shared/api-client-angular';
```

## Telegram Integration

### Web App Script

The Telegram Web App script is loaded in `index.html`:

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### Theme Integration

Tailwind is configured to use Telegram theme variables:

```css
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-button-color: #3390ec;
  /* etc */
}
```

### Main Button

The app uses Telegram's Main Button for primary actions:

- Create flow: Hidden during selection, shown when ready
- Voting: "Close Voting" for creator
- Results: "Done" to close app

### Back Button

Telegram's Back Button is shown during wizard steps to navigate back.

## Styling

### Tailwind Configuration

Custom Telegram theme colors are defined in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      telegram: {
        bg: 'var(--tg-theme-bg-color)',
        text: 'var(--tg-theme-text-color)',
        button: 'var(--tg-theme-button-color)',
        // etc
      }
    }
  }
}
```

### Component Styles

Reusable component classes in `styles.css`:

- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary button
- `.card` - Content card
- `.input-field` - Form input

## Routing

Routes defined in `app.routes.ts`:

- `/` → redirects to `/create`
- `/create` → Plan creation wizard
- `/voting/:id` → Vote for venues
- `/result/:id` → View winner

## Mobile-First Design

All components are optimized for mobile:

- Responsive grid layouts
- Touch-friendly hit areas
- Smooth animations and transitions
- Progressive disclosure of information

## Production Deployment

1. Set production API URL in environment configuration
2. Build for production: `npx nx build miniapp --configuration=production`
3. Deploy the `dist/apps/miniapp` folder to your web server
4. Configure Telegram bot to use the miniapp URL

## Future Improvements

- [ ] Generate and use Angular API client from OpenAPI spec
- [ ] Add environment-based configuration
- [ ] Implement error boundary
- [ ] Add loading skeletons
- [ ] Offline support with service worker
- [ ] Add venue photos carousel
- [ ] Implement custom date picker
- [ ] Add internationalization (i18n)

## Contributing

This miniapp follows the bot's existing patterns:

- Replicates bot `/plan` functionality
- Uses same API endpoints
- Maintains consistent UX flow
- Follows TypeScript best practices

## License

Part of the WhereTo project.

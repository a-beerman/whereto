# WhereTo Miniapp UI/UX Documentation

This document describes the modern, professional UI/UX implemented for the WhereTo Telegram miniapp.

## Design Principles

### 1. **Telegram-Native Look & Feel**

- Uses Telegram's theme colors dynamically
- Adapts to light/dark mode automatically
- Follows Telegram's design guidelines
- Native button integration (Main Button, Back Button)

### 2. **Modern & Professional**

- Clean, minimalist interface
- Smooth animations and transitions
- Professional typography
- Consistent spacing and alignment

### 3. **Mobile-First**

- Touch-friendly interface
- Large hit areas for buttons
- Optimized for one-handed use
- Responsive layouts

## UI Screens

### Screen 1: Plan Creation - Date Selection

**Layout:**

```
┌─────────────────────────────────┐
│  [Progress Bar - 20%]           │
│                                  │
│  Когда встречаемся?             │
│  Выберите подходящий вариант    │
│                                  │
│  ┌──────────────────────┐       │
│  │ 📅 Сегодня          →│       │
│  └──────────────────────┘       │
│  ┌──────────────────────┐       │
│  │ 📅 Завтра           →│       │
│  └──────────────────────┘       │
│  ┌──────────────────────┐       │
│  │ 📅 Пятница          →│       │
│  └──────────────────────┘       │
│  ┌──────────────────────┐       │
│  │ 📅 Суббота          →│       │
│  └──────────────────────┘       │
│  ┌──────────────────────┐       │
│  │ 📅 Воскресенье      →│       │
│  └──────────────────────┘       │
└─────────────────────────────────┘
```

**Features:**

- 1px thin progress bar at top (Telegram button color)
- Large title (3xl, bold)
- Subtitle hint text
- Card-based buttons with:
  - Icon on left
  - Text in center
  - Arrow on right
  - Hover: shadow-lg, scale 102%
  - Active: scale 95%
  - Smooth transitions (200ms)

### Screen 2: Plan Creation - Time Selection

**Layout:**

```
┌─────────────────────────────────┐
│  [Progress Bar - 40%]           │
│                                  │
│  Во сколько?                    │
│  Выберите подходящий вариант    │
│                                  │
│  ┌──────┐  ┌──────┐            │
│  │12:00 │  │14:00 │            │
│  │ день │  │ день │            │
│  └──────┘  └──────┘            │
│  ┌──────┐  ┌──────┐            │
│  │18:00 │  │19:00 │            │
│  │вечер │  │вечер │            │
│  └──────┘  └──────┘            │
│  ┌──────┐  ┌──────┐            │
│  │20:00 │  │21:00 │            │
│  │вечер │  │вечер │            │
│  └──────┘  └──────┘            │
└─────────────────────────────────┘
```

**Features:**

- 2-column grid layout
- Large time display (2xl, bold)
- Period label below (xs, hint color)
- Centered text
- Same hover/active effects

### Screen 3: Voting

**Layout:**

```
┌─────────────────────────────────┐
│  🗳️ Голосование                 │
│  📅 Сб, 21 дек в 19:00          │
│  📍 Центр города                │
├─────────────────────────────────┤
│  Выберите заведение             │
│  Нажмите на карточку...         │
│                                  │
│  ┌──────────────────────┐ ✓    │
│  │ Restaurant Name      │      │
│  │ ⭐ 4.5 (123)         │      │
│  │ 📍 Address...        │      │
│  │ #italian #pasta      │      │
│  │ ────────────────     │      │
│  │ Голосов: 3  [====] 60%      │
│  └──────────────────────┘      │
│                                  │
│  ┌──────────────────────┐      │
│  │ Cafe Name            │      │
│  │ ⭐ 4.8 (45)          │      │
│  │ 📍 Address...        │      │
│  │ #coffee #dessert     │      │
│  │ ────────────────     │      │
│  │ Голосов: 2  [==] 40% │      │
│  └──────────────────────┘      │
├─────────────────────────────────┤
│  ℹ️ Вы можете изменить свой    │
│     выбор в любой момент        │
└─────────────────────────────────┘
[Telegram Main Button: Закрыть голосование]
```

**Features:**

- Header card with plan info
- Venue cards with:
  - Large venue name (lg, bold)
  - Rating with stars and count
  - Address with location icon
  - Category tags (rounded pills)
  - Vote count and percentage bar
  - Blue ring border when voted
  - Checkmark in top-right when voted
  - Scale effect on tap
- Sticky info footer
- Main button only for creator

### Screen 4: Results

**Layout:**

```
┌─────────────────────────────────┐
│         🏆                       │
│    (bouncing animation)          │
│                                  │
│      Победитель!                │
│   Вот куда мы идём:             │
│                                  │
│  ┌──────────────────────┐       │
│  │ Winner Venue Name    │       │
│  │                      │       │
│  │ ⭐ 4.9 (256 отзывов) │       │
│  │                      │       │
│  │ ┌────────────────┐  │       │
│  │ │📍 Full Address │  │       │
│  │ └────────────────┘  │       │
│  │                      │       │
│  │ ┌────────────────┐  │       │
│  │ │📅 Воскресенье  │  │       │
│  │ │   21 декабря   │  │       │
│  │ └────────────────┘  │       │
│  │ ┌────────────────┐  │       │
│  │ │🕐 19:00        │  │       │
│  │ └────────────────┘  │       │
│  │                      │       │
│  │ #italian #pasta      │       │
│  │                      │       │
│  │ ┌────────┐┌────────┐│       │
│  │ │📍 Маршр││📤 Подел││       │
│  │ └────────┘└────────┘│       │
│  │                      │       │
│  │ Контакты:            │       │
│  │ 📞 +373...          │       │
│  │ 🌐 Веб-сайт         │       │
│  └──────────────────────┘       │
│                                  │
│  🎉 План создан успешно!        │
│     До встречи!                 │
└─────────────────────────────────┘
[Telegram Main Button: Готово]
```

**Features:**

- Gradient header background (button color, fading)
- Large bouncing trophy emoji
- Large winner card with:
  - All venue details
  - Info boxes for date/time
  - Action buttons (Maps, Share)
  - Contact links
  - Category tags
- Success message at bottom
- Main button to close app

## Color Scheme

### Telegram Theme Variables

```css
--tg-theme-bg-color: Background --tg-theme-text-color: Primary text --tg-theme-hint-color: Secondary
  text --tg-theme-link-color: Links --tg-theme-button-color: Primary actions
  --tg-theme-button-text-color: Button text --tg-theme-secondary-bg-color: Cards/surfaces;
```

### Usage

- **Background**: Main screen background
- **Text**: Titles, labels, content
- **Hint**: Subtitles, help text, periods
- **Link**: Clickable links only
- **Button**: Primary CTAs, progress bar, selection rings
- **Button Text**: Text on primary buttons
- **Secondary BG**: All cards, input fields

## Typography

### Sizes (Tailwind)

- **3xl (30px)**: Page titles
- **2xl (24px)**: Venue names, winner title
- **xl (20px)**: Section headers
- **lg (18px)**: Card titles
- **base (16px)**: Body text
- **sm (14px)**: Descriptions, addresses
- **xs (12px)**: Hints, labels

### Weights

- **bold (700)**: Titles, venue names
- **semibold (600)**: Section headers, labels
- **medium (500)**: Buttons, tags
- **normal (400)**: Body text

## Spacing & Layout

### Padding

- Screen edges: `p-4` (16px)
- Cards: `p-4` to `p-6` (16-24px)
- Buttons: `py-3 px-6` (12px/24px)
- Compact elements: `p-2` to `p-3` (8-12px)

### Gaps

- Card stack: `space-y-3` (12px)
- Button grid: `gap-3` (12px)
- Info sections: `space-y-2` to `space-y-4` (8-16px)

### Corners

- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-xl` (12px)
- Tags: `rounded-full`
- Progress bar: `rounded-full`

## Animations

### Transitions

All interactive elements use `transition-all duration-200`:

- Hover effects
- Active states
- Border changes
- Background color changes

### Scales

- **Hover**: `hover:scale-[1.02]` (2% larger)
- **Active**: `active:scale-95` (5% smaller)

### Custom Animations

- **Spinner**: Rotating border (build animation)
- **Bounce**: Trophy emoji (keyframe animation)
- **Progress Bar**: Width transition (300ms)

## Interactive States

### Buttons & Cards

1. **Default**: Base styling
2. **Hover**: Shadow-lg, scale up slightly
3. **Active**: Scale down, providing feedback
4. **Selected**: Ring border, background tint

### Vote Cards

- Unvoted: Default card style
- Voted: Blue ring (`ring-2 ring-telegram-button`)
- Checkmark appears in top-right corner

## Responsive Design

### Breakpoints

- Mobile-first approach
- Single column layouts
- Adapt grid columns based on content
- Stack buttons vertically on very small screens

### Touch Targets

- Minimum 44px height for all interactive elements
- Comfortable spacing between tappable areas
- Large padding in buttons for easy tapping

## Accessibility

### Visual

- High contrast between text and background
- Large, readable font sizes
- Clear visual hierarchy
- Icon + text labels

### Interactive

- Large touch targets
- Visual feedback on all interactions
- Error messages clearly visible
- Loading states with spinners

### Navigation

- Back button always available (except first step)
- Progress indicator shows current position
- Clear forward path

## Implementation Notes

### Tailwind Custom Classes

Defined in `styles.css`:

- `.btn-primary`: Primary action buttons
- `.btn-secondary`: Secondary buttons
- `.card`: Content cards
- `.input-field`: Form inputs (if needed)

### CSS Variables

Telegram theme colors are CSS variables that update automatically:

```css
:root {
  /* Injected by Telegram */
  --tg-theme-bg-color: ...;
  --tg-theme-text-color: ...;
  /* etc */
}
```

### Angular Features Used

- **Standalone Components**: Modern Angular 21 pattern
- **Signals**: Reactive state management
- **Control Flow**: New @if/@for syntax
- **Router**: Declarative routing
- **HttpClient**: API communication
- **Dependency Injection**: Service architecture

## Summary

The WhereTo miniapp provides a **modern, professional, mobile-first** experience that seamlessly integrates with Telegram's native UI. Every interaction is smooth and intuitive, guiding users through the plan creation and voting process with clear visual feedback and delightful animations.

Key characteristics:
✅ Telegram-native theming
✅ Smooth animations
✅ Professional typography
✅ Touch-optimized
✅ Clear visual hierarchy
✅ Consistent spacing
✅ Accessible design

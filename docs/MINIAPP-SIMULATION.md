# Simulating Miniapp in Browser (Without Telegram)

This guide explains how to test the WhereTo miniapp in a regular browser without needing Telegram or ngrok tunnels. This is useful for rapid development and debugging.

## Quick Start

1. **Start the API** (if needed):

   ```bash
   npm run dev:api
   ```

2. **Start the miniapp**:

   ```bash
   npm run dev:miniapp
   ```

3. **Open in browser with mock mode**:
   ```
   http://localhost:4200?mock=true&api=http://localhost:3000
   ```

That's it! The miniapp will now run with a mock Telegram WebApp SDK, allowing you to test all functionality in a regular browser.

## How It Works

When you add `?mock=true` (or `?simulate=true` or `?dev=true`) to the URL, the miniapp:

1. **Loads a mock Telegram WebApp SDK** instead of the real one
2. **Provides mock user data** (configurable via URL parameters)
3. **Simulates Telegram UI elements** (MainButton, BackButton)
4. **Logs all Telegram API calls** to the console for debugging

## URL Parameters

### Enable Mock Mode

- `?mock=true` - Enable mock mode
- `?simulate=true` - Alternative way to enable mock mode
- `?dev=true` - Alternative way to enable mock mode

### Configure Mock User

- `?userId=123456789` - Set mock user ID (default: 123456789)
- `?firstName=John` - Set mock user first name (default: "Test")
- `?lastName=Doe` - Set mock user last name (default: "User")
- `?username=johndoe` - Set mock username (default: "testuser")
- `?chatId=987654321` - Set mock chat ID (for group chats, optional)
- `?startParam=plan123` - Set mock start parameter (for deep linking)

### API Configuration

- `?api=http://localhost:3000` - Override API URL (same as real Telegram mode)

## Examples

### Basic Mock Mode

```
http://localhost:4200?mock=true&api=http://localhost:3000
```

### Mock Mode with Custom User

```
http://localhost:4200?mock=true&userId=555123456&firstName=Alice&lastName=Smith&username=alice&api=http://localhost:3000
```

### Mock Mode for Group Chat

```
http://localhost:4200?mock=true&chatId=987654321&api=http://localhost:3000
```

### Mock Mode with Start Parameter

```
http://localhost:4200?mock=true&startParam=plan_abc123&api=http://localhost:3000
```

## Mock Features

The mock Telegram WebApp SDK provides:

### ✅ User Data

- Mock user object with configurable ID, name, username
- Mock init data for API authentication
- Mock chat data (if `chatId` provided)

### ✅ UI Elements

- **MainButton**: Visual button at bottom of screen (shows/hides, enables/disables)
- **BackButton**: Visual button at top-left (shows/hides)
- Both buttons are fully functional and log to console

### ✅ Methods

- `ready()`, `expand()` - Initialization
- `close()` - Shows alert (can't actually close in browser)
- `sendData()` - Logs to console and shows alert
- `showAlert()`, `showConfirm()` - Uses browser `alert()` and `confirm()`
- `setHeaderColor()`, `setBackgroundColor()` - Updates page colors
- `HapticFeedback` - Logs to console, triggers browser vibration if available

### ✅ Theme

- Default light theme with standard Telegram colors
- Theme params available via `getThemeParams()`

## Visual Indicators

When in mock mode, you'll see:

1. **Orange indicator badge** at top-right: "🔧 Mock Telegram Mode"
2. **MainButton** (when shown) appears at bottom of screen
3. **BackButton** (when shown) appears at top-left
4. **Console logs** for all Telegram API calls (prefixed with `[Mock Telegram]`)

## Console Logging

All mock Telegram API calls are logged to the browser console with the prefix `[Mock Telegram]`. This helps you:

- Debug what Telegram methods are being called
- See when buttons are shown/hidden
- Track user interactions
- Verify the app is using mock mode

Example console output:

```
[Mock Telegram] Mock Telegram WebApp SDK initialized
[Mock Telegram] User: {id: 123456789, first_name: "Test", ...}
[Mock Telegram] WebApp.ready() called
[Mock Telegram] MainButton shown
[Mock Telegram] MainButton onClick handler set
```

## Testing Different Scenarios

### Test as Different Users

Change the `userId` parameter to simulate different users:

```
?mock=true&userId=111&firstName=User1
?mock=true&userId=222&firstName=User2
```

### Test Group Chat Features

Add `chatId` to simulate group chat:

```
?mock=true&chatId=987654321
```

### Test Deep Linking

Add `startParam` to test deep linking:

```
?mock=true&startParam=plan_abc123
```

## Limitations

The mock mode has some limitations compared to real Telegram:

1. **Can't actually close the miniapp** - `close()` shows an alert
2. **Can't send data to bot** - `sendData()` shows an alert
3. **Can't open Telegram links** - `openTelegramLink()` shows an alert
4. **No real authentication** - API will need to handle mock init data
5. **No real theme sync** - Uses default light theme
6. **No real viewport management** - Uses browser window size

## API Authentication

When using mock mode, the miniapp sends mock init data to the API. You may need to:

1. **Configure API to accept mock data in development**:

   ```typescript
   // In your API authentication middleware
   if (process.env.NODE_ENV === 'development') {
     // Allow mock init data
     if (initData.includes('mock_hash_for_development')) {
       // Extract user from mock data
       return mockUser;
     }
   }
   ```

2. **Or disable authentication in development**:
   ```typescript
   // Skip Telegram auth check in development
   if (process.env.NODE_ENV === 'development' && initData.includes('mock')) {
     return { userId: 123456789 }; // Mock user
   }
   ```

## Comparison: Mock Mode vs Real Telegram

| Feature            | Mock Mode              | Real Telegram             |
| ------------------ | ---------------------- | ------------------------- |
| **Setup**          | Just add `?mock=true`  | Need ngrok + Telegram bot |
| **Speed**          | Instant                | Requires tunnel setup     |
| **User Data**      | Configurable via URL   | Real Telegram user        |
| **UI Elements**    | Visual buttons on page | Native Telegram UI        |
| **Authentication** | Mock init data         | Real Telegram init data   |
| **Close/Send**     | Alerts only            | Real functionality        |
| **Theme**          | Default light          | Real Telegram theme       |
| **Best For**       | Development, debugging | Final testing, demos      |

## Troubleshooting

### Mock Mode Not Working

**Issue**: Real Telegram SDK loads instead of mock

**Solution**:

- Make sure you have `?mock=true` (or `?simulate=true` or `?dev=true`) in the URL
- Check browser console for `[Mock Telegram]` logs
- Clear browser cache and reload

### MainButton/BackButton Not Visible

**Issue**: Buttons don't appear on screen

**Solution**:

- Check console for `[Mock Telegram] MainButton shown` logs
- Make sure the component is calling `showMainButton()` or `showBackButton()`
- Check browser console for JavaScript errors

### API Authentication Fails

**Issue**: API rejects requests with mock init data

**Solution**:

- Configure API to accept mock init data in development (see [API Authentication](#api-authentication) above)
- Or temporarily disable authentication checks in development

### Mock User Data Not Applied

**Issue**: URL parameters for user data not working

**Solution**:

- Make sure parameters are in the URL: `?mock=true&userId=123&firstName=Test`
- Check console for `[Mock Telegram] User:` log to see what user data is being used
- Reload the page after changing URL parameters

## Next Steps

Once you've tested in mock mode:

1. **Test in real Telegram** using the [MINIAPP-LOCAL-TESTING.md](./MINIAPP-LOCAL-TESTING.md) guide
2. **Deploy to production** and test with real users
3. **Report any issues** found during mock testing

## See Also

- [MINIAPP-DEBUGGING-BEST-PRACTICES.md](./MINIAPP-DEBUGGING-BEST-PRACTICES.md) - **When to use mock vs real Telegram** (recommended read)
- [MINIAPP-LOCAL-TESTING.md](./MINIAPP-LOCAL-TESTING.md) - Testing in real Telegram
- [Telegram Web Apps Documentation](https://core.telegram.org/bots/webapps)
- [@twa-dev/sdk Documentation](https://github.com/twa-dev/sdk)

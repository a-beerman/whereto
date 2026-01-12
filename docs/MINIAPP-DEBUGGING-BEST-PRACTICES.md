# Best Practices: Debugging Telegram Miniapp

This guide explains when to use **mock mode** vs **ngrok/real Telegram** for debugging, and provides a recommended development workflow.

## TL;DR: Recommended Workflow

1. **Start with Mock Mode** (90% of development)
   - Fast iteration, no setup overhead
   - Use for: UI development, business logic, API integration

2. **Switch to Real Telegram** (10% of development)
   - Before committing features
   - When testing Telegram-specific features
   - For final validation before PR

## Comparison Table

| Aspect                    | Mock Mode                          | Real Telegram (ngrok)          |
| ------------------------- | ---------------------------------- | ------------------------------ |
| **Setup Time**            | ⚡ Instant (just add `?mock=true`) | 🐌 2-5 minutes (tunnel setup)  |
| **Iteration Speed**       | ⚡ Fast (instant reload)           | 🐌 Slower (reload in Telegram) |
| **Browser DevTools**      | ✅ Full access                     | ⚠️ Limited (Telegram webview)  |
| **Network Inspection**    | ✅ Full Chrome DevTools            | ⚠️ Limited (Telegram webview)  |
| **Breakpoints/Debugging** | ✅ Full IDE debugging              | ❌ Difficult                   |
| **Hot Reload**            | ✅ Works perfectly                 | ⚠️ Works but slower            |
| **Telegram Features**     | ⚠️ Simulated (buttons, alerts)     | ✅ Real (native UI, haptics)   |
| **Authentication**        | ⚠️ Mock init data                  | ✅ Real Telegram auth          |
| **Theme Sync**            | ⚠️ Default theme                   | ✅ Real Telegram theme         |
| **Viewport Management**   | ⚠️ Browser window                  | ✅ Real Telegram viewport      |
| **Production Parity**     | ⚠️ Close but not exact             | ✅ Exact production behavior   |
| **Best For**              | Development, debugging             | Final validation, demos        |

## When to Use Mock Mode

### ✅ Use Mock Mode For:

1. **Initial Development (90% of time)**
   - Building new features
   - UI/UX development
   - Business logic implementation
   - API integration testing
   - Component development

2. **Rapid Iteration**
   - When you need to make many small changes
   - When testing different user scenarios
   - When debugging complex logic

3. **Browser DevTools Features**
   - Network inspection
   - Performance profiling
   - React/Angular DevTools
   - Console debugging
   - Breakpoints in IDE

4. **Testing Different Users**
   - Easy to change user data via URL params
   - Test group chat scenarios
   - Test different user permissions

5. **API Development**
   - Test API endpoints without Telegram overhead
   - Debug API authentication issues
   - Test error handling

### Example Mock Mode Workflow:

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start miniapp
npm run dev:miniapp

# Browser: Open with mock mode
http://localhost:4200?mock=true&api=http://localhost:3000
```

**Benefits:**

- ✅ Instant feedback
- ✅ Full debugging capabilities
- ✅ No tunnel setup needed
- ✅ Easy to test different scenarios

## When to Use Real Telegram (ngrok)

### ✅ Use Real Telegram For:

1. **Final Validation (Before PR)**
   - Verify features work in real Telegram
   - Test production-like environment
   - Catch Telegram-specific issues

2. **Telegram-Specific Features**
   - Testing MainButton/BackButton behavior
   - Testing haptic feedback
   - Testing theme synchronization
   - Testing viewport management
   - Testing close/sendData functionality

3. **Authentication Testing**
   - Verify real Telegram init data validation
   - Test API authentication flow
   - Test user identification

4. **Demos & Presentations**
   - Show real Telegram integration
   - Demonstrate to stakeholders
   - User acceptance testing

5. **Bug Reproduction**
   - Reproduce issues reported in production
   - Test on real devices
   - Test in different Telegram clients

### Example Real Telegram Workflow:

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start miniapp
npm run dev:miniapp

# Terminal 3: Start ngrok tunnels
npm run tunnel:all
# Or separately:
# npm run tunnel:api
# npm run tunnel:miniapp

# Set bot environment variable
export TG_WEBAPP_URL=https://miniapp-url.ngrok-free.app?api=https://api-url.ngrok-free.app

# Terminal 4: Start bot
npm run dev:bot

# Test in Telegram app
```

**Benefits:**

- ✅ Real Telegram environment
- ✅ Production parity
- ✅ Catch Telegram-specific bugs
- ✅ Validate authentication

## Recommended Development Workflow

### Phase 1: Development (Mock Mode)

```bash
# 1. Start services
npm run dev:api
npm run dev:miniapp

# 2. Open in browser with mock mode
# http://localhost:4200?mock=true&api=http://localhost:3000

# 3. Develop and iterate quickly
# - Use browser DevTools
# - Set breakpoints in IDE
# - Test different user scenarios
# - Debug API calls
```

**Time spent:** 90% of development

### Phase 2: Validation (Real Telegram)

```bash
# 1. Start services
npm run dev:api
npm run dev:miniapp

# 2. Start ngrok tunnels
npm run tunnel:all

# 3. Configure bot
export TG_WEBAPP_URL=https://miniapp-url.ngrok-free.app?api=https://api-url.ngrok-free.app
npm run dev:bot

# 4. Test in Telegram
# - Open bot in Telegram
# - Test all features
# - Verify Telegram-specific behavior
```

**Time spent:** 10% of development (before commits/PRs)

## Hybrid Approach: Best of Both Worlds

You can also use a **hybrid approach**:

1. **Develop in Mock Mode** (fast iteration)
2. **Periodically test in Real Telegram** (catch issues early)
3. **Final validation in Real Telegram** (before PR)

### Quick Switch Between Modes

**Mock Mode:**

```
http://localhost:4200?mock=true&api=http://localhost:3000
```

**Real Telegram:**

```
https://your-ngrok-url.ngrok-free.app?api=https://api-ngrok-url.ngrok-free.app
```

Just change the URL - no code changes needed!

## Debugging Tips

### Mock Mode Debugging

1. **Use Browser DevTools**

   ```javascript
   // In browser console
   window.Telegram.WebApp; // Access mock WebApp
   window.tg; // Also available
   ```

2. **Check Console Logs**
   - All Telegram API calls are logged with `[Mock Telegram]` prefix
   - Easy to see what's being called

3. **Test Different Scenarios**

   ```
   ?mock=true&userId=111&firstName=User1
   ?mock=true&userId=222&firstName=User2
   ?mock=true&chatId=987654321  // Group chat
   ```

4. **Network Inspection**
   - Full Chrome DevTools Network tab
   - See all API requests/responses
   - Debug CORS issues
   - Test error scenarios

### Real Telegram Debugging

1. **Use Telegram WebView DevTools**
   - Open Telegram Desktop
   - Right-click on miniapp → Inspect
   - Limited but useful

2. **Server-Side Logging**
   - Log all API requests
   - Log Telegram init data
   - Debug authentication issues

3. **Test on Multiple Devices**
   - iOS Telegram
   - Android Telegram
   - Telegram Desktop
   - Web version

## Common Scenarios

### Scenario 1: Building a New Feature

**Recommended:** Start with Mock Mode

- Fast iteration
- Full debugging
- Easy to test edge cases
- Switch to Real Telegram for final validation

### Scenario 2: Debugging a Production Bug

**Recommended:** Start with Real Telegram

- Reproduce exact production environment
- Use mock mode to isolate the issue
- Fix in mock mode
- Validate in Real Telegram

### Scenario 3: Testing Authentication

**Recommended:** Use Real Telegram

- Mock mode uses fake init data
- Real Telegram validates actual auth flow
- Test API authentication guards

### Scenario 4: UI/UX Development

**Recommended:** Use Mock Mode

- Faster iteration
- Better DevTools
- Easy to test different themes (if you extend mock)
- Switch to Real Telegram for final polish

### Scenario 5: Performance Testing

**Recommended:** Use Mock Mode

- Better performance profiling tools
- Chrome DevTools Performance tab
- Network throttling
- Validate in Real Telegram for real-world performance

## API Authentication Considerations

### Mock Mode

The mock provides fake init data. Your API needs to handle this:

**Option 1: Allow mock data in development**

```typescript
// In API auth guard/middleware
if (process.env.NODE_ENV === 'development') {
  if (initData.includes('mock_hash_for_development')) {
    // Extract user from mock data
    return { userId: extractUserIdFromMockData(initData) };
  }
}
```

**Option 2: Disable auth in development**

```typescript
if (process.env.NODE_ENV === 'development') {
  // Skip auth, use default user
  return { userId: 123456789 };
}
```

### Real Telegram

Uses real Telegram init data that must be validated:

```typescript
// Validate Telegram init data signature
const isValid = validateTelegramInitData(initData, botToken);
if (!isValid) {
  throw new UnauthorizedException();
}
```

## Best Practices Summary

1. **Default to Mock Mode**
   - Use for 90% of development
   - Fast, easy, full debugging

2. **Validate in Real Telegram**
   - Before every PR
   - When testing Telegram-specific features
   - For final validation

3. **Use Hybrid Approach**
   - Develop in mock mode
   - Periodically test in real Telegram
   - Final validation in real Telegram

4. **Know the Limitations**
   - Mock mode: Simulated, not exact
   - Real Telegram: Limited debugging
   - Use the right tool for the job

5. **Document Issues**
   - If something works in mock but not real Telegram, document it
   - If something works in real Telegram but not mock, document it
   - Helps identify patterns

## Troubleshooting

### Mock Mode Issues

**Problem:** Mock not loading

- **Solution:** Check URL has `?mock=true`
- **Solution:** Check browser console for errors
- **Solution:** Verify `/mock-telegram-webapp.js` is accessible

**Problem:** API rejects mock init data

- **Solution:** Configure API to accept mock data in development
- **Solution:** Or disable auth checks in development

### Real Telegram Issues

**Problem:** ngrok tunnel issues

- **Solution:** See [MINIAPP-LOCAL-TESTING.md](./MINIAPP-LOCAL-TESTING.md) troubleshooting section
- **Solution:** Try Cloudflare Tunnel as alternative

**Problem:** CORS errors

- **Solution:** Configure API CORS to allow ngrok domain
- **Solution:** Check `CORS_ORIGIN` environment variable

## Conclusion

**Recommended Strategy:**

- **90% Mock Mode** - Fast development and debugging
- **10% Real Telegram** - Final validation and Telegram-specific testing

This gives you the best of both worlds: fast iteration with full debugging capabilities, plus confidence that your code works in the real Telegram environment.

## See Also

- [MINIAPP-SIMULATION.md](./MINIAPP-SIMULATION.md) - Detailed mock mode guide
- [MINIAPP-LOCAL-TESTING.md](./MINIAPP-LOCAL-TESTING.md) - Real Telegram testing guide
- [Telegram Web Apps Docs](https://core.telegram.org/bots/webapps) - Official documentation

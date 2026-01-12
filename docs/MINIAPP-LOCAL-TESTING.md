# Testing Miniapp Locally with Telegram Bot

This guide explains how to test the WhereTo miniapp on Telegram from your localhost development environment.

## Quick Option: Browser Simulation (No Telegram Needed)

**For rapid development and testing**, you can simulate the miniapp in a regular browser without Telegram or ngrok:

1. Start the miniapp: `npm run dev:miniapp`
2. Open: `http://localhost:4200?mock=true&api=http://localhost:3000`

See [MINIAPP-SIMULATION.md](./MINIAPP-SIMULATION.md) for full details on browser simulation mode.

**💡 Recommendation:** See [MINIAPP-DEBUGGING-BEST-PRACTICES.md](./MINIAPP-DEBUGGING-BEST-PRACTICES.md) to understand when to use mock mode vs real Telegram testing.

## Testing in Real Telegram

For testing the actual Telegram integration, you need to use HTTPS tunnels as described below.

## Overview

Telegram Web Apps require HTTPS URLs. Since your local miniapp runs on `http://localhost:4200`, you need to:

1. Expose your localhost to the internet using a tunnel service (ngrok, Cloudflare Tunnel, etc.)
2. **Forward your API** (running on `localhost:3000`) through a tunnel as well, since the miniapp needs to make API calls
3. Configure the bot to use the tunnel URL
4. Run the miniapp, API, and bot locally
5. Test in Telegram

## Prerequisites

- Miniapp running on `http://localhost:4200`
- API running on `http://localhost:3000` (or configured port)
- Bot running and connected to Telegram
- Tunnel service installed (see options below)

## Quick Start (Using npm commands)

For convenience, npm scripts are available to start ngrok tunnels:

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start miniapp
npm run dev:miniapp

# Terminal 3: Start API tunnel
npm run tunnel:api

# Terminal 4: Start miniapp tunnel
npm run tunnel:miniapp

# Or use config file approach (single command for both tunnels)
# First create ngrok.yml (see Option 1 below), then:
npm run tunnel:all
```

After starting the tunnels, copy the URLs and set:

```bash
export TG_WEBAPP_URL=https://miniapp-url.ngrok-free.app?api=https://api-url.ngrok-free.app
```

**Note**: If you encounter ngrok authentication errors (`ERR_NGROK_9040`), see the [Troubleshooting](#ngrok-authentication-errors) section for solutions. Cloudflare Tunnel is available as an alternative if ngrok cannot be configured.

## Option 1: Using ngrok (Recommended)

ngrok is the recommended tunnel service for local development. It provides a web dashboard, stable URLs, and good performance.

### Installation

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Setup

1. **Sign up for ngrok** (free account): https://ngrok.com
2. **Get your authtoken** from the ngrok dashboard
3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Running the Tunnels

You need **two separate ngrok tunnels**: one for the miniapp and one for the API.

1. **Start the API**:

   ```bash
   npm run dev:api
   # Or
   nx serve api
   ```

2. **Start the miniapp**:

   ```bash
   npm run dev:miniapp
   # Or
   nx serve miniapp
   ```

3. **In separate terminals, start ngrok tunnels**:

   **Terminal 1 - Miniapp tunnel**:

   ```bash
   npm run tunnel:miniapp
   # Or manually: ngrok http 4200
   ```

   Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

   **Terminal 2 - API tunnel**:

   ```bash
   npm run tunnel:api
   # Or manually: ngrok http 3000
   ```

   Copy the HTTPS URL (e.g., `https://def456.ngrok-free.app`)

4. **Set the bot environment variables**:

   ```bash
   # In apps/bot/.env or your shell
   export TG_WEBAPP_URL=https://abc123.ngrok-free.app?api=https://def456.ngrok-free.app
   # Or
   export MINIAPP_URL=https://abc123.ngrok-free.app?api=https://def456.ngrok-free.app
   ```

   **Note**: The miniapp supports an `?api=` query parameter to override the API URL. This allows the miniapp to call your local API through the ngrok tunnel.

5. **Restart the bot** (if running):
   ```bash
   npm run dev:bot
   ```

### Alternative: Using ngrok Config File for Multiple Tunnels

You can also use an ngrok config file to run both tunnels from a single command:

1. **Create `ngrok.yml`** in your project root:

   ```yaml
   version: '2'
   tunnels:
     miniapp:
       addr: 4200
       proto: http
     api:
       addr: 3000
       proto: http
   ```

2. **Start both tunnels**:

   ```bash
   npm run tunnel:all
   # Or manually: ngrok start --all
   ```

3. **Get URLs from ngrok dashboard**: Visit `http://localhost:4040` to see both tunnel URLs

4. **Set bot environment variable** with both URLs:
   ```bash
   export TG_WEBAPP_URL=https://miniapp-url.ngrok-free.app?api=https://api-url.ngrok-free.app
   ```

### Testing

1. Open your Telegram bot
2. Send `/start` or use the command that opens the miniapp
3. The miniapp should load from your localhost via the tunnel
4. **Verify API calls work**: Check browser console to ensure API requests go through the ngrok tunnel

## Option 2: Using Cloudflare Tunnel (cloudflared)

### Installation

```bash
# macOS
brew install cloudflared

# Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
```

### Running the Tunnels

You need **two separate Cloudflare tunnels**: one for the miniapp and one for the API.

1. **Start the API**:

   ```bash
   npm run dev:api
   ```

2. **Start the miniapp**:

   ```bash
   npm run dev:miniapp
   ```

3. **In separate terminals, start cloudflared tunnels**:

   **Terminal 1 - Miniapp tunnel**:

   ```bash
   npm run tunnel:miniapp:cloudflare
   # Or manually: cloudflared tunnel --url http://localhost:4200
   ```

   Copy the HTTPS URL (e.g., `https://abc123-def456.trycloudflare.com`)

   **Terminal 2 - API tunnel**:

   ```bash
   npm run tunnel:api:cloudflare
   # Or manually: cloudflared tunnel --url http://localhost:3000
   ```

   Copy the HTTPS URL (e.g., `https://ghi789-jkl012.trycloudflare.com`)

4. **Set the bot environment variable**:

   ```bash
   export TG_WEBAPP_URL=https://abc123-def456.trycloudflare.com?api=https://ghi789-jkl012.trycloudflare.com
   ```

5. **Restart the bot**

## Option 3: Using localtunnel

### Installation

```bash
npm install -g localtunnel
```

### Running the Tunnels

You need **two separate localtunnel instances**: one for the miniapp and one for the API.

1. **Start the API**:

   ```bash
   npm run dev:api
   ```

2. **Start the miniapp**:

   ```bash
   npm run dev:miniapp
   ```

3. **In separate terminals, start localtunnel**:

   **Terminal 1 - Miniapp tunnel**:

   ```bash
   lt --port 4200
   ```

   Copy the HTTPS URL (e.g., `https://random-subdomain-1.loca.lt`)

   **Terminal 2 - API tunnel**:

   ```bash
   lt --port 3000
   ```

   Copy the HTTPS URL (e.g., `https://random-subdomain-2.loca.lt`)

4. **Set the bot environment variable**:
   ```bash
   export TG_WEBAPP_URL=https://random-subdomain-1.loca.lt?api=https://random-subdomain-2.loca.lt
   ```

## Configuration

### Bot Environment Variables

The bot uses these environment variables (in order of precedence):

1. `TG_WEBAPP_URL` - Primary variable (used by `MiniAppHandler`)
2. `MINIAPP_URL` - Fallback variable (used by other handlers)

Set in `apps/bot/.env`:

```bash
# apps/bot/.env
TG_WEBAPP_URL=https://your-tunnel-url.ngrok-free.app
# Or
MINIAPP_URL=https://your-tunnel-url.ngrok-free.app
```

### Miniapp Environment Configuration

The miniapp's `project.json` already includes allowed hosts for common tunnel services:

- `.ngrok.io`
- `.ngrok-free.app`
- `.trycloudflare.com`
- `.loca.lt`

This allows the Angular dev server to accept requests from these domains.

### API URL Configuration

The miniapp supports overriding the API URL via query parameter. This is essential when testing locally, as the miniapp cannot access `localhost:3000` from the browser.

**How it works**:

- The miniapp reads the `?api=` query parameter from the URL
- If present and valid, it uses that URL for all API calls
- Otherwise, it falls back to the default from `environment.apiUrl` (`http://localhost:3000`)

**Example**:

```
https://miniapp-url.ngrok-free.app?api=https://api-url.ngrok-free.app
```

**CORS Configuration**:

Since your API is accessed through a tunnel URL, configure CORS to allow the miniapp tunnel domain:

```bash
# apps/api/.env
CORS_ORIGIN=https://your-miniapp-tunnel-url.ngrok-free.app
```

Or allow all origins in development:

```bash
CORS_ORIGIN=*
```

**Note**: Make sure to restart the API after changing CORS settings.

## Testing Workflow

### Complete Setup

1. **Start the API**:

   ```bash
   npm run dev:api
   ```

2. **Start the miniapp**:

   ```bash
   npm run dev:miniapp
   ```

3. **Start the tunnels** (in separate terminals):

   **Terminal 1 - Miniapp tunnel**:

   ```bash
   npm run tunnel:miniapp
   ```

   Note the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

   **Terminal 2 - API tunnel**:

   ```bash
   npm run tunnel:api
   ```

   Note the HTTPS URL (e.g., `https://def456.ngrok-free.app`)

4. **Configure bot environment**:

   ```bash
   export TG_WEBAPP_URL=https://abc123.ngrok-free.app?api=https://def456.ngrok-free.app
   ```

5. **Configure API CORS** (if needed):

   ```bash
   # In apps/api/.env
   CORS_ORIGIN=https://abc123.ngrok-free.app
   # Or for development
   CORS_ORIGIN=*
   ```

6. **Restart the API** (if CORS was changed):

   ```bash
   # Stop and restart npm run dev:api
   ```

7. **Start the bot**:
   ```bash
   npm run dev:bot
   ```

### Testing Steps

1. **Open Telegram** and find your bot
2. **Send `/start`** to initialize the bot
3. **Use the miniapp command** (e.g., `/plan` or button that opens miniapp)
4. **Verify the miniapp loads** from your localhost
5. **Test functionality**:
   - Create a plan
   - Vote on venues
   - View results
   - Search venues

## Troubleshooting

### Miniapp Not Loading

**Issue**: "Failed to load" or blank screen

**Solutions**:

- Verify tunnel URL is HTTPS (not HTTP)
- Check tunnel is running: `curl https://your-tunnel-url`
- Verify `TG_WEBAPP_URL` is set correctly
- Check browser console for errors
- Ensure miniapp dev server is running on port 4200

### CORS Errors

**Issue**: API requests fail with CORS errors

**Solutions**:

- Add miniapp tunnel URL to `CORS_ORIGIN` in API `.env`
- Or set `CORS_ORIGIN=*` for development
- Restart API after changing CORS settings
- Verify the API tunnel URL is correct in the miniapp query parameter

### API Connection Errors

**Issue**: Miniapp cannot connect to API (network errors, 404, etc.)

**Solutions**:

- Verify the API tunnel is running and accessible: `curl https://your-api-tunnel-url`
- Check that the `?api=` query parameter is included in `TG_WEBAPP_URL`
- Ensure API is running on the correct port (default: 3000)
- Check browser console for specific error messages
- Verify API tunnel URL matches the one in the bot environment variable

### ngrok Authentication Errors

**Issue**: `ERR_NGROK_9040` - "We do not allow agents to connect to ngrok from your IP address"

**Possible Causes**:

- ngrok authtoken not configured (most common)
- IP address blocked by ngrok (VPN, restricted region, etc.)
- Network/firewall restrictions

**Solutions** (try in order):

1. **Configure ngrok authtoken** (fixes most cases):

   ```bash
   # Check if ngrok is configured
   ngrok config check
   ```

   If not configured, follow these steps:
   - Sign up for a free ngrok account: https://dashboard.ngrok.com/signup
   - Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
   - Configure ngrok:
     ```bash
     ngrok config add-authtoken YOUR_AUTH_TOKEN
     ```
   - Verify it works:
     ```bash
     ngrok http 3000
     ```

2. **If authtoken is configured but still getting errors**:
   - **Check VPN**: Disable VPN if active and try again
   - **Check network**: Try from a different network (mobile hotspot, different WiFi)
   - **Contact ngrok support**: If your IP is legitimately blocked, contact support at https://ngrok.com/support

3. **If ngrok cannot be used** (last resort):
   - **Use Cloudflare Tunnel** (free, no auth required):

     ```bash
     # Terminal 1
     npm run tunnel:miniapp:cloudflare

     # Terminal 2
     npm run tunnel:api:cloudflare
     ```

   - Or use **localtunnel** (also free, no auth):

     ```bash
     # Terminal 1
     lt --port 4200

     # Terminal 2
     lt --port 3000
     ```

**Most Common Fix**: The error usually means ngrok isn't authenticated. Simply running `ngrok config add-authtoken YOUR_TOKEN` fixes it in 90% of cases.

### ngrok Free Tier Limitations

**Issue**: ngrok URL changes on restart or has session limits

**Solutions**:

- Use ngrok's static domain (paid feature) - URLs stay the same
- Use ngrok config file with `npm run tunnel:all` for easier management
- Or script to update bot env variable automatically
- For free alternatives, see [Cloudflare Tunnel](#option-2-using-cloudflare-tunnel-cloudflared) or [localtunnel](#option-3-using-localtunnel)

### Telegram WebApp Validation

**Issue**: "Invalid init data" errors

**Solutions**:

- Ensure `TELEGRAM_BOT_SECRET` is set correctly in API
- Verify bot token matches between bot and API
- Check that Telegram WebApp SDK is loaded in miniapp

### Tunnel Connection Issues

**Issue**: Tunnel disconnects or becomes unreachable

**Solutions**:

- Restart the tunnel service
- Get a new tunnel URL
- Update `TG_WEBAPP_URL` and restart bot
- Check tunnel service status/limits

## Quick Test Script

Create a script to automate the setup with both miniapp and API tunnels.

**Option 1: Using ngrok config file (Recommended)**

First, create `ngrok.yml` in your project root:

```yaml
version: '2'
tunnels:
  miniapp:
    addr: 4200
    proto: http
  api:
    addr: 3000
    proto: http
```

Then use this script:

```bash
#!/bin/bash
# test-miniapp.sh

# Start API
npm run dev:api &
API_PID=$!

# Start miniapp
npm run dev:miniapp &
MINIAPP_PID=$!

# Wait for services to start
sleep 5

# Start ngrok with config file (both tunnels)
ngrok start --all > /tmp/ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Extract URLs from ngrok API
MINIAPP_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "miniapp") | .public_url')
API_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "api") | .public_url')

if [ -z "$MINIAPP_URL" ] || [ -z "$API_URL" ]; then
  echo "Failed to get ngrok URLs"
  echo "Miniapp URL: $MINIAPP_URL"
  echo "API URL: $API_URL"
  echo "Check ngrok dashboard at http://localhost:4040"
  exit 1
fi

FULL_URL="${MINIAPP_URL}?api=${API_URL}"

echo "✅ Miniapp URL: $MINIAPP_URL"
echo "✅ API URL: $API_URL"
echo ""
echo "Set this in your bot .env:"
echo "TG_WEBAPP_URL=$FULL_URL"
echo ""
echo "View ngrok dashboard at: http://localhost:4040"

# Cleanup on exit
trap "kill $API_PID $MINIAPP_PID $NGROK_PID 2>/dev/null" EXIT

# Keep running
wait
```

**Option 2: Using separate ngrok instances**

```bash
#!/bin/bash
# test-miniapp.sh

# Start API
npm run dev:api &
API_PID=$!

# Start miniapp
npm run dev:miniapp &
MINIAPP_PID=$!

# Wait for services to start
sleep 5

# Start ngrok tunnels with different dashboard ports
ngrok http 4200 --log=stdout > /tmp/ngrok-miniapp.log &
NGROK_MINIAPP_PID=$!

ngrok http 3000 --web-addr=:4041 --log=stdout > /tmp/ngrok-api.log &
NGROK_API_PID=$!

# Wait for ngrok to start
sleep 5

# Extract URLs from ngrok API (using different ports)
MINIAPP_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
API_URL=$(curl -s http://localhost:4041/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -z "$MINIAPP_URL" ] || [ -z "$API_URL" ]; then
  echo "Failed to get ngrok URLs"
  echo "Miniapp URL: $MINIAPP_URL"
  echo "API URL: $API_URL"
  echo "Check ngrok dashboards at http://localhost:4040 and http://localhost:4041"
  exit 1
fi

FULL_URL="${MINIAPP_URL}?api=${API_URL}"

echo "✅ Miniapp URL: $MINIAPP_URL"
echo "✅ API URL: $API_URL"
echo ""
echo "Set this in your bot .env:"
echo "TG_WEBAPP_URL=$FULL_URL"

# Cleanup on exit
trap "kill $API_PID $MINIAPP_PID $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null" EXIT

# Keep running
wait
```

**Note**: These scripts assume you have `jq` installed for JSON parsing. If not, install it: `brew install jq`, or modify the scripts to use `grep` instead.

## Alternative: Using ngrok with Fixed Domain

For more stable testing, use ngrok's fixed domain feature:

1. **Sign up for ngrok paid plan** (or use free trial)
2. **Reserve two domains** in ngrok dashboard (one for miniapp, one for API)
3. **Start ngrok with fixed domains**:

   **Terminal 1 - Miniapp**:

   ```bash
   ngrok http 4200 --domain=your-miniapp-domain.ngrok-free.app
   ```

   **Terminal 2 - API**:

   ```bash
   ngrok http 3000 --domain=your-api-domain.ngrok-free.app
   ```

4. **Set bot environment variable**:
   ```bash
   export TG_WEBAPP_URL=https://your-miniapp-domain.ngrok-free.app?api=https://your-api-domain.ngrok-free.app
   ```

This way, the URLs stay the same across restarts, making testing much easier.

## Production Considerations

For production deployment:

1. **Deploy miniapp** to a hosting service (Vercel, Netlify, etc.)
2. **Get production HTTPS URL**
3. **Set `TG_WEBAPP_URL`** in production bot environment
4. **Update API CORS** to allow production domain

## References

- [ngrok Documentation](https://ngrok.com/docs)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [Angular Dev Server Configuration](https://angular.io/guide/build#configuring-application-environments)

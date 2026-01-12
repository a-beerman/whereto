# Manual ngrok Setup Guide

## Step 1: Install and Authenticate ngrok

```bash
# Install ngrok (if not already installed)
brew install ngrok

# Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
# Then configure it:
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Verify it works:
ngrok config check
```

## Step 2: Create ngrok.yml Config File

Create `ngrok.yml` in your project root:

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

## Step 3: Start Services Manually

**Terminal 1 - API:**

```bash
npm run dev:api
```

**Terminal 2 - Miniapp:**

```bash
npm run dev:miniapp
```

**Terminal 3 - ngrok:**

```bash
ngrok start --config ngrok.yml miniapp api
```

## Step 4: Get URLs from ngrok Dashboard

1. Open http://localhost:4040 in your browser
2. You'll see two tunnels: `miniapp` and `api`
3. Copy the "Forwarding" URLs:
   - Miniapp URL: `https://xxxxx.ngrok-free.app`
   - API URL: `https://yyyyy.ngrok-free.app`

## Step 5: Set Bot Environment Variable

```bash
export TG_WEBAPP_URL=https://xxxxx.ngrok-free.app?api=https://yyyyy.ngrok-free.app
```

Or add to `apps/bot/.env`:

```
TG_WEBAPP_URL=https://xxxxx.ngrok-free.app?api=https://yyyyy.ngrok-free.app
```

## Step 6: Start Bot

```bash
npm run dev:bot
```

## Quick Script to Extract URLs

If you want to extract URLs programmatically after ngrok is running:

```bash
# Get miniapp URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "miniapp") | .public_url'

# Get API URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "api") | .public_url'

# Or without jq (using grep):
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*'
```

#!/bin/bash
# Hybrid approach: Miniapp via ngrok, API via Cloudflare Tunnel

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting hybrid tunnels...${NC}"
echo -e "${YELLOW}   Miniapp: ngrok${NC}"
echo -e "${YELLOW}   API: Cloudflare Tunnel${NC}"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared is not installed${NC}"
    echo -e "${YELLOW}   Install with: brew install cloudflared${NC}"
    exit 1
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed${NC}"
    echo -e "${YELLOW}   Install with: brew install ngrok${NC}"
    exit 1
fi

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping tunnels...${NC}"
    kill $NGROK_PID $CLOUDFLARE_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start ngrok for miniapp
echo -e "${GREEN}📱 Starting ngrok tunnel for miniapp (port 4200)...${NC}"
ngrok http 4200 > /tmp/ngrok-miniapp.log 2>&1 &
NGROK_PID=$!

sleep 3

# Start Cloudflare Tunnel for API
echo -e "${GREEN}🔌 Starting Cloudflare Tunnel for API (port 3000)...${NC}"
cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflare-api.log 2>&1 &
CLOUDFLARE_PID=$!

echo -e "${YELLOW}⏳ Waiting for tunnels to start (8 seconds)...${NC}"
sleep 8

# Extract URLs
echo -e "${GREEN}📊 Extracting URLs...${NC}"

# Get ngrok URL (try API first, then logs)
NGROK_URL=$(timeout 3 curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$NGROK_URL" ]; then
    # Try to extract from ngrok log
    NGROK_URL=$(grep -oE 'https://[a-z0-9-]+\.ngrok[^ ]+' /tmp/ngrok-miniapp.log 2>/dev/null | head -1 || echo "")
fi

# Get Cloudflare URL from log (it outputs the URL)
CLOUDFLARE_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-api.log 2>/dev/null | head -1 || echo "")

# If not found, wait a bit more and retry
if [ -z "$CLOUDFLARE_URL" ]; then
    sleep 3
    CLOUDFLARE_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-api.log 2>/dev/null | head -1 || echo "")
fi

echo ""
if [ -n "$NGROK_URL" ] && [ -n "$CLOUDFLARE_URL" ]; then
    FULL_URL="${NGROK_URL}?api=${CLOUDFLARE_URL}"
    echo -e "${GREEN}✅ Success! Hybrid setup ready:${NC}"
    echo -e "   📱 Miniapp (ngrok): ${NGROK_URL}"
    echo -e "   🔌 API (Cloudflare): ${CLOUDFLARE_URL}"
    echo ""
    echo -e "${YELLOW}📋 Set this in your bot:${NC}"
    echo -e "${GREEN}export TG_WEBAPP_URL=${FULL_URL}${NC}"
elif [ -n "$NGROK_URL" ]; then
    echo -e "${YELLOW}⚠️  Miniapp URL found, but Cloudflare URL not ready yet${NC}"
    echo -e "   📱 Miniapp: ${NGROK_URL}"
    echo -e "   🔌 API: Check /tmp/cloudflare-api.log for URL"
    echo ""
    echo -e "${YELLOW}   Cloudflare tunnel may take a few more seconds...${NC}"
    echo -e "${YELLOW}   Run: tail -f /tmp/cloudflare-api.log${NC}"
elif [ -n "$CLOUDFLARE_URL" ]; then
    echo -e "${YELLOW}⚠️  API URL found, but ngrok URL not ready yet${NC}"
    echo -e "   🔌 API: ${CLOUDFLARE_URL}"
    echo -e "   📱 Miniapp: Check http://localhost:4040 or /tmp/ngrok-miniapp.log"
else
    echo -e "${YELLOW}⚠️  Could not extract URLs automatically${NC}"
    echo -e "${YELLOW}   Check manually:${NC}"
    echo -e "${GREEN}   Miniapp (ngrok): http://localhost:4040${NC}"
    echo -e "${GREEN}   API (Cloudflare): tail -f /tmp/cloudflare-api.log${NC}"
fi

echo ""
echo -e "${YELLOW}📊 Dashboards:${NC}"
echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
echo -e "${GREEN}   API: Check /tmp/cloudflare-api.log for URL${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"
echo ""

# Keep running
while true; do
    sleep 1
    if ! ps -p $NGROK_PID > /dev/null 2>&1 && ! ps -p $CLOUDFLARE_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Tunnels stopped${NC}"
        break
    fi
done

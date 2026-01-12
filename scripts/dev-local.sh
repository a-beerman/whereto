#!/bin/bash
# Fully automated local development setup for Telegram app testing

set +e  # Don't exit on errors, we'll handle them

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting local development environment...${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed. Install with: brew install ngrok${NC}"
    exit 1
fi

if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared is not installed. Install with: brew install cloudflared${NC}"
    exit 1
fi

# Check ngrok authentication
if ! ngrok config check &> /dev/null; then
    echo -e "${RED}❌ ngrok is not authenticated. Run: ngrok config add-authtoken YOUR_TOKEN${NC}"
    exit 1
fi

# Check if ports are already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use (API might be running)${NC}"
fi

if lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 4200 is already in use (Miniapp might be running)${NC}"
fi

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down all services...${NC}"
    kill $API_PID $MINIAPP_PID $NGROK_PID $CLOUDFLARE_PID 2>/dev/null || true
    pkill -f "ngrok http 4200" 2>/dev/null || true
    pkill -f "cloudflared tunnel" 2>/dev/null || true
    pkill -f "nx serve bot" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API
echo -e "${GREEN}📡 Starting API on port 3000...${NC}"
npm run dev:api > /tmp/whereto-api.log 2>&1 &
API_PID=$!

# Start miniapp
echo -e "${GREEN}🎨 Starting miniapp on port 4200...${NC}"
npm run dev:miniapp > /tmp/whereto-miniapp.log 2>&1 &
MINIAPP_PID=$!

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start (5 seconds)...${NC}"
sleep 5

# Start ngrok tunnel for miniapp
echo -e "${GREEN}🌐 Starting ngrok tunnel for miniapp...${NC}"
ngrok http 4200 > /tmp/ngrok-miniapp.log 2>&1 &
NGROK_PID=$!

sleep 3

# Start Cloudflare tunnel for API
echo -e "${GREEN}☁️  Starting Cloudflare tunnel for API...${NC}"
cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflare-api.log 2>&1 &
CLOUDFLARE_PID=$!

echo -e "${YELLOW}⏳ Waiting for tunnels to start (10 seconds)...${NC}"
sleep 10

# Extract URLs
echo -e "${GREEN}📊 Extracting tunnel URLs...${NC}"

# Extract ngrok URL (miniapp)
MINIAPP_URL=""
for i in {1..5}; do
    # Try API endpoint first
    MINIAPP_URL=$(timeout 2 curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -z "$MINIAPP_URL" ]; then
        # Try parsing log file
        MINIAPP_URL=$(grep -oE 'https://[a-z0-9-]+\.ngrok[^ ]+' /tmp/ngrok-miniapp.log 2>/dev/null | head -1 || echo "")
    fi
    
    if [ -n "$MINIAPP_URL" ] && [ "$MINIAPP_URL" != "null" ]; then
        break
    fi
    sleep 2
done

# Extract Cloudflare URL (API)
API_URL=""
for i in {1..5}; do
    # Cloudflare prints URL directly in the log
    API_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-api.log 2>/dev/null | head -1 || echo "")
    
    if [ -n "$API_URL" ] && [ "$API_URL" != "null" ]; then
        break
    fi
    sleep 2
done

echo ""

# Validate URLs
if [ -z "$MINIAPP_URL" ] || [ "$MINIAPP_URL" == "null" ]; then
    echo -e "${RED}❌ Failed to extract miniapp URL from ngrok${NC}"
    echo -e "${YELLOW}   Check ngrok dashboard: http://localhost:4040${NC}"
    echo -e "${YELLOW}   Or check log: tail -f /tmp/ngrok-miniapp.log${NC}"
    cleanup
fi

if [ -z "$API_URL" ] || [ "$API_URL" == "null" ]; then
    echo -e "${RED}❌ Failed to extract API URL from Cloudflare${NC}"
    echo -e "${YELLOW}   Check log: tail -f /tmp/cloudflare-api.log${NC}"
    cleanup
fi

# Construct combined URL
FULL_URL="${MINIAPP_URL}?api=${API_URL}"

echo -e "${GREEN}✅ Services started:${NC}"
echo -e "   📡 API: http://localhost:3000"
echo -e "   🎨 Miniapp: http://localhost:4200"
echo ""
echo -e "${GREEN}✅ Tunnels ready:${NC}"
echo -e "   📱 Miniapp: ${MINIAPP_URL}"
echo -e "   🔌 API: ${API_URL}"
echo ""
echo -e "${GREEN}🔗 Combined URL: ${FULL_URL}${NC}"
echo -e "${GREEN}✅ TG_WEBAPP_URL set automatically${NC}"
echo ""

# Export environment variable and start bot
export TG_WEBAPP_URL="$FULL_URL"

echo -e "${GREEN}🤖 Starting bot...${NC}"
echo -e "${YELLOW}   Bot will use: ${FULL_URL}${NC}"
echo ""
echo -e "${GREEN}✅ Bot is running!${NC}"
echo ""
echo -e "${YELLOW}📱 Test in Telegram:${NC}"
echo -e "${GREEN}   Send /miniapp to your bot${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start bot in foreground so user can see output and script blocks here
# When user presses Ctrl+C, cleanup trap will kill all processes
npm run dev:bot

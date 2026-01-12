#!/bin/bash
# Start two separate ngrok instances to get different URLs

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting separate ngrok tunnels...${NC}"
echo -e "${YELLOW}   This will open two separate ngrok processes${NC}"
echo -e "${YELLOW}   Each will get its own unique URL${NC}"
echo ""

# Start miniapp tunnel
echo -e "${GREEN}📱 Starting miniapp tunnel (port 4200)...${NC}"
ngrok http 4200 --log=stdout > /tmp/ngrok-miniapp.log 2>&1 &
NGROK_MINIAPP_PID=$!

# Wait a bit
sleep 3

# Start API tunnel  
echo -e "${GREEN}🔌 Starting API tunnel (port 3000)...${NC}"
# Use a different approach - start in background with output to log
ngrok http 3000 --log=stdout > /tmp/ngrok-api.log 2>&1 &
NGROK_API_PID=$!

echo ""
echo -e "${YELLOW}⏳ Waiting for tunnels to start...${NC}"
sleep 5

# Get URLs from logs (ngrok outputs the URL to stderr/stdout)
echo ""
echo -e "${GREEN}📊 Extracting URLs from ngrok logs...${NC}"

# Try to get URLs from API (but they might be on different ports)
# Miniapp tunnel should be on default 4040
MINIAPP_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")

# API tunnel might be on 4041 if ngrok auto-increments, or might conflict
# Let's check both
API_URL_4040=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | tail -1 | cut -d'"' -f4 || echo "")
API_URL_4041=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")

# Also try to extract from logs
MINIAPP_URL_FROM_LOG=$(grep -o 'https://[^ ]*\.ngrok[^ ]*' /tmp/ngrok-miniapp.log 2>/dev/null | head -1 || echo "")
API_URL_FROM_LOG=$(grep -o 'https://[^ ]*\.ngrok[^ ]*' /tmp/ngrok-api.log 2>/dev/null | head -1 || echo "")

# Use the best available URL
if [ -n "$MINIAPP_URL" ]; then
    FINAL_MINIAPP_URL="$MINIAPP_URL"
elif [ -n "$MINIAPP_URL_FROM_LOG" ]; then
    FINAL_MINIAPP_URL="$MINIAPP_URL_FROM_LOG"
else
    FINAL_MINIAPP_URL=""
fi

if [ -n "$API_URL_4041" ]; then
    FINAL_API_URL="$API_URL_4041"
elif [ -n "$API_URL_4040" ] && [ "$API_URL_4040" != "$FINAL_MINIAPP_URL" ]; then
    FINAL_API_URL="$API_URL_4040"
elif [ -n "$API_URL_FROM_LOG" ]; then
    FINAL_API_URL="$API_URL_FROM_LOG"
else
    FINAL_API_URL=""
fi

echo ""
if [ -n "$FINAL_MINIAPP_URL" ] && [ -n "$FINAL_API_URL" ] && [ "$FINAL_MINIAPP_URL" != "$FINAL_API_URL" ]; then
    FULL_URL="${FINAL_MINIAPP_URL}?api=${FINAL_API_URL}"
    echo -e "${GREEN}✅ Tunnels are running!${NC}"
    echo ""
    echo -e "${GREEN}📱 Miniapp URL:${NC} ${FINAL_MINIAPP_URL}"
    echo -e "${GREEN}🔌 API URL:${NC} ${FINAL_API_URL}"
    echo ""
    echo -e "${YELLOW}📋 Set this in your bot:${NC}"
    echo -e "${GREEN}export TG_WEBAPP_URL=${FULL_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Could not automatically extract different URLs${NC}"
    echo -e "${YELLOW}   Check the ngrok dashboards manually:${NC}"
    echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
    echo -e "${GREEN}   API: Check /tmp/ngrok-api.log for the dashboard port${NC}"
    echo ""
    echo -e "${YELLOW}   Or check the logs:${NC}"
    echo -e "${GREEN}   tail -f /tmp/ngrok-miniapp.log${NC}"
    echo -e "${GREEN}   tail -f /tmp/ngrok-api.log${NC}"
fi

echo ""
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping ngrok tunnels...${NC}"
    kill $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep running
wait

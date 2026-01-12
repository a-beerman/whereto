#!/bin/bash
# Start two separate ngrok processes to get two different URLs

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting two separate ngrok processes...${NC}"
echo -e "${YELLOW}   Each will get its own unique URL${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping ngrok tunnels...${NC}"
    kill $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start miniapp tunnel (will use default port 4040 for dashboard)
echo -e "${GREEN}📱 Starting miniapp tunnel on port 4200...${NC}"
ngrok http 4200 > /tmp/ngrok-miniapp.log 2>&1 &
NGROK_MINIAPP_PID=$!

sleep 3

# Start API tunnel (will try to use 4041, but ngrok might auto-increment or conflict)
# We'll need to check which port it actually uses
echo -e "${GREEN}🔌 Starting API tunnel on port 3000...${NC}"
ngrok http 3000 > /tmp/ngrok-api.log 2>&1 &
NGROK_API_PID=$!

echo -e "${YELLOW}⏳ Waiting for tunnels to start (10 seconds)...${NC}"
sleep 10

# Try to get URLs from different dashboard ports
echo -e "${GREEN}📊 Extracting URLs...${NC}"

# Miniapp should be on 4040
MINIAPP_URL=$(timeout 2 curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")

# API might be on 4041, 4042, etc. - try a few
API_URL=""
for port in 4041 4042 4043; do
    URL=$(timeout 2 curl -s http://localhost:${port}/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    if [ -n "$URL" ] && [ "$URL" != "$MINIAPP_URL" ]; then
        API_URL="$URL"
        break
    fi
done

# If still not found, try extracting from logs
if [ -z "$API_URL" ]; then
    API_URL=$(grep -oE 'https://[a-z0-9-]+\.ngrok[^ ]+' /tmp/ngrok-api.log 2>/dev/null | head -1 || echo "")
fi

if [ -z "$MINIAPP_URL" ]; then
    MINIAPP_URL=$(grep -oE 'https://[a-z0-9-]+\.ngrok[^ ]+' /tmp/ngrok-miniapp.log 2>/dev/null | head -1 || echo "")
fi

echo ""
if [ -n "$MINIAPP_URL" ] && [ -n "$API_URL" ] && [ "$MINIAPP_URL" != "$API_URL" ]; then
    FULL_URL="${MINIAPP_URL}?api=${API_URL}"
    echo -e "${GREEN}✅ Success! Two different URLs:${NC}"
    echo -e "   📱 Miniapp: ${MINIAPP_URL}"
    echo -e "   🔌 API: ${API_URL}"
    echo ""
    echo -e "${YELLOW}📋 Set this in your bot:${NC}"
    echo -e "${GREEN}export TG_WEBAPP_URL=${FULL_URL}${NC}"
elif [ -n "$MINIAPP_URL" ] && [ -n "$API_URL" ]; then
    echo -e "${YELLOW}⚠️  Both tunnels have the same URL (ngrok free tier limitation)${NC}"
    echo -e "${YELLOW}   Miniapp: ${MINIAPP_URL}"
    echo -e "${YELLOW}   API: ${API_URL}"
    echo ""
    echo -e "${YELLOW}   You need two different URLs. Options:${NC}"
    echo -e "${YELLOW}   1. Use ngrok paid tier for static domains${NC}"
    echo -e "${YELLOW}   2. Use Cloudflare Tunnel (gives different URLs)${NC}"
    echo -e "${YELLOW}   3. Start ngrok processes at different times${NC}"
else
    echo -e "${YELLOW}⚠️  Could not extract URLs automatically${NC}"
    echo -e "${YELLOW}   Check dashboards manually:${NC}"
    echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
    echo -e "${GREEN}   API: Check logs or try http://localhost:4041${NC}"
    echo ""
    echo -e "${YELLOW}   Or check logs:${NC}"
    echo -e "${GREEN}   tail -f /tmp/ngrok-miniapp.log${NC}"
    echo -e "${GREEN}   tail -f /tmp/ngrok-api.log${NC}"
fi

echo ""
echo -e "${YELLOW}📊 ngrok dashboards:${NC}"
echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
echo -e "${GREEN}   API: Check http://localhost:4041 or view logs${NC}"
echo ""
echo -e "${YELLOW}💡 To get URLs manually, run:${NC}"
echo -e "${GREEN}   npm run ngrok:urls${NC}"
echo -e "${GREEN}   Or check the dashboards above${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"
echo ""

# Keep running but don't block
while true; do
    sleep 1
    # Check if processes are still running
    if ! ps -p $NGROK_MINIAPP_PID > /dev/null 2>&1 && ! ps -p $NGROK_API_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  ngrok processes stopped${NC}"
        break
    fi
done

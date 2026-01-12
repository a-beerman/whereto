#!/bin/bash
# Simple script - just starts ngrok tunnels, you get URLs from web UI

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting ngrok tunnels...${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping ngrok tunnels...${NC}"
    kill $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start miniapp tunnel
echo -e "${GREEN}📱 Starting miniapp tunnel (port 4200)...${NC}"
echo -e "${YELLOW}   Dashboard will be at: http://localhost:4040${NC}"
ngrok http 4200 &
NGROK_MINIAPP_PID=$!

sleep 3

# Start API tunnel  
echo -e "${GREEN}🔌 Starting API tunnel (port 3000)...${NC}"
echo -e "${YELLOW}   Dashboard will be at: http://localhost:4041${NC}"
ngrok http 3000 &
NGROK_API_PID=$!

echo ""
echo -e "${GREEN}✅ Tunnels started!${NC}"
echo ""
echo -e "${YELLOW}📊 Get URLs from dashboards:${NC}"
echo -e "${GREEN}   1. Miniapp: http://localhost:4040${NC}"
echo -e "${GREEN}   2. API: http://localhost:4041${NC}"
echo ""
echo -e "${YELLOW}💡 Steps:${NC}"
echo -e "   1. Open both dashboards in your browser"
echo -e "   2. Copy the 'Forwarding' URL from each"
echo -e "   3. Set: export TG_WEBAPP_URL=https://miniapp-url?api=https://api-url"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"
echo ""

# Keep processes running
wait

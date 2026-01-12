#!/bin/bash
# Start ngrok tunnels with pooling enabled (allows same URL for multiple tunnels)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting ngrok tunnels with pooling...${NC}"
echo -e "${YELLOW}   This allows multiple tunnels to share the same URL${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping ngrok tunnels...${NC}"
    kill $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start miniapp tunnel with pooling
echo -e "${GREEN}📱 Starting miniapp tunnel (port 4200) with pooling...${NC}"
ngrok http 4200 --pooling-enabled > /tmp/ngrok-miniapp.log 2>&1 &
NGROK_MINIAPP_PID=$!

sleep 3

# Start API tunnel with pooling (same URL, different port)
echo -e "${GREEN}🔌 Starting API tunnel (port 3000) with pooling...${NC}"
ngrok http 3000 --pooling-enabled > /tmp/ngrok-api.log 2>&1 &
NGROK_API_PID=$!

echo -e "${YELLOW}⏳ Waiting for tunnels to start...${NC}"
sleep 5

echo ""
echo -e "${GREEN}✅ Tunnels started with pooling!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: With pooling, both tunnels share the same URL${NC}"
echo -e "${YELLOW}   This won't work for your use case (miniapp needs different API URL)${NC}"
echo ""
echo -e "${YELLOW}📊 Check dashboards:${NC}"
echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
echo -e "${GREEN}   API: http://localhost:4041${NC}"
echo ""
echo -e "${YELLOW}💡 Better solution: Use Cloudflare Tunnel for different URLs${NC}"
echo -e "${GREEN}   npm run tunnel:miniapp:cloudflare${NC}"
echo -e "${GREEN}   npm run tunnel:api:cloudflare${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"

wait

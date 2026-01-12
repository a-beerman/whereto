#!/bin/bash
# Simple script to start dev services - you manually start ngrok and get URLs

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting WhereTo development services...${NC}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    kill $API_PID $MINIAPP_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API
echo -e "${GREEN}📡 Starting API...${NC}"
npm run dev:api > /tmp/whereto-api.log 2>&1 &
API_PID=$!

# Start miniapp
echo -e "${GREEN}🎨 Starting miniapp...${NC}"
npm run dev:miniapp > /tmp/whereto-miniapp.log 2>&1 &
MINIAPP_PID=$!

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. In a separate terminal, start ngrok:"
echo -e "      ${GREEN}ngrok start --config ngrok.yml miniapp api${NC}"
echo ""
echo -e "   2. Wait for ngrok to start, then get URLs:"
echo -e "      ${GREEN}./scripts/get-ngrok-urls.sh${NC}"
echo -e "      Or open http://localhost:4040 in your browser"
echo ""
echo -e "   3. Set the bot environment variable:"
echo -e "      ${GREEN}export TG_WEBAPP_URL=https://miniapp-url?api=https://api-url${NC}"
echo ""
echo -e "   4. Start the bot:"
echo -e "      ${GREEN}npm run dev:bot${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop services${NC}"
echo ""

# Keep running
wait

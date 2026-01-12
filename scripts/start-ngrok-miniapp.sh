#!/bin/bash
# Simple script to start ngrok and show the URL

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting ngrok tunnel for miniapp (port 4200)...${NC}"
echo ""
echo -e "${YELLOW}📋 The URL will appear below. Copy it and use in Telegram bot.${NC}"
echo -e "${YELLOW}   Or open http://localhost:4040 in your browser to see the dashboard${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start ngrok in foreground so user can see the URL directly
ngrok http 4200

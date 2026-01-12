#!/bin/bash
# Quick script to start ngrok and get miniapp URL

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🌐 Starting ngrok tunnel for miniapp...${NC}"

# Check if ngrok is running
if lsof -Pi :4040 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  ngrok is already running on port 4040${NC}"
    echo -e "${YELLOW}   Getting URL from existing tunnel...${NC}"
    
    # Try to get URL from existing ngrok
    URL=$(curl -s --max-time 3 http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -n "$URL" ]; then
        echo -e "${GREEN}✅ Miniapp URL: ${URL}${NC}"
        echo ""
        echo -e "${YELLOW}📋 Use this URL in Telegram bot:${NC}"
        echo -e "${GREEN}${URL}${NC}"
        exit 0
    fi
fi

# Start ngrok in background
echo -e "${YELLOW}   Starting new ngrok tunnel...${NC}"
ngrok http 4200 > /tmp/ngrok-miniapp-url.log 2>&1 &
NGROK_PID=$!

echo -e "${YELLOW}⏳ Waiting for ngrok to start (5 seconds)...${NC}"
sleep 5

# Try to get URL
for i in {1..5}; do
    URL=$(curl -s --max-time 3 http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -z "$URL" ]; then
        # Try parsing log
        URL=$(grep -oE 'https://[a-z0-9-]+\.ngrok[^ ]+' /tmp/ngrok-miniapp-url.log 2>/dev/null | head -1 || echo "")
    fi
    
    if [ -n "$URL" ] && [ "$URL" != "null" ]; then
        break
    fi
    sleep 2
done

if [ -n "$URL" ] && [ "$URL" != "null" ]; then
    echo ""
    echo -e "${GREEN}✅ Miniapp URL: ${URL}${NC}"
    echo ""
    echo -e "${YELLOW}📋 Use this URL in Telegram bot:${NC}"
    echo -e "${GREEN}${URL}${NC}"
    echo ""
    echo -e "${YELLOW}💡 To stop ngrok, run: pkill ngrok${NC}"
    echo -e "${YELLOW}   Or check dashboard: http://localhost:4040${NC}"
else
    echo -e "${YELLOW}⚠️  Could not extract URL automatically${NC}"
    echo -e "${YELLOW}   Check ngrok dashboard: http://localhost:4040${NC}"
    echo -e "${YELLOW}   Or check log: tail -f /tmp/ngrok-miniapp-url.log${NC}"
fi

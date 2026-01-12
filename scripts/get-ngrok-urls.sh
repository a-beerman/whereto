#!/bin/bash
# Extract ngrok URLs from the dashboard API

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📊 Getting ngrok URLs...${NC}"

# Check if ngrok API is accessible
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo -e "${YELLOW}❌ ngrok dashboard not accessible at http://localhost:4040${NC}"
    echo -e "${YELLOW}   Make sure ngrok is running${NC}"
    exit 1
fi

# Extract URLs
if command -v jq &> /dev/null; then
    MINIAPP_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "miniapp") | .public_url' 2>/dev/null)
    API_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "api") | .public_url' 2>/dev/null)
else
    # Fallback without jq
    RESPONSE=$(curl -s http://localhost:4040/api/tunnels)
    MINIAPP_URL=$(echo "$RESPONSE" | grep -A 20 '"name":"miniapp"' | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)
    API_URL=$(echo "$RESPONSE" | grep -A 20 '"name":"api"' | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -z "$MINIAPP_URL" ] || [ -z "$API_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not extract URLs${NC}"
    echo -e "${YELLOW}   Open http://localhost:4040 in your browser to see the URLs${NC}"
    exit 1
fi

FULL_URL="${MINIAPP_URL}?api=${API_URL}"

echo ""
echo -e "${GREEN}✅ Found ngrok URLs:${NC}"
echo -e "   📱 Miniapp: ${MINIAPP_URL}"
echo -e "   🔌 API: ${API_URL}"
echo ""
echo -e "${GREEN}📋 Set this in your bot:${NC}"
echo -e "${YELLOW}export TG_WEBAPP_URL=${FULL_URL}${NC}"
echo ""

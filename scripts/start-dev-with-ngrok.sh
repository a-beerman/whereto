#!/bin/bash
# Start development environment with ngrok tunnels

set +e  # Don't exit on errors, we'll handle them

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting WhereTo development environment with ngrok...${NC}"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed. Install it with: brew install ngrok${NC}"
    exit 1
fi

# Check if ngrok is authenticated
if ! ngrok config check &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok is not authenticated. Run: ngrok config add-authtoken YOUR_TOKEN${NC}"
    echo -e "${YELLOW}   Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
    exit 1
fi

# Function to extract URL from ngrok API (works with or without jq)
extract_ngrok_url() {
    local port=$1
    local tunnel_name=${2:-""}
    
    # Try with jq first
    if command -v jq &> /dev/null; then
        if [ -n "$tunnel_name" ]; then
            curl -s "http://localhost:${port}/api/tunnels" 2>/dev/null | jq -r ".tunnels[] | select(.name == \"${tunnel_name}\") | .public_url" 2>/dev/null | head -1
        else
            curl -s "http://localhost:${port}/api/tunnels" 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null | head -1
        fi
    else
        # Fallback to grep/sed
        if [ -n "$tunnel_name" ]; then
            curl -s "http://localhost:${port}/api/tunnels" 2>/dev/null | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1
        else
            curl -s "http://localhost:${port}/api/tunnels" 2>/dev/null | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1
        fi
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    kill $API_PID $MINIAPP_PID $NGROK_PID $NGROK_MINIAPP_PID $NGROK_API_PID 2>/dev/null || true
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
sleep 8

# Check if services are running
if ! curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  API might not be ready yet, continuing anyway...${NC}"
fi

# Create ngrok.yml in project root if it doesn't exist
NGROK_CONFIG="ngrok.yml"
if [ ! -f "$NGROK_CONFIG" ]; then
    echo -e "${GREEN}📝 Creating ngrok.yml config file...${NC}"
    cat > "$NGROK_CONFIG" << 'EOF'
version: "2"
tunnels:
  miniapp:
    addr: 4200
    proto: http
  api:
    addr: 3000
    proto: http
EOF
    echo -e "${YELLOW}   Created $NGROK_CONFIG - you can customize it if needed${NC}"
fi

# Start ngrok with config file (start tunnels by name instead of --all)
echo -e "${GREEN}🌐 Starting ngrok tunnels (using $NGROK_CONFIG)...${NC}"
ngrok start --config "$NGROK_CONFIG" miniapp api > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start and be ready
echo -e "${YELLOW}⏳ Waiting for ngrok to start...${NC}"
NGROK_READY=false
for i in {1..15}; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        NGROK_READY=true
        break
    fi
    sleep 1
done

# Check if ngrok process is running
if ! ps -p $NGROK_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ ngrok process died. Check logs:${NC}"
    tail -30 /tmp/ngrok.log
    echo ""
    if grep -q "ERR_NGROK_9040\|authentication failed" /tmp/ngrok.log 2>/dev/null; then
        echo -e "${RED}❌ ngrok authentication error detected${NC}"
        echo -e "${YELLOW}   Your IP address is blocked by ngrok${NC}"
        echo -e "${YELLOW}   Solutions:${NC}"
        echo -e "${YELLOW}   1. Configure ngrok authtoken: ngrok config add-authtoken YOUR_TOKEN${NC}"
        echo -e "${YELLOW}   2. Disable VPN if active${NC}"
        echo -e "${YELLOW}   3. Use Cloudflare Tunnel instead: npm run tunnel:miniapp:cloudflare${NC}"
    fi
    cleanup
fi

if [ "$NGROK_READY" = false ]; then
    echo -e "${YELLOW}⚠️  ngrok API not responding, but processes are running${NC}"
    echo -e "${YELLOW}   This might be normal - ngrok sometimes takes longer to start${NC}"
    echo -e "${YELLOW}   Check dashboards manually:${NC}"
    if [ -f "ngrok.yml" ]; then
        echo -e "${GREEN}   http://localhost:4040${NC}"
    else
        echo -e "${GREEN}   Miniapp: http://localhost:4040${NC}"
        echo -e "${GREEN}   API: http://localhost:4041${NC}"
    fi
fi

# Extract URLs with retries
echo -e "${YELLOW}⏳ Extracting ngrok URLs...${NC}"
MINIAPP_URL=""
API_URL=""
for i in {1..8}; do
    MINIAPP_URL=$(extract_ngrok_url 4040 "miniapp")
    API_URL=$(extract_ngrok_url 4040 "api")
    
    if [ -n "$MINIAPP_URL" ] && [ -n "$API_URL" ] && [ "$MINIAPP_URL" != "null" ] && [ "$API_URL" != "null" ]; then
        break
    fi
    sleep 2
done

if [ -z "$MINIAPP_URL" ] || [ -z "$API_URL" ] || [ "$MINIAPP_URL" == "null" ] || [ "$API_URL" == "null" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Could not automatically extract URLs, but services are running${NC}"
    echo ""
    echo -e "${GREEN}✅ Services running:${NC}"
    echo -e "   📡 API: http://localhost:3000"
    echo -e "   🎨 Miniapp: http://localhost:4200"
    echo ""
    echo -e "${YELLOW}📊 Get URLs from ngrok dashboard:${NC}"
    echo -e "${GREEN}   http://localhost:4040${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Open the dashboard in your browser and copy the 'Forwarding' URLs${NC}"
    echo -e "${YELLOW}   Look for tunnels named 'miniapp' and 'api'${NC}"
    echo -e "${YELLOW}   Then set: export TG_WEBAPP_URL=https://miniapp-url?api=https://api-url${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    # Keep running so they can check dashboards
    wait
    cleanup
fi

FULL_URL="${MINIAPP_URL}?api=${API_URL}"

echo ""
echo -e "${GREEN}✅ Everything is running!${NC}"
echo ""
echo -e "${GREEN}📱 Miniapp URL:${NC} ${MINIAPP_URL}"
echo -e "${GREEN}🔌 API URL:${NC} ${API_URL}"
echo ""
echo -e "${YELLOW}📋 Set this in your bot .env or export:${NC}"
echo -e "${GREEN}export TG_WEBAPP_URL=${FULL_URL}${NC}"
echo ""
echo -e "${YELLOW}📊 View ngrok dashboard:${NC} http://localhost:4040"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop everything${NC}"
echo ""

# Keep running
wait

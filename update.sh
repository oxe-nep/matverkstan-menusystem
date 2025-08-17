#!/bin/bash

echo "🔄 Uppdaterar Restaurang Matverkstan Menu System..."

# Kontrollera att vi är i rätt directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Kör detta script från projektets root-directory"
    exit 1
fi

# Funktion för att kontrollera om kommando lyckades
check_exit() {
    if [ $? -ne 0 ]; then
        echo "❌ Error: $1"
        exit 1
    fi
}

echo "📥 Hämtar senaste kod från Git..."
git pull origin main
check_exit "Git pull failed"

echo "📦 Installerar eventuella nya dependencies..."

# Backend dependencies
echo "  - Backend dependencies..."
cd backend
npm ci --only=production
check_exit "Backend dependencies installation failed"

# Frontend dependencies  
echo "  - Frontend dependencies..."
cd ../frontend
npm ci
check_exit "Frontend dependencies installation failed"

echo "🏗️  Bygger ny frontend..."
npm run build
check_exit "Frontend build failed"

echo "📁 Kopierar frontend build till backend..."
# Ta backup av gamla uploads om de finns i public
if [ -d "../backend/public/uploads" ]; then
    echo "  - Sparar uploads backup..."
    cp -r ../backend/public/uploads /tmp/uploads-backup
fi

# Kopiera ny build
rm -rf ../backend/public/*
cp -r dist/* ../backend/public/
check_exit "Failed to copy frontend build"

# Återställ uploads om backup finns
if [ -d "/tmp/uploads-backup" ]; then
    echo "  - Återställer uploads..."
    cp -r /tmp/uploads-backup ../backend/public/uploads
    rm -rf /tmp/uploads-backup
fi

cd ..

echo "🔄 Startar om applikationen..."
pm2 restart menuscreen
check_exit "PM2 restart failed"

echo "⏳ Väntar på att applikationen ska starta..."
sleep 3

echo "🧪 Testar att applikationen fungerar..."
if curl -f http://localhost:5000 > /dev/null 2>&1; then
    echo "✅ Uppdatering klar!"
    echo ""
    echo "🌍 Applikationen är tillgänglig på:"
    echo "   http://$(hostname -I | awk '{print $1}')"
    echo "   Admin: http://$(hostname -I | awk '{print $1}')/admin"
else
    echo "❌ Varning: Applikationen svarar inte. Kontrollera loggarna:"
    echo "   pm2 logs menuscreen"
fi

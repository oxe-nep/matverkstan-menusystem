#!/bin/bash

echo "🚀 Deploying Restaurang Matverkstan Menu System..."

# Kontrollera att vi är i rätt directory
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
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

echo "📦 Installerar dependencies..."

# Installera backend dependencies
echo "  - Backend dependencies..."
cd backend
npm ci --only=production
check_exit "Backend dependencies installation failed"

# Installera frontend dependencies
echo "  - Frontend dependencies..."
cd ../frontend
npm ci
check_exit "Frontend dependencies installation failed"

echo "🏗️  Bygger frontend..."
npm run build
check_exit "Frontend build failed"

echo "📁 Skapar uploads-mapp..."
mkdir -p ../backend/src/uploads/menus
chmod 755 ../backend/src/uploads/menus

echo "🔧 Kontrollerar .env fil..."
if [ ! -f "../backend/.env" ]; then
    echo "⚠️  Warning: Ingen .env fil hittad. Skapar exempel..."
    cat > ../backend/.env << EOF
JWT_SECRET=change_this_to_a_secure_random_string_in_production
PORT=5000
NODE_ENV=production
EOF
    echo "📝 .env fil skapad. REDIGERA DEN INNAN DEPLOY!"
fi

cd ..

echo "✅ Deploy förberedd!"
echo ""
echo "📋 Nästa steg:"
echo "1. Redigera backend/.env med rätt JWT_SECRET"
echo "2. Starta servern:"
echo "   cd backend && npm start"
echo ""
echo "🐳 Eller använd Docker:"
echo "   docker-compose up -d"
echo ""
echo "🌍 Servern kommer vara tillgänglig på:"
echo "   http://localhost:5000"
echo "   Admin: http://localhost:5000/admin"

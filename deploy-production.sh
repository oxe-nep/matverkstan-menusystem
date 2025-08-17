#!/bin/bash

echo "🚀 Production deployment för Menu System..."

# Konfigurera variabler
PROJECT_DIR="/home/menuapp/matverkstan-menusystem"
BACKUP_DIR="/home/menuapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Skapa backup directory om det inte finns
mkdir -p $BACKUP_DIR

echo "📦 Skapar backup av nuvarande version..."
if [ -d "$PROJECT_DIR" ]; then
    cp -r $PROJECT_DIR $BACKUP_DIR/menuscreen_backup_$DATE
    echo "✅ Backup skapad: $BACKUP_DIR/menuscreen_backup_$DATE"
fi

echo "📥 Uppdaterar från Git..."
cd $PROJECT_DIR
git pull origin main

echo "🏗️  Bygger ny version..."
cd frontend
npm ci
npm run build

echo "📁 Uppdaterar backend public mapp..."
cd ../backend

# Behåll uploads
if [ -d "public/uploads" ]; then
    mv public/uploads /tmp/uploads-temp
fi

# Uppdatera public
rm -rf public/*
cp -r ../frontend/dist/* public/

# Återställ uploads
if [ -d "/tmp/uploads-temp" ]; then
    mv /tmp/uploads-temp public/uploads
fi

echo "📦 Uppdaterar backend dependencies..."
npm ci --only=production

echo "🔄 Startar om PM2..."
pm2 restart menuscreen

echo "🧹 Städar gamla backups (behåller senaste 5)..."
cd $BACKUP_DIR
ls -t | grep menuscreen_backup | tail -n +6 | xargs -r rm -rf

echo "✅ Deployment klart!"
pm2 status

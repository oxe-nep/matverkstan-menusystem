# Restaurang Matverkstan - Meny Display System

Ett komplett system för att hantera och visa restaurangmenyer på skärmar.

## Funktioner

- **Admin-panel** för att ladda upp dagliga menyer (måndag-fredag)
- **Veckomeny-hantering** för hela veckans meny
- **Automatisk menyvisning** baserat på serverns datum
- **Manuell menyval** för att visa specifika dagar
- **Real-time uppdateringar** via Server-Sent Events (SSE)
- **Responsiv design** optimerad för 1080x1920px (portrait)

## Tech Stack

- **Backend**: Node.js, Express.js, Multer (filuppladdning), JWT (autentisering)
- **Frontend**: React, Vite, Axios
- **Kommunikation**: REST API + Server-Sent Events

## Installation

### 1. Klona projektet
```bash
git clone [repository-url]
cd node-menuscreen
```

### 2. Installera backend-dependencies
```bash
cd backend
npm install
```

### 3. Installera frontend-dependencies
```bash
cd ../frontend
npm install
```

### 4. Skapa miljövariabler
Skapa `.env` fil i `backend/` mappen:
```env
JWT_SECRET=din_jwt_secret_nyckel_här
PORT=5000
NODE_ENV=production
```

### 5. Skapa uploads-mapp
```bash
mkdir -p backend/src/uploads/menus
```

## Användning

### Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Production
```bash
# Bygg frontend
cd frontend
npm run build

# Starta backend
cd ../backend
npm start
```

## Deployment

### Nginx Konfiguration
```nginx
server {
    listen 80;
    server_name din-domain.se;

    # Frontend (React build)
    location / {
        root /path/to/node-menuscreen/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded menu files
    location /uploads/ {
        alias /path/to/node-menuscreen/backend/src/uploads/;
    }
}
```

### PM2 Process Manager
```bash
# Installera PM2 globalt
npm install -g pm2

# Starta backend med PM2
cd backend
pm2 start src/server.js --name "menuscreen-backend"

# Sätt PM2 att starta vid boot
pm2 startup
pm2 save
```

## Default Login
- **Användarnamn**: `admin`
- **Lösenord**: `password123`

⚠️ **Viktigt**: Ändra lösenordet i `backend/src/routes/auth.js` för produktion!

## Användargränsnitt

### Admin Panel (`/admin`)
- Ladda upp menyer för varje dag
- Ladda upp veckomeny
- Välj vilken dag som ska visas
- Ta bort menyer
- Automatiskt/manuellt val

### Meny Display (`/`)
- Fullskärmsvisning (1080x1920px)
- Automatisk uppdatering
- Dagens meny + veckomeny
- Live clock och datum

## API Endpoints

### Autentisering
- `POST /api/auth/login` - Logga in

### Menyer
- `GET /api/menu/today` - Hämta dagens meny
- `GET /api/menu/all` - Hämta alla menyer (admin)
- `POST /api/menu/upload/:day` - Ladda upp daglig meny
- `POST /api/menu/upload/weekly` - Ladda upp veckomeny
- `DELETE /api/menu/:day` - Ta bort meny
- `POST /api/menu/set-display/:day` - Sätt visad meny
- `POST /api/menu/reset-to-auto` - Återställ automatiskt val
- `GET /api/menu/events` - Server-Sent Events

## Felsökning

### Allmänna problem
1. **Menyer visas inte**: Kontrollera att uploads-mappen finns och har rätt rättigheter
2. **Automatisk uppdatering fungerar inte**: Kontrollera SSE-anslutning i browser console
3. **Kan inte logga in**: Kontrollera JWT_SECRET i .env filen

### Loggar
```bash
# Backend loggar
pm2 logs menuscreen-backend

# Nginx loggar
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Support

För support och frågor, kontakta systemutvecklaren.
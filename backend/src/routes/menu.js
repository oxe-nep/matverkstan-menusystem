const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// Enkel in-memory storage för vald meny (i produktion skulle detta vara en databas)
// null = automatiskt val (dagens dag), string = specifik vald dag
let selectedMenuDay = null;

// Array för att hålla koll på alla aktiva SSE-anslutningar
let sseClients = [];

const router = express.Router();

// Konfigurera multer för filuppladdning
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/menus');
        // Skapa mappen om den inte finns
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Använd veckodagen som filnamn
        const day = req.params.day;
        const extension = path.extname(file.originalname);
        cb(null, `${day}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Endast PNG och JPG filer
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(new Error('Endast PNG och JPG filer är tillåtna'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// Särskild storage för veckomeny
const weeklyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/menus');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, `weekly${extension}`);
    }
});

const uploadWeekly = multer({ 
    storage: weeklyStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// Ladda upp veckomeny (MÅSTE komma före /upload/:day!)
router.post('/upload/weekly', authenticateToken, (req, res) => {
    console.log('Weekly upload endpoint hit');
    
    uploadWeekly.single('menu')(req, res, (err) => {
        if (err) {
            console.error('Multer error for weekly upload:', err);
            return res.status(500).json({ message: 'Fel vid filuppladdning: ' + err.message });
        }
        
        try {
            if (!req.file) {
                console.log('No file received in weekly upload');
                return res.status(400).json({ message: 'Ingen fil uppladdad' });
            }

            console.log('Weekly menu uploaded successfully:', req.file.filename);

            // Skicka uppdatering till alla anslutna SSE-klienter
            broadcastWeeklyMenuUpdate();

            res.json({
                message: 'Veckomeny uppladdad',
                filename: req.file.filename,
                path: `/uploads/menus/${req.file.filename}`
            });

        } catch (error) {
            console.error('Weekly upload error:', error);
            res.status(500).json({ message: 'Fel vid uppladdning av veckomeny: ' + error.message });
        }
    });
});

// Ladda upp meny för en specifik dag
router.post('/upload/:day', authenticateToken, upload.single('menu'), (req, res) => {
    try {
        const { day } = req.params;
        console.log('Daily upload endpoint hit with day:', day);
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        if (!validDays.includes(day.toLowerCase())) {
            console.log('Invalid day provided:', day);
            return res.status(400).json({ message: 'Ogiltig dag. Använd monday-friday.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Ingen fil uppladdad' });
        }

        // Skicka uppdatering till alla anslutna SSE-klienter
        broadcastMenuUpdate();

        res.json({
            message: `Meny för ${day} uppladdad`,
            filename: req.file.filename,
            path: `/uploads/menus/${req.file.filename}`
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Fel vid uppladdning' });
    }
});

// Återställ till automatiskt val av meny
router.post('/reset-to-auto', authenticateToken, (req, res) => {
    try {
        console.log('Resetting to automatic menu selection');
        selectedMenuDay = null;
        
        // Skicka uppdatering till alla anslutna SSE-klienter
        broadcastMenuUpdate();
        
        res.json({ 
            message: 'Automatiskt val av meny aktiverat',
            selectedDay: null
        });
    } catch (error) {
        console.error('Reset to auto error:', error);
        res.status(500).json({ message: 'Fel vid återställning till automatiskt val' });
    }
});

// Sätt vilken meny som ska visas på displayen
router.post('/set-display/:day', authenticateToken, (req, res) => {
    try {
        const { day } = req.params;
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        if (!validDays.includes(day.toLowerCase())) {
            return res.status(400).json({ message: 'Ogiltig dag' });
        }

        // Kontrollera att menyn finns
        const menuPath = path.join(__dirname, '../uploads/menus');
        const files = fs.readdirSync(menuPath).filter(file => {
            const filename = path.parse(file).name.toLowerCase();
            return filename === day.toLowerCase();
        });

        if (files.length === 0) {
            return res.status(404).json({ message: 'Ingen meny hittad för denna dag' });
        }

        selectedMenuDay = day.toLowerCase();
        
        // Skicka uppdatering till alla anslutna SSE-klienter
        broadcastMenuUpdate();
        
        res.json({ 
            message: `Meny för ${day} är nu vald för visning`,
            selectedDay: selectedMenuDay 
        });

    } catch (error) {
        console.error('Error setting display menu:', error);
        res.status(500).json({ message: 'Fel vid inställning av meny' });
    }
});

// Hämta vilken meny som är vald för visning
router.get('/current-display', (req, res) => {
    try {
        console.log('Current selectedMenuDay:', selectedMenuDay);
        
        res.json({ 
            selectedDay: selectedMenuDay,  // null = automatiskt val, string = specifik dag
            currentDay: getTodaysDay(),    // För info om vilken dag som faktiskt visas automatiskt
            isAutomatic: !selectedMenuDay
        });

    } catch (error) {
        console.error('Error getting current display:', error);
        res.status(500).json({ message: 'Fel vid hämtning av aktuell meny' });
    }
});

function getTodaysDay() {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[today.getDay()];
}

// Server-Sent Events endpoint för realtidsuppdateringar
router.get('/events', (req, res) => {
    console.log('SSE endpoint hit - new client connecting');
    
    // Sätt SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    // Lägg till klienten i listan
    const clientId = Date.now() + '-' + Math.random();
    const client = {
        id: clientId,
        response: res
    };
    sseClients.push(client);

    // Skicka initial data
    const initialData = {
        type: 'connected',
        message: 'SSE connection established',
        selectedDay: selectedMenuDay || getTodaysDay(),
        timestamp: new Date().toISOString()
    };
    
    try {
        res.write(`data: ${JSON.stringify(initialData)}\n\n`);
        console.log(`Initial SSE data sent to client ${clientId}:`, initialData);
    } catch (error) {
        console.error(`Error sending initial data to client ${clientId}:`, error);
    }

    // Skicka ping var 30:e sekund för att hålla anslutningen vid liv
    const pingInterval = setInterval(() => {
        try {
            res.write(`: ping\n\n`);
        } catch (error) {
            console.error(`Error sending ping to client ${clientId}:`, error);
            clearInterval(pingInterval);
            sseClients = sseClients.filter(c => c.id !== clientId);
        }
    }, 30000);

    // Cleanup när klienten disconnectar
    req.on('close', () => {
        clearInterval(pingInterval);
        sseClients = sseClients.filter(c => c.id !== clientId);
        console.log(`SSE Client ${clientId} disconnected. Active clients: ${sseClients.length}`);
    });

    req.on('error', (error) => {
        console.error(`SSE Client ${clientId} error:`, error);
        clearInterval(pingInterval);
        sseClients = sseClients.filter(c => c.id !== clientId);
    });

    console.log(`SSE Client ${clientId} connected successfully. Active clients: ${sseClients.length}`);
});

// Funktion för att skicka uppdateringar till alla anslutna klienter
function broadcastMenuUpdate() {
    const updateData = {
        type: 'menu-update',
        selectedDay: selectedMenuDay || getTodaysDay(),
        timestamp: new Date().toISOString(),
        updateId: Date.now() // Unik ID för varje uppdatering
    };

    sseClients.forEach(client => {
        try {
            client.response.write(`data: ${JSON.stringify(updateData)}\n\n`);
        } catch (error) {
            console.error('Error sending SSE update:', error);
        }
    });

    console.log(`Broadcast menu update to ${sseClients.length} clients:`, updateData);
}

// Funktion för att skicka veckomeny-uppdateringar till alla anslutna klienter
function broadcastWeeklyMenuUpdate() {
    const updateData = {
        type: 'weekly-menu-update',
        timestamp: new Date().toISOString(),
        updateId: Date.now() // Unik ID för varje uppdatering
    };

    sseClients.forEach(client => {
        try {
            client.response.write(`data: ${JSON.stringify(updateData)}\n\n`);
        } catch (error) {
            console.error('Error sending weekly SSE update:', error);
        }
    });

    console.log(`Broadcast weekly menu update to ${sseClients.length} clients:`, updateData);
}

// Hämta meny för vald dag eller dagens dag
router.get('/display/:day?', (req, res) => {
    try {
        let dayName;
        
        if (req.params.day) {
            // Specifik dag vald
            dayName = req.params.day.toLowerCase();
        } else {
            // Dagens dag
            const today = new Date();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            dayName = dayNames[today.getDay()];
        }

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        // Om det är helg eller ogiltig dag
        if (!validDays.includes(dayName)) {
            return res.json({
                message: dayName === 'saturday' || dayName === 'sunday' 
                    ? 'Ingen meny tillgänglig på helger' 
                    : 'Ogiltig dag',
                hasMenu: false,
                day: dayName
            });
        }

        const menuPath = path.join(__dirname, '../uploads/menus');
        
        // Leta efter meny-fil för vald dag
        const files = fs.readdirSync(menuPath).filter(file => {
            const filename = path.parse(file).name.toLowerCase();
            return filename === dayName;
        });

        if (files.length === 0) {
            return res.json({
                message: 'Ingen meny uppladdad för denna dag',
                hasMenu: false,
                day: dayName
            });
        }

        const menuFile = files[0];
        res.json({
            hasMenu: true,
            day: dayName,
            menuUrl: `/uploads/menus/${menuFile}`
        });

    } catch (error) {
        console.error('Error getting menu:', error);
        res.status(500).json({ message: 'Fel vid hämtning av meny' });
    }
});

// Hämta aktuell meny för displayen (vald meny eller dagens meny)
router.get('/today', (req, res) => {
    try {
        let dayName = selectedMenuDay;
        
        // Om ingen meny är vald, använd dagens dag
        if (!dayName) {
            const today = new Date();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            dayName = dayNames[today.getDay()];
        }
        
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        if (!validDays.includes(dayName)) {
            return res.json({
                message: selectedMenuDay ? 'Vald dag har ingen meny' : 'Ingen meny tillgänglig på helger',
                hasMenu: false,
                day: dayName,
                isSelected: !!selectedMenuDay
            });
        }

        const menuPath = path.join(__dirname, '../uploads/menus');
        
        const files = fs.readdirSync(menuPath).filter(file => {
            const filename = path.parse(file).name.toLowerCase();
            return filename === dayName;
        });

        if (files.length === 0) {
            return res.json({
                message: selectedMenuDay ? 'Ingen meny uppladdad för vald dag' : 'Ingen meny uppladdad för idag',
                hasMenu: false,
                day: dayName,
                isSelected: !!selectedMenuDay
            });
        }

        const menuFile = files[0];
        
        // Kontrollera om veckomeny finns
        let weeklyMenuUrl = null;
        try {
            const weeklyFiles = fs.readdirSync(menuPath).filter(file => {
                const filename = path.parse(file).name.toLowerCase();
                return filename === 'weekly';
            });
            weeklyMenuUrl = weeklyFiles.length > 0 ? `/uploads/menus/${weeklyFiles[0]}` : null;
        } catch (weeklyError) {
            console.error('Error checking for weekly menu:', weeklyError);
            weeklyMenuUrl = null;
        }
        
        res.json({
            hasMenu: true,
            day: dayName,
            menuUrl: `/uploads/menus/${menuFile}`,
            isSelected: !!selectedMenuDay,
            weeklyMenuUrl: weeklyMenuUrl,
            hasWeeklyMenu: !!weeklyMenuUrl
        });

    } catch (error) {
        console.error('Error getting today menu:', error);
        res.status(500).json({ message: 'Fel vid hämtning av meny' });
    }
});

// Hämta alla uppladdade menyer (för admin)
router.get('/all', authenticateToken, (req, res) => {
    try {
        const menuPath = path.join(__dirname, '../uploads/menus');
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const menus = {};

        if (!fs.existsSync(menuPath)) {
            fs.mkdirSync(menuPath, { recursive: true });
        }

        days.forEach(day => {
            const files = fs.readdirSync(menuPath).filter(file => {
                const filename = path.parse(file).name.toLowerCase();
                return filename === day;
            });

            if (files.length > 0) {
                menus[day] = `/uploads/menus/${files[0]}`;
            } else {
                menus[day] = null;
            }
        });

        // Lägg till veckomeny
        const weeklyFiles = fs.readdirSync(menuPath).filter(file => {
            const filename = path.parse(file).name.toLowerCase();
            return filename === 'weekly';
        });
        
        menus.weekly = weeklyFiles.length > 0 ? `/uploads/menus/${weeklyFiles[0]}` : null;

        res.json(menus);

    } catch (error) {
        console.error('Error getting all menus:', error);
        res.status(500).json({ message: 'Fel vid hämtning av menyer' });
    }
});

// Ta bort meny för en specifik dag
router.delete('/:day', authenticateToken, (req, res) => {
    try {
        const { day } = req.params;
        console.log('Delete request for day:', day);
        
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekly'];
        
        if (!validDays.includes(day.toLowerCase())) {
            console.log('Invalid day for deletion:', day);
            return res.status(400).json({ message: 'Ogiltig dag' });
        }

        const menuPath = path.join(__dirname, '../uploads/menus');
        console.log('Looking for files in:', menuPath);
        
        if (!fs.existsSync(menuPath)) {
            console.log('Menu path does not exist:', menuPath);
            return res.status(404).json({ message: 'Meny-mappen hittades inte' });
        }
        
        const files = fs.readdirSync(menuPath).filter(file => {
            const filename = path.parse(file).name.toLowerCase();
            return filename === day.toLowerCase();
        });
        
        console.log('Found files for deletion:', files);

        if (files.length === 0) {
            console.log('No files found for day:', day);
            return res.status(404).json({ message: 'Ingen meny hittad för denna dag' });
        }

        // Ta bort filen
        const fileToDelete = path.join(menuPath, files[0]);
        console.log('Deleting file:', fileToDelete);
        fs.unlinkSync(fileToDelete);
        console.log('File deleted successfully');

        // Om den borttagna menyn var den som visades, återgå till automatiskt val
        if (day.toLowerCase() !== 'weekly' && selectedMenuDay === day.toLowerCase()) {
            console.log(`Deleted menu ${day} was currently displayed, resetting to automatic selection`);
            selectedMenuDay = null;
        }

        // Skicka uppdatering till alla anslutna SSE-klienter
        if (day.toLowerCase() === 'weekly') {
            broadcastWeeklyMenuUpdate();
        } else {
            // Trigga även vanlig broadcast för dagliga menyer
            broadcastMenuUpdate();
        }

        const displayName = day.toLowerCase() === 'weekly' ? 'veckomeny' : day;
        res.json({ message: `Meny för ${displayName} borttagen` });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Fel vid borttagning: ' + error.message });
    }
});

module.exports = router;

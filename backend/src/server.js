const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Statiska filer för uppladdade menyer
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servera frontend som statiska filer med korrekt MIME types
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);

// Servera frontend för alla andra routes (för React Router)
app.get('*', (req, res) => {
    // Skippa API routes och uploads
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.status(404).json({ message: 'Route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
});

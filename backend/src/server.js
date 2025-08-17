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

// Servera frontend som statiska filer
app.use('/admin', express.static(path.join(__dirname, '../../frontend/dist')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);

// Servera frontend för alla andra routes (för React Router)
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Root route serverar menydisplay
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Fallback för alla andra routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
});

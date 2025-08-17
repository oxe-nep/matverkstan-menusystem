const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Enkel hårdkodad admin-användare (i produktion skulle detta vara en databas)
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (username !== adminUsername) {
            return res.status(401).json({ message: 'Ogiltiga inloggningsuppgifter' });
        }

        // I produktion skulle lösenordet vara hashat, men för enkelhet använder vi plaintext här
        if (password !== adminPassword) {
            return res.status(401).json({ message: 'Ogiltiga inloggningsuppgifter' });
        }

        // Skapa JWT token
        const token = jwt.sign(
            { username: adminUsername },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Inloggning lyckades',
            token,
            user: { username: adminUsername }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Serverfel' });
    }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Ingen token tillhandahållen' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Ogiltig token' });
        }
        res.json({ user });
    });
});

module.exports = router;

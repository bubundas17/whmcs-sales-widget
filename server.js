require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/effects', express.static(path.join(__dirname, 'effects')));

// Add environment check
if (!process.env.WHMCS_URL || !process.env.WHMCS_IDENTIFIER || !process.env.WHMCS_SECRET) {
    console.warn('Warning: WHMCS credentials not fully configured in environment variables');
}

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Add your API routes here
app.get('/api/sales/summary', (req, res) => {
    // Implement your sales summary logic
    res.json({
        today: { total: 0, invoiceCount: 0, newUserSales: 0 },
        yesterday: { total: 0, invoiceCount: 0, newUserSales: 0 },
        week: { total: 0, invoiceCount: 0, dailyAverage: 0 }
    });
});

app.get('/api/sales/recent-users', (req, res) => {
    // Implement your recent users logic
    res.json([]);
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

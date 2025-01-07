require('dotenv').config();
const express = require('express');
const path = require('path');
const { fetchRecentUsers } = require('./services/apiService');
const { getSalesStats } = require('./services/statsService');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Cache storage
const cache = {
    recentUsers: null,
    salesStats: null,
    lastFetch: null
};

const CACHE_DURATION = 5 * 60 * 1000;

async function getDataWithCache() {
    const now = Date.now();
    
    if (cache.lastFetch && (now - cache.lastFetch) < CACHE_DURATION) {
        return {
            recentUsers: cache.recentUsers,
            salesStats: cache.salesStats
        };
    }

    const recentUsers = await fetchRecentUsers();
    const salesStats = await getSalesStats(recentUsers);

    cache.recentUsers = recentUsers;
    cache.salesStats = salesStats;
    cache.lastFetch = now;

    return { recentUsers, salesStats };
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API Routes
app.get('/api/sales/summary', async (req, res) => {
    try {
        const { recentUsers, salesStats } = await getDataWithCache();

        if (!salesStats) {
            return res.status(500).json({ error: 'Failed to fetch sales statistics' });
        }

        const summary = {
            recentUsersCount: recentUsers.length,
            today: {
                total: Number(salesStats.today.total.toFixed(2)),
                invoiceCount: salesStats.today.invoices.length,
                newUserSales: Number(salesStats.today.newUsers.toFixed(2)),
                newUserInvoiceCount: salesStats.today.newUserInvoices.length
            },
            yesterday: {
                total: Number(salesStats.yesterday.total.toFixed(2)),
                invoiceCount: salesStats.yesterday.invoices.length,
                newUserSales: Number(salesStats.yesterday.newUsers.toFixed(2)),
                newUserInvoiceCount: salesStats.yesterday.newUserInvoices.length
            },
            week: {
                total: Number(salesStats.week.total.toFixed(2)),
                invoiceCount: salesStats.week.invoices.length,
                newUserSales: Number(salesStats.week.newUsers.toFixed(2)),
                newUserInvoiceCount: salesStats.week.newUserInvoices.length,
                dailyAverage: Number((salesStats.week.total / 7).toFixed(2))
            }
        };

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sales/recent-users', async (req, res) => {
    try {
        const { recentUsers, salesStats } = await getDataWithCache();

        const usersWithSales = recentUsers
            .map(user => {
                const userInvoices = salesStats.today.invoices.filter(inv => inv.userid === user.id);
                if (userInvoices.length === 0) return null;

                const userTotal = userInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
                return {
                    name: `${user.firstname} ${user.lastname}`,
                    email: user.email,
                    invoiceCount: userInvoices.length,
                    total: Number(userTotal.toFixed(2))
                };
            })
            .filter(Boolean);

        res.json(usersWithSales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cache management endpoint (optional, consider adding authentication)
app.post('/api/cache/clear', (req, res) => {
    cache.recentUsers = null;
    cache.salesStats = null;
    cache.lastFetch = null;
    res.json({ message: 'Cache cleared successfully' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

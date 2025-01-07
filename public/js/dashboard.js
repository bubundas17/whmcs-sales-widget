// Currency formatter for INR
const formatINR = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

let previousTotalToday = 0;

function setLoading(isLoading) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = isLoading ? 'flex' : 'none';
}

function addPulseEffect(elementId) {
    const element = document.getElementById(elementId);
    element.classList.add('pulse');
    setTimeout(() => element.classList.remove('pulse'), 500);
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
}

async function fetchSalesSummary() {
    try {
        const response = await fetch('/api/sales/summary');
        const data = await response.json();
        
        // Check if today's total has changed
        if (previousTotalToday && previousTotalToday !== data.today.total) {
            document.getElementById('notification').play();
            addPulseEffect('today-total');
        }
        previousTotalToday = data.today.total;
        
        // Update statistics with INR formatting
        document.getElementById('today-total').textContent = formatINR.format(data.today.total);
        document.getElementById('today-invoices').textContent = data.today.invoiceCount;
        document.getElementById('today-new-users').textContent = formatINR.format(data.today.newUserSales);

        document.getElementById('yesterday-total').textContent = formatINR.format(data.yesterday.total);
        document.getElementById('yesterday-invoices').textContent = data.yesterday.invoiceCount;
        document.getElementById('yesterday-new-users').textContent = formatINR.format(data.yesterday.newUserSales);

        document.getElementById('week-total').textContent = formatINR.format(data.week.total);
        document.getElementById('week-invoices').textContent = data.week.invoiceCount;
        document.getElementById('week-average').textContent = formatINR.format(data.week.dailyAverage);

        updateLastUpdated();
    } catch (error) {
        console.error('Error fetching sales summary:', error);
    }
}

async function fetchRecentSales() {
    try {
        const response = await fetch('/api/sales/recent-users');
        const users = await response.json();
        
        const tbody = document.querySelector('#recent-sales tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.invoiceCount}</td>
                <td>${formatINR.format(user.total)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching recent sales:', error);
    }
}

// Wake lock functionality
let wakeLock = null;

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released');
            requestWakeLock(); // Try to re-acquire
        });
    } catch (err) {
        console.log(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

// Main refresh function
async function refreshData(isAutoRefresh = false) {
    if (!isAutoRefresh) {
        setLoading(true);
    }
    
    try {
        await Promise.all([
            fetchSalesSummary(),
            fetchRecentSales()
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    } finally {
        if (!isAutoRefresh) {
            setLoading(false);
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    const icon = document.querySelector('#theme-toggle i');
    icon.className = savedTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    
    // Theme toggle button
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        icon.className = newTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    });

    // Initial data load
    refreshData(false);
    
    // Set up auto-refresh
    setInterval(() => refreshData(true), 30000);

    // Request wake lock
    if ('wakeLock' in navigator) {
        requestWakeLock();
        // Re-request wake lock when document becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });
    }
});

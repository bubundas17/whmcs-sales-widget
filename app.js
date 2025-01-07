require('dotenv').config();
const axios = require('axios');
const { convertToINR } = require('./utils/currency');

function getIndianDate() {
    const date = new Date();
    // Use Intl.DateTimeFormat for reliable timezone handling
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
}

function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
}

function parseWHMCSDate(dateStr) {
    if (!dateStr || dateStr === '0000-00-00 00:00:00') {
        return null;
    }
    
    // Convert to Indian timezone before extracting date
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
}

async function fetchRecentUsers() {
    const params = new URLSearchParams({
        identifier: process.env.WHMCS_API_IDENTIFIER,
        secret: process.env.WHMCS_API_SECRET,
        action: 'GetClients',
        responsetype: 'json',
        sorting: 'DESC',  // Sort by date created
        orderby: "id",
        limitnum: '250'  // Add limit to get more results
    });

    try {
        const response = await axios.post(process.env.WHMCS_API_URL + '/includes/api.php', params);
        
        if (response.data.result === 'error') {
            throw new Error(response.data.message || 'WHMCS API Error');
        }

        // Get date 7 days ago
        const sevenDaysAgo = getDateDaysAgo(7);
        
        // Extract clients and ensure it's an array
        const clients = response.data.clients?.client || [];
        const clientsArray = Array.isArray(clients) ? clients : [clients];

        // Filter users from last 7 days
        return clientsArray.filter(client => {
            return client.datecreated >= sevenDaysAgo;
        });
    } catch (error) {
        console.error('Error fetching clients:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
        return [];
    }
}

async function getUserInvoices(userid) {
    const params = new URLSearchParams({
        identifier: process.env.WHMCS_API_IDENTIFIER,
        secret: process.env.WHMCS_API_SECRET,
        action: 'GetInvoices',
        responsetype: 'json',
        status: 'Paid',
        userid: userid
    });

    try {
        const response = await axios.post(process.env.WHMCS_API_URL + '/includes/api.php', params);
        
        if (response.data.result === 'error') {
            throw new Error(response.data.message || 'WHMCS API Error');
        }

        const invoices = response.data.invoices?.invoice || [];
        const invoicesArray = Array.isArray(invoices) ? invoices : [invoices];
        return invoicesArray.filter(invoice => parseFloat(invoice.total) > 0);
    } catch (error) {
        console.error(`Error fetching invoices for client ${userid}:`, error.message);
        return [];
    }
}

async function fetchAllInvoices() {
    const params = new URLSearchParams({
        identifier: process.env.WHMCS_API_IDENTIFIER,
        secret: process.env.WHMCS_API_SECRET,
        action: 'GetInvoices',
        responsetype: 'json',
        status: 'Paid',
        orderby: 'id',
        order: 'desc',
        limitnum: '1000',  // Increased limit
        limitstart: '0'    // Start from beginning
    });

    try {
        const response = await axios.post(process.env.WHMCS_API_URL + '/includes/api.php', params);
        
        if (response.data.result === 'error') {
            throw new Error(response.data.message || 'WHMCS API Error');
        }

        const invoices = response.data.invoices?.invoice || [];
        const invoicesArray = Array.isArray(invoices) ? invoices : [invoices];
        
        // Debug output
        console.log(`Fetched ${invoicesArray.length} total invoices`);
        console.log('Sample invoice:', invoicesArray[0]);
        
        return invoicesArray;
    } catch (error) {
        console.error('Error fetching all invoices:', error.message);
        if (error.response?.data) {
            console.error('API Response:', error.response.data);
        }
        return [];
    }
}

async function getSalesStats(recentUsers) {
    const today = getIndianDate();
    const yesterday = getDateDaysAgo(1);
    const sevenDaysAgo = getDateDaysAgo(7);

    console.log('Date ranges for filtering:', { today, yesterday, sevenDaysAgo });

    const allInvoices = await fetchAllInvoices();
    console.log(`Total invoices fetched: ${allInvoices.length}`);

    // Filter invoices by date with debug logging
    const todayInvoices = allInvoices.filter(invoice => {
        const paidDate = parseWHMCSDate(invoice.datepaid) || parseWHMCSDate(invoice.date);
        const isToday = paidDate === today;
        if (isToday) {
            console.log('Today invoice:', {
                id: invoice.id,
                date: paidDate,
                amount: invoice.total,
                currency: invoice.currencycode
            });
        }
        return isToday;
    });

    const yesterdayInvoices = allInvoices.filter(invoice => {
        const paidDate = parseWHMCSDate(invoice.datepaid) || parseWHMCSDate(invoice.date);
        return paidDate === yesterday;
    });

    const weekInvoices = allInvoices.filter(invoice => {
        const paidDate = parseWHMCSDate(invoice.datepaid) || parseWHMCSDate(invoice.date);
        return paidDate >= sevenDaysAgo && paidDate <= today;
    });

    // Calculate new user invoices
    const newUserIds = new Set(recentUsers.map(user => user.id));
    const newUserTodayInvoices = todayInvoices.filter(inv => newUserIds.has(parseInt(inv.userid)));
    const newUserYesterdayInvoices = yesterdayInvoices.filter(inv => newUserIds.has(parseInt(inv.userid)));
    const newUserWeekInvoices = weekInvoices.filter(inv => newUserIds.has(parseInt(inv.userid)));

    // Calculate totals
    const [todayTotal, yesterdayTotal, weekTotal, 
           newUserTodayTotal, newUserYesterdayTotal, newUserWeekTotal] = await Promise.all([
        calculateTotalSales(todayInvoices),
        calculateTotalSales(yesterdayInvoices),
        calculateTotalSales(weekInvoices),
        calculateTotalSales(newUserTodayInvoices),
        calculateTotalSales(newUserYesterdayInvoices),
        calculateTotalSales(newUserWeekInvoices)
    ]);

    return {
        today: { 
            total: todayTotal,
            newUsers: newUserTodayTotal,
            invoices: todayInvoices,
            newUserInvoices: newUserTodayInvoices
        },
        yesterday: {
            total: yesterdayTotal,
            newUsers: newUserYesterdayTotal,
            invoices: yesterdayInvoices,
            newUserInvoices: newUserYesterdayInvoices
        },
        week: {
            total: weekTotal,
            newUsers: newUserWeekTotal,
            invoices: weekInvoices,
            newUserInvoices: newUserWeekInvoices
        }
    };
}

async function calculateTotalSales(invoices) {
    let totalSalesINR = 0;
    for (const invoice of invoices) {
        if (invoice.currencycode === 'INR') {
            totalSalesINR += parseFloat(invoice.total) || 0;
        } else {
            const amountInINR = await convertToINR(parseFloat(invoice.total) || 0, invoice.currencycode || 'USD');
            totalSalesINR += amountInINR;
        }
    }
    return totalSalesINR;
}

async function main() {
    const recentUsers = await fetchRecentUsers();
    const salesStats = await getSalesStats(recentUsers);

    if (!salesStats) {
        console.log('Failed to fetch sales statistics');
        return;
    }

    console.log('\nSales Summary:');
    console.log('--------------');
    console.log(`Recent Users (Last 7 days): ${recentUsers.length}`);
    
    console.log('\nToday:');
    console.log(`  Total Sales: ₹${salesStats.today.total.toFixed(2)} (${salesStats.today.invoices.length} invoices)`);
    console.log(`  New User Sales: ₹${salesStats.today.newUsers.toFixed(2)} (${salesStats.today.newUserInvoices.length} invoices)`);
    
    console.log('\nYesterday:');
    console.log(`  Total Sales: ₹${salesStats.yesterday.total.toFixed(2)} (${salesStats.yesterday.invoices.length} invoices)`);
    console.log(`  New User Sales: ₹${salesStats.yesterday.newUsers.toFixed(2)} (${salesStats.yesterday.newUserInvoices.length} invoices)`);
    
    console.log('\nLast 7 Days:');
    console.log(`  Total Sales: ₹${salesStats.week.total.toFixed(2)} (${salesStats.week.invoices.length} invoices)`);
    console.log(`  New User Sales: ₹${salesStats.week.newUsers.toFixed(2)} (${salesStats.week.newUserInvoices.length} invoices)`);
    console.log(`  Daily Average: ₹${(salesStats.week.total / 7).toFixed(2)}`);
    
    console.log('\nRecent Users with Today\'s Sales:');
    console.log('-------------------------------');
    recentUsers.forEach(user => {
        const userInvoices = salesStats.today.invoices.filter(inv => inv.userid === user.id);
        if (userInvoices.length > 0) {
            const userTotal = userInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
            console.log(`- ${user.firstname} ${user.lastname} (${user.email})`);
            console.log(`  Invoices: ${userInvoices.length}, Total: ₹${userTotal.toFixed(2)}`);
        }
    });
}

main().catch(console.error);

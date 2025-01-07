const dateUtils = require('../utils/dateUtils');
const { fetchAllInvoices } = require('./apiService');
const { convertToINR } = require('../utils/currency');

async function getSalesStats(recentUsers) {
    const today = dateUtils.getIndianDate();
    const yesterday = dateUtils.getDateDaysAgo(1);
    const sevenDaysAgo = dateUtils.getDateDaysAgo(7);

    console.log('Date ranges for filtering:', { today, yesterday, sevenDaysAgo });

    const allInvoices = await fetchAllInvoices();
    console.log(`Total invoices fetched: ${allInvoices.length}`);

    const todayInvoices = filterInvoicesByDate(allInvoices, today);
    const yesterdayInvoices = filterInvoicesByDate(allInvoices, yesterday);
    const weekInvoices = filterInvoicesDateRange(allInvoices, sevenDaysAgo, today);

    const newUserIds = new Set(recentUsers.map(user => user.id));
    const newUserTodayInvoices = filterNewUserInvoices(todayInvoices, newUserIds);
    const newUserYesterdayInvoices = filterNewUserInvoices(yesterdayInvoices, newUserIds);
    const newUserWeekInvoices = filterNewUserInvoices(weekInvoices, newUserIds);

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
        today: { total: todayTotal, newUsers: newUserTodayTotal, invoices: todayInvoices, newUserInvoices: newUserTodayInvoices },
        yesterday: { total: yesterdayTotal, newUsers: newUserYesterdayTotal, invoices: yesterdayInvoices, newUserInvoices: newUserYesterdayInvoices },
        week: { total: weekTotal, newUsers: newUserWeekTotal, invoices: weekInvoices, newUserInvoices: newUserWeekInvoices }
    };
}

function filterInvoicesByDate(invoices, date) {
    return invoices.filter(invoice => {
        const paidDate = dateUtils.parseWHMCSDate(invoice.datepaid) || dateUtils.parseWHMCSDate(invoice.date);
        return paidDate === date;
    });
}

function filterInvoicesDateRange(invoices, startDate, endDate) {
    return invoices.filter(invoice => {
        const paidDate = dateUtils.parseWHMCSDate(invoice.datepaid) || dateUtils.parseWHMCSDate(invoice.date);
        return paidDate >= startDate && paidDate <= endDate;
    });
}

function filterNewUserInvoices(invoices, newUserIds) {
    return invoices.filter(inv => newUserIds.has(parseInt(inv.userid)));
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

module.exports = {
    getSalesStats
};

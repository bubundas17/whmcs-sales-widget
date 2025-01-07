const axios = require('axios');
const dateUtils = require('../utils/dateUtils');

async function fetchRecentUsers() {
    const params = new URLSearchParams({
        identifier: process.env.WHMCS_API_IDENTIFIER,
        secret: process.env.WHMCS_API_SECRET,
        action: 'GetClients',
        responsetype: 'json',
        sorting: 'DESC',
        orderby: "id",
        limitnum: '250'
    });

    try {
        const response = await axios.post(process.env.WHMCS_API_URL + '/includes/api.php', params);
        
        if (response.data.result === 'error') {
            throw new Error(response.data.message || 'WHMCS API Error');
        }

        const sevenDaysAgo = dateUtils.getDateDaysAgo(7);
        const clients = response.data.clients?.client || [];
        const clientsArray = Array.isArray(clients) ? clients : [clients];

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
        limitnum: '1000',
        limitstart: '0'
    });

    try {
        const response = await axios.post(process.env.WHMCS_API_URL + '/includes/api.php', params);
        
        if (response.data.result === 'error') {
            throw new Error(response.data.message || 'WHMCS API Error');
        }

        const invoices = response.data.invoices?.invoice || [];
        const invoicesArray = Array.isArray(invoices) ? invoices : [invoices];
        
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

module.exports = {
    fetchRecentUsers,
    getUserInvoices,
    fetchAllInvoices
};

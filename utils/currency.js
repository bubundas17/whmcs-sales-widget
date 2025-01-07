const axios = require('axios');

// Cache exchange rates for 1 hour
let ratesCache = {
    timestamp: 0,
    rates: {}
};

async function fetchExchangeRates() {
    // Return cached rates if less than 1 hour old
    if (Date.now() - ratesCache.timestamp < 3600000) {
        return ratesCache.rates;
    }

    try {
        // Using exchangerate-api.com (free tier)
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/INR`);
        
        if (response.data && response.data.rates) {
            ratesCache = {
                timestamp: Date.now(),
                rates: response.data.rates
            };
            return response.data.rates;
        }
        throw new Error('Invalid response from exchange rate API');
    } catch (error) {
        console.error('Error fetching exchange rates:', error.message);
        // Fallback rates for common currencies (approximate)
        return {
            USD: 0.012,  // 1 INR = 0.012 USD
            EUR: 0.011,  // 1 INR = 0.011 EUR
            GBP: 0.0095, // 1 INR = 0.0095 GBP
            AUD: 0.018,  // 1 INR = 0.018 AUD
            INR: 1       // 1 INR = 1 INR
        };
    }
}

async function convertToINR(amount, fromCurrency) {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === 'INR') return amount;

    try {
        const rates = await fetchExchangeRates();
        const rateToINR = 1 / (rates[fromCurrency] || 1);
        return amount * rateToINR;
    } catch (error) {
        console.error(`Error converting ${fromCurrency} to INR:`, error.message);
        return amount; // Return original amount if conversion fails
    }
}

module.exports = { convertToINR };

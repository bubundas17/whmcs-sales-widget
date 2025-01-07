function getIndianDate() {
    const date = new Date();
    return formatIndianDate(date);
}

function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatIndianDate(date);
}

function parseWHMCSDate(dateStr) {
    if (!dateStr || dateStr === '0000-00-00 00:00:00') {
        return null;
    }
    
    const date = new Date(dateStr);
    return formatIndianDate(date);
}

function formatIndianDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
}

module.exports = {
    getIndianDate,
    getDateDaysAgo,
    parseWHMCSDate,
    formatIndianDate
};

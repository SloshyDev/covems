// backend/utils/dateFormat.js

function formatDateYMD(date) {
    if (!date) return null;
    // Si es string tipo ISO o Date
    let d = date;
    if (typeof date === 'string' && date.includes('T')) {
        d = new Date(date);
    } else if (typeof date === 'string' && date.includes('/')) {
        // ya está en formato correcto
        return date;
    } else if (!(date instanceof Date)) {
        d = new Date(date);
    }
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
}

module.exports = { formatDateYMD };

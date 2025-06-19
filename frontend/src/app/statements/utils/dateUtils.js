// Formatea una fecha a 'yyyy/mm/dd'
export function formatDateYMD(fecha) {
    if (!fecha) return "";
    // Si ya es string, tomar solo la parte de la fecha si tiene 'T'
    if (typeof fecha === 'string' && fecha.includes('T')) {
        return fecha.split('T')[0].replace(/-/g, '/');
    }
    // Si es Date o string sin 'T', formatear normalmente
    const d = new Date(fecha);
    if (isNaN(d)) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
}

// Suma un día a una fecha en formato 'yyyy-mm-dd' o 'yyyy/mm/dd'
export function addOneDay(fecha) {
    if (!fecha) return "";
    const [y, m, d] = fecha.includes('/') ? fecha.split('/') : fecha.split('-');
    const dateObj = new Date(`${y}-${m}-${d}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + 1);
    const y2 = dateObj.getFullYear();
    const m2 = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d2 = String(dateObj.getDate()).padStart(2, '0');
    return `${y2}/${m2}/${d2}`;
}
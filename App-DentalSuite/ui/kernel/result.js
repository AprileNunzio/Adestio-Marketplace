export function ok(data) {
    return { success: true, data: data === undefined ? null : data };
}

export function fail(code, message) {
    return { success: false, code, error: message || code };
}

export function isOk(result) {
    return Boolean(result && result.success === true);
}

export function dataOr(result, fallback) {
    return isOk(result) && result.data !== null && result.data !== undefined
        ? result.data
        : fallback;
}

export function listOr(result, fallback = []) {
    const value = dataOr(result, fallback);
    return Array.isArray(value) ? value : fallback;
}

export function pageOr(result, fallback = { righe: [], totale: 0, pagina: 1, dimensione: 50, pagine: 1 }) {
    const value = dataOr(result, null);
    if (!value || !Array.isArray(value.righe)) return fallback;
    return {
        righe: value.righe,
        totale: Number(value.totale) || value.righe.length,
        pagina: Number(value.pagina) || 1,
        dimensione: Number(value.dimensione) || value.righe.length || 50,
        pagine: Number(value.pagine) || 1
    };
}

export function errorOf(result, fallback = 'Errore sconosciuto') {
    if (isOk(result)) return null;
    return (result && result.error) || fallback;
}

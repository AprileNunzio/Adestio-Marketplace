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

export function errorOf(result, fallback = 'Errore sconosciuto') {
    if (isOk(result)) return null;
    return (result && result.error) || fallback;
}

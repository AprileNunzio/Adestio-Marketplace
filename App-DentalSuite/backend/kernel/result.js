'use strict';

function ok(data) {
    return { success: true, data: data === undefined ? null : data };
}

function fail(code, message) {
    return { success: false, code: code, error: message || code };
}

function isOk(result) {
    return Boolean(result && result.success === true);
}

module.exports = { ok, fail, isOk };

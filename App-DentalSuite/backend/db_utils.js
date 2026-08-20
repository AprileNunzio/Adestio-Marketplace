let _adestioDb = null;

function configure(adestioDb) {
    try {
        _adestioDb = adestioDb;
    } catch (e) {}
}

function db() {
    try {
        if (!_adestioDb) return null;
        return _adestioDb.getDB('app_dental_suite');
    } catch (e) {
        return null;
    }
}

async function persist() {
    try {
        if (_adestioDb && typeof _adestioDb.saveDB === 'function') {
            await _adestioDb.saveDB('app_dental_suite');
        }
    } catch (e) {}
}

module.exports = { configure, db, persist };

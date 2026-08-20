const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, shell, dialog, BrowserWindow } = require('electron');
const { db, persist } = require('./db_utils');

function getAttachmentsDir() {
    try {
        const userData = app ? app.getPath('userData') : path.join(process.env.APPDATA || '', 'NunzioTech', 'Adestio');
        const dir = path.join(userData, 'dental_suite_attachments');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return dir;
    } catch (e) {
        return '';
    }
}

async function getByPaziente(event, args = {}) {
    try {
        const { paziente_id } = args || {};
        if (!paziente_id) return { success: false, error: 'ID Paziente mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT * FROM allegati_diagnostici WHERE paziente_id = ? AND is_deleted = 0 ORDER BY data_esame DESC", [paziente_id]);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function uploadAllegato(event, payload = {}) {
    try {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const res = await dialog.showOpenDialog(win, {
            title: 'Seleziona Allegato Clinico / TAC / RMN / Radiografia',
            properties: ['openFile'],
            filters: [
                { name: 'Documenti e Immagini Sanitarie', extensions: ['jpg', 'jpeg', 'png', 'pdf', 'dcm', 'tiff', 'zip'] }
            ]
        });
        if (!res || res.canceled || !res.filePaths || res.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        const sourcePath = res.filePaths[0];
        const fileName = path.basename(sourcePath);
        const ext = path.extname(sourcePath);
        const destDir = getAttachmentsDir();
        const fileId = crypto.randomUUID();
        const destFileName = `${fileId}${ext}`;
        const destPath = path.join(destDir, destFileName);
        fs.copyFileSync(sourcePath, destPath);
        const stats = fs.statSync(destPath);

        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        d.run(
            "INSERT INTO allegati_diagnostici (id, paziente_id, tipo, titolo, data_esame, file_path, file_size, mime_type, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                fileId, payload.paziente_id,
                payload.tipo || 'rx',
                payload.titolo || fileName,
                payload.data_esame || new Date().toISOString().split('T')[0],
                destPath, stats.size, ext.replace('.', ''),
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id: fileId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteAllegato(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE allegati_diagnostici SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function openAllegato(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT file_path FROM allegati_diagnostici WHERE id = ?", [id]);
        if (!rows || rows.length === 0 || !fs.existsSync(rows[0].file_path)) {
            return { success: false, error: 'File non trovato sul disco' };
        }
        await shell.openPath(rows[0].file_path);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getByPaziente, uploadAllegato, deleteAllegato, openAllegato };

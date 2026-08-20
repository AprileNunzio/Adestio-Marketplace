import { creaShell } from './ui/app_shell.js';
import { versioneDa } from './ui/kernel/moduli.js';

export default {
    render: async (contenitore, parametri = {}) => {
        versioneDa(import.meta.url);
        const shell = creaShell(contenitore);
        const destinazione = parametri && parametri.moduleId ? parametri.moduleId : 'hub';
        await shell.naviga(destinazione, parametri || {});
    }
};

import { creaShell } from './ui/app_shell.js';

export default {
    render: async (contenitore, parametri = {}) => {
        const shell = creaShell(contenitore);
        const destinazione = parametri && parametri.moduleId ? parametri.moduleId : 'hub';
        await shell.naviga(destinazione, parametri || {});
    }
};

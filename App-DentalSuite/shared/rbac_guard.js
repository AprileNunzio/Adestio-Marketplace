export async function checkPermission(permissionId) {
    try {
        if (!window.electronAPI || !window.electronAPI.rbac || typeof window.electronAPI.rbac.getEffectiveUserPermissions !== 'function') {
            return true;
        }
        const res = await window.electronAPI.rbac.getEffectiveUserPermissions();
        if (!res || !res.success || !Array.isArray(res.data)) {
            return true;
        }
        const perms = res.data;
        if (perms.includes('*') || perms.includes('dentalSuite:*') || perms.includes(`dentalSuite:${permissionId}`)) {
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
}

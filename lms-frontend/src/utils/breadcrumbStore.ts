export const breadcrumbStore = new Map<string, string>();

export const setBreadcrumbLabel = (id: string | number, label: string) => {
    if (!id || !label) return;
    const strId = String(id);
    if (breadcrumbStore.get(strId) !== label) {
        breadcrumbStore.set(strId, label);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event('breadcrumb-updated'));
        }
    }
};

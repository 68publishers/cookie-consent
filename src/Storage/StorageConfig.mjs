export class StorageConfig {
    constructor(config) {
        if (!('name' in config) || '' === config.name) {
            throw new Error('Missing required property "name".')
        }

        this.name = config.name;
        this.enabled_by_default = config.enabled_by_default || false;
        this.display_in_widget = config.display_in_widget || false;
        this.readonly = config.readonly || false;
        this.sync_consent_with = config.sync_consent_with || null;
        this.show_modal_again_expiration = config.show_modal_again_expiration || null;
        // services (providers) of the storage shown in the "services" preferences mode: [{name, label?, link?, cookies?}]
        this.services = Array.isArray(config.services)
            ? config.services.filter(service => service && service.name).map(service => ({
                name: String(service.name),
                label: service.label ? String(service.label) : null,
                link: service.link ? String(service.link) : null,
                cookies: Array.isArray(service.cookies) ? service.cookies.map(String) : [],
            }))
            : [];
    }
}

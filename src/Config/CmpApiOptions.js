'use strict';

class CmpApiOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.url = null;
        this.project = null;
        this.version = 1;
        this.environment = null;

        this.consent_api_enabled = false;
        this.cookies_api_enabled = false;

        this.cookie_table_headers = [];
    }

    resolveProject() {
        if (this.project && '' !== this.project) {
            return this.project;
        }

        return window.location.hostname.replace('www.','');
    }
}

module.exports = CmpApiOptions;

'use strict';

class CmpApiOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.url = null;
        this.project = null;
        this.version = 1;

        this.consent_api_enabled = false;
        this.cookies_api_enabled = false;

        this.cookie_table_headers = [];
    }
}

module.exports = CmpApiOptions;

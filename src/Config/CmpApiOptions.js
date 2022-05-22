'use strict';

class CmpApiOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.enabled = false;
        this.url = null;
        this.project = null;
        this.version = 1;
    }
}

module.exports = CmpApiOptions;

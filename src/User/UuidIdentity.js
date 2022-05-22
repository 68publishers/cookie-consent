'use strict';

const uuidV4 = require('uuid').v4;

class UuidIdentity extends require('./AbstractIdentity') {
    constructor() {
        super();

        this._id = null;
    }

    toString() {
        if (null === this._id) {
            this._id = uuidV4().replaceAll('-', '');
        }

        return this._id;
    }
}

module.exports = UuidIdentity;

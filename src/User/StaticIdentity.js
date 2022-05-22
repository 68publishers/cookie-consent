'use strict';

class StaticIdentity extends require('./AbstractIdentity') {
    constructor(id) {
        super();

        if (!id || 0 >= id.length) {
            throw new Error('User identity must be non empty string.');
        }

        this._id = id;
    }

    toString() {
        return this._id;
    }
}

module.exports = StaticIdentity;

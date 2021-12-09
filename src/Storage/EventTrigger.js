'use strict';

class EventTrigger {
    constructor(name, invoked = false) {
        this._name = name;
        this.invoked = invoked;
    }

    get name() {
        return this._name;
    }
}

module.exports = EventTrigger;

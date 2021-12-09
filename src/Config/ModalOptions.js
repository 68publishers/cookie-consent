'use strict';

class ModalOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.layout = undefined;
        this.position = undefined;
        this.transition = 'zoom';
    }
}

module.exports = ModalOptions;

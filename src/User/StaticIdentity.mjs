import { AbstractIdentity } from './AbstractIdentity.mjs';

export class StaticIdentity extends AbstractIdentity {
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

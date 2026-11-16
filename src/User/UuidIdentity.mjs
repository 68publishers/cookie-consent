import { AbstractIdentity } from './AbstractIdentity.mjs';
import { uuidV4 } from '../Utils/Crypto.mjs';

export class UuidIdentity extends AbstractIdentity {
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

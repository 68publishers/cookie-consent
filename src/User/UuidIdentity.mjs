import { AbstractIdentity } from './AbstractIdentity.mjs';
import { v4 as uuidV4 } from 'uuid';

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

import { AbstractIdentity } from './AbstractIdentity.mjs';

export class StoredIdentity extends AbstractIdentity {
    constructor(inner) {
        super();

        this._id = null;
        this._inner = inner;
    }

    toString() {
        if (null !== this._id) {
            return this._id;
        }

        if (!window.localStorage) {
            console.warn('Local storage is not accessible.');

            return this._id = this._inner.toString();
        }

        const id = window.localStorage.getItem('cookie_consent__user_identity');

        if (id) {
            return this._id = id;
        }

        this._id = this._inner.toString();
        window.localStorage.setItem('cookie_consent__user_identity', this._id);

        return this._id;
    }
}

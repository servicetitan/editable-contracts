// Tech debt list:
// 1) Improve types (get rid of any's and casting)
// 2) Remove $ and other props from non-composite nodes
// 3) Check array parent type
// 4) Autorun for hasError to support async validation and avoid performance issues

import { observable, entries, set } from 'mobx';

type Validator<T, TParent> = TParent extends undefined ? (value: T) => boolean | string : (value: T, parentValue: TParent) => boolean | string;

type Node<T, TParent> = {
    value: T;
    onChange(value: T): void;
    hasError: boolean;
    validators(...validators: Validator<T, TParent>[]): void
};

type DollarType<T> = {
    [P in keyof T]-?: Editable<T[P], T>;
} & (
    NonNullable<T> extends (infer U)[] ? (T extends NonNullable<T> ? ArrayType<U> : ArrayType<U> | undefined) : void
);

type ArrayType<T> = {
    push(value: T): void;
};

type CompositeNode<T, TParent> = {
    $: NonNullable<T> extends T ? DollarType<T> :
        DollarType<T> | undefined;
} & Node<T, TParent>;

type PrimitiveType = string | number | boolean | Date;

export type Editable<T, TParent = undefined> = NonNullable<T> extends PrimitiveType ? Node<T, TParent> : CompositeNode<T, TParent>;

function isEditableObject(obj?: any): obj is object & { [key: string]: Node<any, any> } {
    return !isEditablePrimitive(obj) && !Array.isArray(obj);
}

function isEditablePrimitive(obj?: any) {
    return Object(obj) !== obj || obj instanceof Date;
}

function createProxyObject(observableObject: any) {
    return new Proxy(observableObject, {
        get(target, prop) {
            if (typeof prop === 'symbol') {
                return (target as any)[prop];
            }
            if (target === undefined) {
                throw new Error(`Cannot read property '${prop.toString()}' of undefined`);
            }
            if (isEditablePrimitive(target)) {
                throw new Error(`Cannot get property '${prop.toString()}' from primitive value`);
            }
            if (!(prop in target)) {
                set(target, { [prop]: editable(undefined) });
            }
            return target[prop];
        }
    });
}

function createProxyArray(observableArray: any[]) {
    return new Proxy(observableArray, {
        get(obj, prop) {
            if (prop === 'push') {
                return (value: any) => obj.push(editable(value));
            }
            return (obj as any)[prop];
        }
    });
}

function createTargetValue<T, TParent = undefined>(data: T, editableParent?: TParent) {
    let val: any;
    if (isEditableObject(data)) {
        val = createProxyObject(observable({}, undefined, { deep: false }));
        Object.keys(data).forEach(key => val[key] = editable(data[key], editableParent));
    } else if (Array.isArray(data)) {
        val = createProxyArray(observable([], undefined, { deep: false }));
        data.forEach(value => val.push(editable(value), editableParent));
    } else {
        val = data;
    }
    return val;
}

const editables = new WeakSet();

export function editable<T, TParent = undefined>(data: T, editableParent?: TParent): Editable<T, TParent> {
    if (editables.has(data as any)) {
        return data as any;
    }

    const editableObj = observable({
        _value: undefined as any,
        get $() {
            return this._value;
        },
        get value(): T {
            if (isEditablePrimitive(this._value)) {
                return this._value;
            }
            if (Array.isArray(this._value)) {
                return this._value.map(item => item.value) as any;
            }
            const value: { [key: string]: any } = {};
            entries(this._value).forEach(([key, proxy]) => {
                value[key] = proxy.value;
            });
            return value as any;
        },
        onChange(value: T) {
            this._value = createTargetValue(value);
            this.isDirty = true;
        },
        isDirty: false,
        _validators: [] as (Validator<T, TParent>[]),
        validators(...validators: Validator<T, TParent>[]) {
            this._validators = validators;
        },
        get hasError(): boolean {
            return this.isDirty
                ? this._validators
                    .map(validator => validator(this.value, editableParent === undefined ? undefined : (editableParent as any).proxyToValue))
                    .some(item => !item)
                : false;
        },
        get proxyToValue() {
            if (isEditablePrimitive(this._value)) {
                return this._value;
            }
            return this._proxyToValue || (this._proxyToValue = new Proxy(this._value, {
                get(target, prop) {
                    return editables.has(target[prop]) ? target[prop].value : target[prop];
                }
            }));
        }
    });

    editableObj._value = createTargetValue(data, editableObj);

    editables.add(editableObj);

    return editableObj as any as Editable<T, TParent>;
}

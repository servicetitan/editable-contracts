import { observable, entries, set } from 'mobx';

type Validator<T, TParent> = TParent extends undefined ? (value: T) => boolean | string : (value: T, form: TParent) => boolean | string;

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

function createTargetValue<T>(data: T) {
    let val: any;
    if (isEditableObject(data)) {
        val = createProxyObject(observable({}, undefined, { deep: false }));
        Object.keys(data).forEach(key => val[key] = editable(data[key]));
    } else if (Array.isArray(data)) {
        val = createProxyArray(observable([], undefined, { deep: false }));
        data.forEach(value => val.push(editable(value)));
    } else {
        val = data;
    }
    return val;
}

const editables = new WeakSet();

export function editable<T, TParent = undefined>(data: T, form?: TParent): Editable<T, TParent> {
    if (editables.has(data as any)) {
        return data as any;
    }

    const editableObj = observable({
        _value: createTargetValue(data),
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
        get hasError(): boolean {
            return this.isDirty ? this._validators.map(validator => validator(this.value, form!)).some(item => !item) : false;
        }
    });

    editables.add(editableObj);

    return editableObj as any as Editable<T, TParent>;
}

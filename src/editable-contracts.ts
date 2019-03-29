import { observable, entries, set } from 'mobx';

type Node<T> = {
    value: T;
    onChange(value: T): void;
};

type DollarType<T> = {
    [P in keyof T]-?: Editable<T[P]>;
};

type CompositeNode<T> = {
    $: NonNullable<T> extends T ? DollarType<T> :
        DollarType<T> | undefined;
} & Node<T>;

type PrimitiveType = string | number | boolean | Date;

export type Editable<T> = NonNullable<T> extends PrimitiveType ? Node<T> : CompositeNode<T>;

function isEditableObject(obj?: any): obj is object & { [key: string]: Node<any> } {
    return !isEditablePrimitive(obj) && !Array.isArray(obj);
}

function isEditablePrimitive(obj?: any) {
    return Object(obj) !== obj || obj instanceof Date;
}

function createTargetValue<T>(data: T) {
    let val: any;
    if (isEditableObject(data)) {
        val = observable({}, undefined, { deep: false });
        Object.keys(data).forEach(key => val[key] = editable(data[key]));
    } else if (Array.isArray(data)) {
        val = observable([], undefined, { deep: false });
        data.forEach(value => val.push(editable(value)));
    } else {
        val = data;
    }
    return val;
}

export function editable<T>(data: T): Editable<T> {
    const target = observable({
        proxyValue: createTargetValue(data),
        get value(): any {
            if (isEditablePrimitive(this.proxyValue)) {
                return this.proxyValue;
            }
            if (Array.isArray(this.proxyValue)) {
                return this.proxyValue.map(item => item.value);
            }
            const value: { [key: string]: any } = {};
            entries(this.proxyValue).forEach(([key, proxy]) => {
                value[key] = proxy.value;
            });
            return value;
        },
        onChange(value: any) {
            this.proxyValue = createTargetValue(value);
        }
    });

    const proxy = new Proxy(target, {
        get(obj, prop) {
            if (typeof prop === 'symbol') {
                return (obj as any)[prop];
            }
            if (prop === '$') {
                return proxy;
            }
            if (prop === 'value') {
                return obj.value;
            }
            if (prop === 'onChange') {
                return obj.onChange;
            }
            if (obj.proxyValue === undefined) {
                throw new Error(`Cannot read property '${prop.toString()}' of undefined`);
            }
            if (isEditablePrimitive(obj.proxyValue)) {
                throw new Error(`Cannot get property '${prop.toString()}' from primitive value`);
            }
            if (!(prop in obj.proxyValue)) {
                set(obj.proxyValue, { [prop]: editable(undefined) });
            }
            return obj.proxyValue[prop];
        }
    }) as any as Editable<T>;
    return proxy;
}

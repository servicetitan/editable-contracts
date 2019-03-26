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

type Editable<T> = NonNullable<T> extends PrimitiveType ? Node<T> : CompositeNode<T>;

function isEditableObject(obj?: any): obj is object & { [key: string]: Node<any> } {
    return !isEditablePrimitive(obj) && !Array.isArray(obj);
}

function isEditablePrimitive(obj?: any) {
    return Object(obj) !== obj || obj instanceof Date;
}

function createTargetValue<T>(data: T) {
    let val: any;
    if (isEditableObject(data)) {
        val = {};
        Object.keys(data).forEach(key => val[key] = editable(data[key]));
    } else if (Array.isArray(data)) {
        val = [];
        data.forEach(value => val.push(editable(value)));
    } else {
        val = data;
    }
    return val;
}

export function editable<T>(data: T): Editable<T> {
    const target: Node<any> = {
        value: createTargetValue(data),
        onChange(value) {
            target.value = createTargetValue(value);
        }
    };

    const proxy = new Proxy(target, {
        get(obj, prop) {
            if (prop === '$') {
                return proxy;
            }
            if (prop === 'value') {
                if (isEditablePrimitive(obj.value)) {
                    return obj.value;
                }
                if (Array.isArray(obj.value)) {
                    return obj.value.map(item => item.value);
                }
                const value: { [key: string]: any } = {};
                Object.keys(obj.value).forEach(key => value[key] = obj.value[key].value);
                return value;
            }
            if (prop === 'onChange') {
                return obj.onChange;
            }
            if (obj.value === undefined) {
                throw new Error(`Cannot read property '${prop.toString()}' of undefined`);
            }
            if (!(prop in obj.value)) {
                obj.value[prop] = editable(undefined);
            }
            return obj.value[prop];
        }
    }) as any as Editable<T>;
    return proxy;
}

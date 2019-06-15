// Tech debt
// 1) Profile memory
// 2) Debug how it works

import { isObservable, entries, observable, IObservableArray, IObservableObject, observe, transaction, reaction } from 'mobx';

type PrimitiveType = string | number | boolean | Date;

// Editor types
type EditorNode<T, TParent> = {
    onChange(value: T): void;
    isDirty: boolean;
    hasError: boolean;
    validators(...validators: ValidatorFunction<T, TParent>[]): void
};

type EditorDollarType<T> = {
    [P in keyof T]-?: Editor<T[P], T>;
};

type EditorCompositeNode<T, TParent> = {
    $: NonNullable<T> extends T ? EditorDollarType<T> :
        EditorDollarType<T> | undefined;
} & EditorNode<T, TParent>;

export type Editor<T, TParent = undefined> = NonNullable<T> extends PrimitiveType ? EditorNode<T, TParent> : EditorCompositeNode<T, TParent>;

// Validator types
type ValidatorFunction<T, TParent> = TParent extends undefined
    ? (value: T) => boolean | string
    : (value: T, parentValue: TParent) => boolean | string;

type ValidatorNode<T, TParent> = {
    validator?: ValidatorFunction<T, TParent>
};

type ValidatorDollarType<T> = {
    [P in keyof T]?: Validator<T[P], T>;
};

type ValidatorCompositeNode<T, TParent> = {
    $?: NonNullable<T> extends T ? ValidatorDollarType<T> :
        ValidatorDollarType<T> | undefined;
} & ValidatorNode<T, TParent>;

export type Validator<T, TParent = undefined> = NonNullable<T> extends PrimitiveType
    ? ValidatorFunction<T, TParent>
    : ValidatorCompositeNode<T, TParent>;

type WithIndex<T> = T & { index: number };

function isPrimitive(obj?: any) {
    return Object(obj) !== obj || obj instanceof Date;
}

function isObject(value: any) {
    return value !== null && typeof value === 'object';
}

// /** @deprecated since v4.0.0 - use `(typeof value !== 'object' && typeof value !== 'function') || value === null` instead. */
// function isPrimitive(object: any): boolean;

function deriveArray<T, TT>(
    array: IObservableArray<T>,
    deriveItem: (item: T, index: number) => WithIndex<TT>,
    updateItem: (item: T, derivative: WithIndex<TT>) => WithIndex<TT>
): WithIndex<TT>[] {
    const derivative: (TT & { index: number })[] = [];
    transaction(() => {
        array.forEach((item, index) => {
            derivative.push(deriveItem(item, index));
        });
    });
    array.observe((changeData) => {
        transaction(() => {
            if (changeData.type === 'update') {
                derivative[changeData.index] = updateItem(changeData.newValue, derivative[changeData.index]);
                return;
            }
            derivative.splice(
                changeData.index,
                changeData.removedCount,
                ...changeData.added.map((item, index) => deriveItem(item, changeData.index + index))
            );
            derivative.forEach((item, index) => {
                item.index = index;
            });
        });
    });
    return derivative;
}

function deriveObject<T>(
    object: IObservableObject,
    deriveItem: (item: any, key: string) => T,
    updateItem: (item: any, derivative: T, key: string) => T
) {
    const derivative = {} as any;
    transaction(() => {
        entries(object).forEach(([key, value]) => {
            derivative[key] = deriveItem(value, key);
        });
    });
    observe(object, (change) => {
        transaction(() => {
            if (change.type === 'add' || change.type === 'update') {
                derivative[change.name] = change.type === 'add' ? deriveItem(change.newValue, change.name) : updateItem(change.newValue, derivative[change.name], change.name);
                return;
            }
            delete derivative[change.name];
        });
    });
    return derivative;
}

export function editor<T extends {} | any[], TParent = undefined>(contract: T, validator?: Validator<T, TParent>): Editor<T, TParent> {
    return editor_(contract, validator);
}

function editor_(contract: any, validator?: any): any {
    if (!isObservable(contract)) {
        throw 'Contract object has to be observable.';
    }

    let contractEditor: any;
    if (Array.isArray(contract)) {
        contractEditor = deriveArray(contract as IObservableArray<any>, (_0, index) => {
            let $cache: any;
            let valueCache: any;
            const node: any = {
                index,
                onChange(value: any) {
                    // TODO: test why removing `this` from index doesn't break tests
                    contract[this.index] = value;
                    this.isDirty = true;
                },
                get $() {
                    if ($cache === undefined || contract[this.index] !== valueCache) {
                        const childValidator = validator && validator.$ ? validator.$[this.index] : undefined;
                        $cache = editor_(contract[this.index], childValidator).$;
                        valueCache = contract[this.index];
                    }
                    return $cache;
                },
                isDirty: false,
                hasError: false,
                _validationDisposer: reaction(() => {
                    const childValidator = validator && validator.$ && validator.$[0] ? validator.$[node.index] : undefined;
                    if (childValidator) {
                        try {
                            return !childValidator(contract[node.index]);
                        }
                        catch(e) {
                            console.log(node.index)
                        }
                    }
                    return false;
                }, (res: boolean) => {
                    node.hasError = res;
                }, { delay: 200 })
            };
            return node;
        }, (_0, derivative) => derivative);
    } else {
        contractEditor = deriveObject(contract, (_0, key) => {
            let $cache: any;
            let valueCache: any;
            const node: any = {
                key,
                onChange(value: any) {
                    contract[key] = value;
                    node.isDirty = true;
                },
                get $() {
                    if ($cache === undefined || contract[key] !== valueCache) {
                        const childValidator = validator && validator.$ ? validator.$[key] : undefined;
                        $cache = editor_(contract[key], childValidator).$;
                        valueCache = contract[key];
                    }
                    return $cache;
                },
                isDirty: false,
                hasError: false,
                // Even though there is a disposer, we are not calling it manually anywhere
                // GC engine is be able to collect reaction as soon as everyhting it is observing can be GC'ed as well
                // this is safe since validators are static functions that are only touching contract observables
                // though someone can access other observables in validator via closure, Lord help them
                // TODO: consider exposing dispose method
                _validationDisposer: reaction(() => {
                    let childValidator = validator && validator.$ ? validator.$[key] : undefined;
                    if (isObject(childValidator)) {
                        childValidator = childValidator.validator;
                    }
                    if (childValidator) {
                        return !childValidator(contract[key]);
                    }
                    return false;
                }, (res: boolean) => {
                    node.hasError = res;
                }, { delay: 200 })
            };
            return node;
        }, (_0, derivative) => derivative);
    }

    // Materialize all nested editors
    Object.entries(contractEditor).forEach(([key]) => {
        if (!isPrimitive(contract[key])) {
            contractEditor[key].$;
        }
    });

    const proxy = new Proxy(contractEditor, {
        get(target, p: any) {
            if (!target.hasOwnProperty(p)) {
                contract[p] = undefined;
            }
            return target[p];
        }
    });

    // TODO: improve Editor type to return object editor without shallow $
    return { $: proxy };
}

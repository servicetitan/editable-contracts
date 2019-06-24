// Tech debt
// 1) Profile memory
// 2) Debug how it works
// 3) Object structure change (array -> object -> array)

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

type WithKey<T> = T & { key: number | string };

interface DeriveFunc {
    (
        object: any,
        deriveItem: (item: any, key: number | string) => any,
        updateItem: (item: any, derivative: any, key: number | string, oldValue?: any, newValue?: any) => any
    ): any
}

function deriveArray<T, TT>(
    array: IObservableArray<T>,
    deriveItem: (item: T, key: number) => WithKey<TT>,
    updateItem: (item: T, derivative: WithKey<TT>, key: number, oldValue?: any, newValue?: any) => WithKey<TT>
): WithKey<TT>[] {
    const derivative: (WithKey<TT>)[] = [];
    transaction(() => {
        array.forEach((item, index) => {
            derivative.push(deriveItem(item, index));
        });
    });
    array.observe((changeData) => {
        transaction(() => {
            if (changeData.type === 'update') {
                derivative[changeData.index] = updateItem(changeData.newValue, derivative[changeData.index], changeData.index, changeData.oldValue, changeData.newValue);
                return;
            }
            derivative.splice(
                changeData.index,
                changeData.removedCount,
                ...changeData.added.map((item, index) => deriveItem(item, changeData.index + index))
            );
            derivative.forEach((item, index) => {
                item.key = index;
            });
        });
    });
    return derivative;
}

function deriveObject<T>(
    object: IObservableObject,
    deriveItem: (item: any, key: string) => T,
    updateItem: (item: any, derivative: T, key: string, oldValue?: any, newValue?: any) => T
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
                derivative[change.name] = change.type === 'add' 
                    ? deriveItem(change.newValue, change.name) 
                    : updateItem(change.newValue, derivative[change.name], change.name, change.oldValue, change.newValue);
                return;
            }
            delete derivative[change.name];
        });
    });
    return derivative;
}

function isPrimitive(obj?: any) {
    return Object(obj) !== obj || obj instanceof Date;
}

function isObject(value: any) {
    return value !== null && typeof value === 'object';
}

function isCompositeNode(value: any) {
    return Array.isArray(value) || isObject(value);
}

export function editor<T extends {} | any[], TParent = undefined>(contract: T, validator?: Validator<T, TParent>): Editor<T, TParent> {
    return editor_(contract, undefined, undefined, validator);
}

function editor_(node: any, parentNodeKey: any, parentNode: any, validator?: any): any {
    if (!isPrimitive(node) && !isObservable(node)) {
        throw 'Contract object/array has to be observable.';
    }

    let $cache: any;
    const editorNode: any = {
        key: parentNodeKey,
        onChange(value: any) {
            if (parentNode === undefined) {
                throw new Error('Can\'t call onChange on contract root.')
            }
            parentNode[editorNode.key] = value;
            editorNode.isDirty = true;
        },
        get $() {
            if ($cache === undefined) {
                const deriveFunc: DeriveFunc = Array.isArray(node) ? deriveArray : deriveObject;
                const derivative = deriveFunc(node, (_0, key) => {
                    const childValidator = validator && validator.$ ? validator.$[editorNode.key] : undefined;
                    return editor_(node[key], key, node, childValidator)
                }, (_0, derivative, key, oldValue, newValue) => {
                    if (isCompositeNode(newValue) || isCompositeNode(oldValue) && isPrimitive(newValue)) {
                        if (derivative._validationDisposer) {
                            // should be recursive for all subnodes of derivative
                            derivative._validationDisposer();
                        }
                        const childValidator = validator && validator.$ ? validator.$[editorNode.key] : undefined;
                        return editor_(node[key], key, node, childValidator)
                    }
                    return derivative;
                });
                $cache = new Proxy(derivative, {
                    get(target, p: any) {
                        if (!target.hasOwnProperty(p)) {
                            node[p] = undefined;
                        }
                        return target[p];
                    }
                });
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
        // dispose should be done automatically for composite nodes when their value changes
        _validationDisposer: reaction(() => {
            // let childValidator = validator && validator.$ ? validator.$[editorNode.key] : undefined;
            // if (isObject(childValidator)) {
            //     childValidator = childValidator.validator;
            // }
            // if (childValidator) {
            //     return !childValidator(node, parentNode);
            // }
            return false;
        }, (res: boolean) => {
            editorNode.hasError = res;
        }, { delay: 200 })
    };

    // Materialize all nested editors
    // Object.entries(contractEditor).forEach(([key]) => {
    //     if (!isPrimitive(contract[key])) {
    //         contractEditor[key].$;
    //     }
    // });

    // TODO: improve Editor type to return object editor without shallow $
    return editorNode;
}

import { isObservable, entries, observable, IObservableArray, IObservableObject, observe, transaction } from 'mobx';

type PrimitiveType = string | number | boolean | Date;

// Editor types
type EditorNode<T, TParent> = {
    onChange(value: T): void;
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

function deriveArray<T, TT>(
    array: IObservableArray<T>,
    deriveItem: (item: T, index: number) => WithIndex<TT>,
    updateItem: (item: T, derivative: WithIndex<TT>) => WithIndex<TT>
): IObservableArray<WithIndex<TT>> {
    const derivative = observable.array<TT & { index: number }>([]);
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
    const derivative = observable.object({} as any);
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
    if (!isObservable(contract)) {
        throw 'Contract object has to be observable.';
    }

    let contractEditor: any;
    if (Array.isArray(contract)) {
        contractEditor = deriveArray(contract as any as IObservableArray<any>, (_0, index) => {
            return {
                index,
                onChange(value: any) {
                    contract[this.index] = value;
                },
                get $() {
                    // TODO: check if caching is not needed
                    return (editor((contract as any as IObservableArray<any>)[this.index]) as any).$;
                }
            };
        },                           (_0, derivative) => derivative);
    } else {
        contractEditor = deriveObject(contract as any as IObservableObject, (_0, key) => {
            return {
                onChange(value: any) {
                    (contract as any)[key] = value;
                },
                get $() {
                    // TODO: check if caching is not needed
                    return (editor((contract as any)[key]) as any).$;
                }
            };
        },                            (_0, derivative) => derivative);
    }

    const proxy = new Proxy(contractEditor, {
        get(target, p: any) {
            if (!target.hasOwnProperty(p)) {
                (contract as any)[p] = undefined;
            }
            return target[p];
        }
    });

    // TODO: improve Editor type to return object editor without shallow $
    return { $: proxy } as any as Editor<T, TParent>;
}

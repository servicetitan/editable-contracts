import { editable } from '../editable-contracts';

test('editable', () => {
    enum InventoryType {
        Furniture,
        Electronics,
        Tools,
        Jewelry
    }
    interface InventoryDto {
        id: number;
        age: number;
        name: string;
        type?: InventoryType | undefined;
        location?: string | undefined;
        count?: number | undefined;
        metadata?: {
            key0: boolean;
            key1?: string | undefined;
            key2?: number | undefined;
            key3?: number[] | undefined;
        };
    }
    const inventoryDto: InventoryDto = {
        id: 1,
        age: 100,
        name: 'ring',
        metadata: {
            key0: false,
            key3: [1, 2, 3]
        }
    };
    const editableInventoryDto = editable(inventoryDto);

    expect(editableInventoryDto.value).toEqual(inventoryDto);

    expect(editableInventoryDto.$.id.value).toBe(1);
    expect(editableInventoryDto.$.location.value).toBe(undefined);
    editableInventoryDto.$.location.onChange('San Diego');
    expect(editableInventoryDto.$.location.value).toBe('San Diego');
    editableInventoryDto.$.metadata.$!.key1.onChange('best choice');
    expect(editableInventoryDto.$.metadata.$!.key1.value).toBe('best choice');

    expect(editableInventoryDto.$.metadata.$!.key3.value).toEqual([1, 2, 3]);
    expect(editableInventoryDto.$.metadata.$!.key3.$![0].value).toBe(1);
    expect(editableInventoryDto.$.metadata.$!.key3.$![2].value).toBe(3);
    editableInventoryDto.$.metadata.$!.key3.$![2].onChange(4);
    expect(editableInventoryDto.$.metadata.$!.key3.$![2].value).toBe(4);

    editableInventoryDto.$.type.onChange(InventoryType.Jewelry);
    expect(editableInventoryDto.$.type.value).toBe(InventoryType.Jewelry);

    const metadata: InventoryDto['metadata'] = {
        key0: true,
        key1: undefined,
        key2: 123,
        key3: [1]
    };
    editableInventoryDto.$.metadata.onChange(metadata);
    expect(editableInventoryDto.$.metadata.value).toEqual(metadata);

    editableInventoryDto.$.metadata.onChange(undefined);
    expect(() => editableInventoryDto.$.metadata.$!.key0).toThrow();
});

/* Type tests */
enum E {
    A, B, C
}

export interface Form {
    Q?: E | undefined;
    W?: number | undefined;
    D?: string[] | undefined;
    V?: (string | undefined)[] | undefined;
    R?: {
        A: number,
        Nested?: {
            B?: string | undefined,
            C?: number[] | undefined,
            D?: {
                A: number;
            }[] | undefined
        } | undefined
    } | undefined;
    F?: {
        A: number,
        Nested?: {
            B?: string | undefined,
            C?: number[] | undefined,
            D?: {
                A: number;
            }[] | undefined
        } | undefined
    }[] | undefined;
    Date: Date;
    Arr: string[];
    Obj: {
        A: number
    };
}

// let form = editable<Form>({
//     Date: new Date(),
//     Arr: [],
//     Obj: {
//         A: 1
//     }
// });

// form.$.F.$!

// form.$.F.$![0].$.A.value
// form.$.R.$!.A.value
// form.$.R.$!.Nested.$!.B.value
// form.$.Date.value
// form.$.F.$![0].$.Nested.$!.C.value
// form.$.F.$![0].$.Nested.$!.D.$![0].$.A.value
// form.$.Q.value
// form.$.D.onChange(['', 'asd'])
// form.$.D.onChange([''])
// form.$.D.onChange(undefined)
// form.$.D.$![0].value
// form.$.V.$![0].value + ''
// form.$.V
// form.$.Arr.$[0].value
// form.$.Obj.$.A.value
// form.$.Obj.onChange({
//     A: 2
// })
// // errors
// form.$.V.$![0].value.toUpperCase
// form.$.W + 1
// form.$.W.value + 1
// // end errors
// form.$.W.value! + 1
// const a = form.$.D.$![0].value
// form.$.R.$!.Nested.$!.B.value

// let form2 = editable<number | undefined>(1);
// form2.value!.toFixed
// // errors
// form2.toFixed()
// form2.value.toFixed
// // end errors

// let form3 = editable<E | undefined>(E.A);
// form3.value
// // errors
// form3.toFixed
// // end errors

// let form4 = editable<Date>(new Date());
// form4.value.getDay

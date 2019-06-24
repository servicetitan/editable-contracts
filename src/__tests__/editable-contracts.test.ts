import { Editor, editor } from '../editable-contracts';
import { observable } from 'mobx';

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
        key4?: {
            id: number
        }[]
    };
}

function editableInventory(): [InventoryDto, Editor<InventoryDto>] {
    const inventoryDto: InventoryDto = observable({
        id: 1,
        age: 100,
        name: 'ring',
        metadata: {
            key0: false,
            key3: [1, 2, 3],
            key4: [{
                id: 1
            }]
        }
    });

    return [inventoryDto, editor(inventoryDto)];
}

describe('Basic editor usages', () => {
    test('Shallow primitive value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.id).toBe(1);
        inventoryDtoEditor.$.id.onChange(2);
        expect(inventoryDto.id).toBe(2);
    });

    test('Undefined value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.type).toBe(undefined);
        inventoryDtoEditor.$.type.onChange(InventoryType.Electronics);
        expect(inventoryDto.type).toBe(InventoryType.Electronics);
    });

    test('Deep primitive value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.metadata!.key0).toBe(false);
        inventoryDtoEditor.$.metadata.$!.key0.onChange(true);
        expect(inventoryDto.metadata!.key0).toBe(true);
    });

    test('Deep primitive undefined value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.metadata!.key1).toBe(undefined);
        inventoryDtoEditor.$.metadata.$!.key1.onChange('');
        expect(inventoryDto.metadata!.key1).toBe('');
    });

    test('Object value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDtoEditor.$.metadata.onChange({
            key0: true
        });
        expect(inventoryDto.metadata!.key0).toBe(true);
        inventoryDtoEditor.$.metadata.$!.key0.onChange(false);
        expect(inventoryDto.metadata!.key0).toBe(false);
    });

    test('Object value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDtoEditor.$.metadata.onChange({
            key0: true
        });
        expect(inventoryDto.metadata!.key0).toBe(true);
        inventoryDtoEditor.$.metadata.$!.key0.onChange(false);
        expect(inventoryDto.metadata!.key0).toBe(false);
    });

    test('Array element value change', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.metadata!.key4![0]).toEqual({
            id: 1
        });
        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 2
        });
        expect(inventoryDto.metadata!.key4![0]).toEqual({
            id: 2
        });
    });

    test('onChange undefined nested value to throw', () => {
        const [, editableInventoryDto] = editableInventory();

        editableInventoryDto.$.metadata.onChange(undefined);
        expect(() => editableInventoryDto.$.metadata.$!.key0).toThrow();
    });
});

describe('DTO editing doesn\'t break editor', () => {
    test('Edit primitive value', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.id).toBe(1);
        inventoryDto.id = 2;
        expect(inventoryDto.id).toBe(2);
        inventoryDtoEditor.$.id.onChange(1);
        expect(inventoryDto.id).toBe(1);
    });

    test('Edit object value', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDto.metadata = {
            key0: true
        };
        inventoryDtoEditor.$.metadata.$!.key0.onChange(false);
        expect(inventoryDto.metadata.key0).toBe(false);

        inventoryDtoEditor.$.metadata.$!.key1.onChange('');
        expect(inventoryDto.metadata.key1).toBe('');
    });

    test('Edit array value', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDto.metadata!.key4![0] = {
            id: 2
        };
        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 1
        });
        expect(inventoryDto.metadata!.key4![0]).toEqual({
            id: 1
        });
    });

    test('Edit array undefined value', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        expect(inventoryDto.metadata!.key4![1]).toEqual(undefined);
        inventoryDto.metadata!.key4![1] = {
            id: 2
        };
        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 1
        });
        expect(inventoryDto.metadata!.key4![1]).toEqual({
            id: 1
        });
    });

    test('Edit array manipulations. Push.', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDto.metadata!.key4!.push({
            id: 2
        });
        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 1
        });
        expect(inventoryDto.metadata!.key4![1]).toEqual({
            id: 1
        });
    });

    test('Edit array manipulations. Unshift.', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 99
        });

        inventoryDto.metadata!.key4!.unshift({
            id: 2
        });

        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 1
        });
        expect(inventoryDto.metadata!.key4![0]).toEqual({
            id: 1
        });

        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 4
        });
        expect(inventoryDto.metadata!.key4![1]).toEqual({
            id: 4
        });
    });

    test('Edit array manipulations. Splice.', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDto.metadata!.key4!.splice(0, 0, {
            id: 7
        }, {
            id: 8
        }, {
            id: 9
        });

        expect(inventoryDto.metadata!.key4!.map(item => item.id)).toMatchSnapshot();

        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 1
        });
        inventoryDtoEditor.$.metadata.$!.key4.$![3].onChange({
            id: 6
        });
        expect(inventoryDto.metadata!.key4!.map(item => item.id)).toMatchSnapshot();

        inventoryDto.metadata!.key4!.splice(2, 1);

        inventoryDtoEditor.$.metadata.$!.key4.$![2].onChange({
            id: 10
        });
        expect(inventoryDto.metadata!.key4!.map(item => item.id)).toMatchSnapshot();
    });

    test('Edit array manipulations. Replace.', () => {
        const [inventoryDto, inventoryDtoEditor] = editableInventory();

        inventoryDto.metadata!.key4!.push({ id: 5 });
        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 10
        });
        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 11
        });

        expect(inventoryDto.metadata!.key4!.map(item => item.id)).toMatchSnapshot();

        inventoryDto.metadata!.key4 = [9, 8, 7].map(item => ({ id: item }));

        inventoryDtoEditor.$.metadata.$!.key4.$![1].onChange({
            id: 10
        });
        inventoryDtoEditor.$.metadata.$!.key4.$![0].onChange({
            id: 11
        });

        expect(inventoryDto.metadata!.key4!.map(item => item.id)).toMatchSnapshot();
    });
});

describe('Validation', () => {
    jest.useFakeTimers();

    test('Field validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(inventoryDto, {
            $: {
                age: age => age < 21 && '21+ only'
            }
        });

        jest.runAllTimers();
        // expect(editableInventoryDto.hasError).toBe(false);
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);

        inventoryDtoEditor.$.age.onChange(15);
        //inventoryDtoEditor.$.metadata.$!.key0.onChange(true);
        jest.runAllTimers();
        // expect(editableInventoryDto.hasError).toBe(true);
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);

        inventoryDto.age = 25;
        jest.runAllTimers();
        // expect(editableInventoryDto.hasError).toBe(false);
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);
    });

    test('Nested field validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(inventoryDto, {
            $: {
                metadata: {
                    $: {
                        key0: value => value === false && 'Value should be true',
                    }
                }
            }
        });

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(true);

        inventoryDtoEditor.$.metadata.$!.key0.onChange(true);
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(false);

        inventoryDto.metadata!.key0 = false;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(true);
    });

    test('Nested array validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(inventoryDto, {
            $: {
                metadata: {
                    $: {
                        key3: {
                            $: [value => value % 2 === 1 && 'Value should be even']
                        }
                    }
                }
            }
        });
        

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![0].hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![1].hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![2].hasError).toBe(true);

        inventoryDto.metadata!.key3![0] = 0;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![0].hasError).toBe(false);

        inventoryDto.metadata!.key3![3] = 3;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![3].hasError).toBe(true);

        inventoryDto.metadata!.key3![3] = 4;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![3].hasError).toBe(false);

        inventoryDto.metadata!.key3!.push(7);
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.$![4].hasError).toBe(true);
    });

    test('Nested array validation with object values', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(inventoryDto, {
            $: {
                metadata: {
                    $: {
                        key4: {
                            $: [{
                                validator: value => value.id % 2 === 1 && 'Value should be even',
                                $: {
                                    id: value => value % 2 === 1 && 'Value should be even'
                                }
                            }]
                        }
                    }
                }
            }
        });

        inventoryDto.metadata!.key4 = [{ id: 1 }, { id: 2 }, { id: 3 }]

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![0].hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![1].hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![2].hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![0].$.id.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![1].$.id.hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![2].$.id.hasError).toBe(true);

        inventoryDto.metadata!.key4![0] = { id: 0 };
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![0].hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![0].$.id.hasError).toBe(false);

        inventoryDto.metadata!.key4![3] = { id: 3 };
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![3].hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![3].$.id.hasError).toBe(true);

        inventoryDto.metadata!.key4![3] = { id: 4 };
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![3].hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![3].$.id.hasError).toBe(false);

        inventoryDto.metadata!.key4!.push({ id: 7 });
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![4].hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.$!.key4.$![4].$.id.hasError).toBe(true);
    });
});

// import { editable, Editor } from '../editable-contracts';
// import { autorun } from 'mobx';

// enum InventoryType {
//     Furniture,
//     Electronics,
//     Tools,
//     Jewelry
// }
// interface InventoryDto {
//     id: number;
//     age: number;
//     name: string;
//     type?: InventoryType | undefined;
//     location?: string | undefined;
//     count?: number | undefined;
//     metadata?: {
//         key0: boolean;
//         key1?: string | undefined;
//         key2?: number | undefined;
//         key3?: number[] | undefined;
//         key4?: {
//             id: number
//         }[]
//     };
// }

// function editableInventory(): [InventoryDto, Editor<InventoryDto>] {
//     const inventoryDto: InventoryDto = {
//         id: 1,
//         age: 100,
//         name: 'ring',
//         metadata: {
//             key0: false,
//             key3: [1, 2, 3],
//             key4: [{
//                 id: 1
//             }]
//         }
//     };
//     return [inventoryDto, editable(inventoryDto)];
// }

// describe('Basic', () => {
//     test('Primitive values', () => {
//         const [, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.id.value).toBe(1);
//         expect(editableInventoryDto.$.location.value).toBe(undefined);
//         expect(editableInventoryDto.$.metadata.$!.key3.$![0].value).toBe(1);
//     });

//     test('Nested array value', () => {
//         const [, editableInventoryDto] = editableInventory();
//         expect(editableInventoryDto.$.metadata.$!.key3.value).toEqual([1, 2, 3]);
//         expect(editableInventoryDto.$.metadata.$!.key4.value![0]).toEqual({
//             id: 1
//         });
//         expect(editableInventoryDto.$.metadata.$!.key4.$![0].value).toEqual({
//             id: 1
//         });
//     });

//     test('Form value', () => {
//         const [inventoryDto, editableInventoryDto] = editableInventory();
//         expect(editableInventoryDto.value).toEqual(inventoryDto);
//     });

//     test('onChange individual values', () => {
//         const [, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.id.value).toBe(1);
//         editableInventoryDto.$.id.onChange(2);
//         expect(editableInventoryDto.$.id.value).toBe(2);

//         expect(editableInventoryDto.$.location.value).toBe(undefined);
//         editableInventoryDto.$.location.onChange('San Diego');
//         expect(editableInventoryDto.$.location.value).toBe('San Diego');

//         editableInventoryDto.$.metadata.$!.key1.onChange(undefined);
//         editableInventoryDto.$.metadata.$!.key1.onChange('best choice');
//         expect(editableInventoryDto.$.metadata.$!.key1.value).toBe('best choice');
//     });

//     test('onChange & nested array values', () => {
//         const [, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.metadata.$!.key3.$![2].value).toBe(3);
//         editableInventoryDto.$.metadata.$!.key3.$![2].onChange(4);
//         expect(editableInventoryDto.$.metadata.$!.key3.$![2].value).toBe(4);
//     });

//     test('onChange & enum value', () => {
//         const [, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.type.value).toBe(undefined);
//         editableInventoryDto.$.type.onChange(InventoryType.Jewelry);
//         expect(editableInventoryDto.$.type.value).toBe(InventoryType.Jewelry);
//     });

//     test('onChange object', () => {
//         const [inventoryDto, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.metadata.value).toEqual(inventoryDto.metadata);
//         const metadata: InventoryDto['metadata'] = {
//             key0: true,
//             key1: undefined,
//             key2: 123,
//             key3: [1]
//         };
//         editableInventoryDto.$.metadata.onChange(metadata);
//         expect(editableInventoryDto.$.metadata.value).toEqual(metadata);
//     });

//     test('onChange array', () => {
//         const [, editableInventoryDto] = editableInventory();

//         expect(editableInventoryDto.$.metadata.$!.key3.value).toEqual([1, 2, 3]);
//         editableInventoryDto.$.metadata.$!.key3.onChange([]);
//         expect(editableInventoryDto.$.metadata.$!.key3.value).toEqual([]);
//     });

//     test('onChange undefined nested value to throw', () => {
//         const [, editableInventoryDto] = editableInventory();

//         editableInventoryDto.$.metadata.onChange(undefined);
//         expect(() => editableInventoryDto.$.metadata.$!.key0).toThrow();
//     });
// });

// describe('Validation', () => {
//     test('Field validation', () => {
//         const [, editableInventoryDto] = editableInventory();
//         editableInventoryDto.$.age.validators(age => age >= 21 && '21+ only');
//         // expect(editableInventoryDto.hasError).toBe(false);
//         expect(editableInventoryDto.$.age.hasError).toBe(false);

//         editableInventoryDto.$.age.onChange(15);
//         // expect(editableInventoryDto.hasError).toBe(true);
//         expect(editableInventoryDto.$.age.hasError).toBe(true);

//         editableInventoryDto.$.age.onChange(25);
//         // expect(editableInventoryDto.hasError).toBe(false);
//         expect(editableInventoryDto.$.age.hasError).toBe(false);
//     });

//     test('Field validation with parent', () => {
//         const [, editableInventoryDto] = editableInventory();
//         editableInventoryDto.$.age.validators((age, dto) => dto.name === 'beer' ? age >= 21 && '21+ only' : age >= 5 && 'Not for kids');
//         expect(editableInventoryDto.$.age.hasError).toBe(false);

//         editableInventoryDto.$.age.onChange(15);
//         expect(editableInventoryDto.$.age.hasError).toBe(false);
//         editableInventoryDto.$.name.onChange('beer');
//         expect(editableInventoryDto.$.age.hasError).toBe(true);

//         editableInventoryDto.$.age.onChange(25);
//         expect(editableInventoryDto.$.age.hasError).toBe(false);

//         editableInventoryDto.$.age.onChange(15);
//         expect(editableInventoryDto.$.age.hasError).toBe(true);
//         editableInventoryDto.$.name.onChange('Pepsi');
//         expect(editableInventoryDto.$.age.hasError).toBe(false);

//         editableInventoryDto.$.age.onChange(4);
//         expect(editableInventoryDto.$.age.hasError).toBe(true);
//     });

//     test('Parent validation only tracks observed values', () => {
//         const [, editableInventoryDto] = editableInventory();
//         const validator = jest.fn((age: number, dto: InventoryDto) => dto.name === 'beer' ? age >= 21 && '21+ only' : age >= 5 && 'Not for kids');
//         editableInventoryDto.$.age.validators(validator);

//         // Simulate UI subscription
//         autorun(() => {
//             editableInventoryDto.$.age.hasError;
//         });

//         editableInventoryDto.$.age.onChange(2);
//         editableInventoryDto.$.name.onChange('Coca cola');
//         editableInventoryDto.$.location.onChange('LA');

//         expect(validator).toHaveBeenCalledTimes(2);
//     });
// });

// /* Type tests */
// enum E {
//     A, B, C
// }

// export interface Form {
//     Q?: E | undefined;
//     W?: number | undefined;
//     D?: string[] | undefined;
//     V?: (string | undefined)[] | undefined;
//     R?: {
//         A: number,
//         Nested?: {
//             B?: string | undefined,
//             C?: number[] | undefined,
//             D?: {
//                 A: number;
//             }[] | undefined
//         } | undefined
//     } | undefined;
//     F?: {
//         A: number,
//         Nested?: {
//             B?: string | undefined,
//             C?: number[] | undefined,
//             D?: {
//                 A: number;
//             }[] | undefined
//         } | undefined
//     }[] | undefined;
//     Date: Date;
//     Arr: string[];
//     Obj: {
//         A: number
//     };
// }

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
// form.$.F.$![0].$.Nested.$!.D.$!.push(editable({ A: 1 }));
// form.$.F.$![0].$.Nested.$!.D.$!.push({ A: 1 });
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
// form.$.D.$!.push('')
// form.$.Arr.$.push('')
// // errors
// form.$.V.$![0].value.toUpperCase
// form.$.W + 1
// form.$.W.value + 1
// form.$.D.$.push('')
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

// form.validators((form) => form.Date !== undefined)
// form.$.Obj.$.A.validators((a, b) => {
//     a
//     b.A
//     return true;
// })
// form.$.R.validators((r, parent) => {
//     r!.A

//     parent.Arr
//     return true;
// })
// form.$.R.$!.Nested.$!.B.validators((a, b) => {
//     b.$.B
//     return true;
// })
// form.validators((a) => {
//     return true;
// })
// // errors
// form.validators((a, b) => {
//     return true;
// })
// // end errors

import { Editor, editor } from '../editable-contracts';
import { observable, autorun } from 'mobx';

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

        inventoryDto.metadata!.key4!.splice(
            0,
            0,
            {
                id: 7
            },
            {
                id: 8
            },
            {
                id: 9
            }
        );

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
        },                                {
            validateImmediately: true
        });

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);

        inventoryDtoEditor.$.age.onChange(15);
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);

        inventoryDto.age = 25;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);
    });

    test('Nested field validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(inventoryDto, {
            $: {
                metadata: {
                    $: {
                        key0: value => !value && 'Value should be true',
                    }
                }
            }
        },                                {
            validateImmediately: true
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
        },                                {
            validateImmediately: true
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
        },                                {
            validateImmediately: true
        });

        inventoryDto.metadata!.key4 = [{ id: 1 }, { id: 2 }, { id: 3 }];

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

    test('Cross field validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                $: {
                    age: (age, parent) => {
                        if (age < 21 && parent.name === 'Alcohol') {
                            return '21+ only';
                        }
                        if (age < 10 && parent.name === 'Sweets') {
                            return 'Ask you parents';
                        }
                        return false;
                    }
                }
            },
            {
                validateImmediately: true
            }
        );

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);

        inventoryDto.age = 18;

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);

        inventoryDto.name = 'Alcohol';

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);

        inventoryDto.name = 'Sweets';

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);

        inventoryDto.age = 7;

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);
    });

    test('Object level validation', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                validator: (dto) => {
                    if (dto.age < 21 && dto.name === 'Alcohol') {
                        return '21+ only';
                    }
                    if (dto.age < 10 && dto.name === 'Sweets') {
                        return 'Ask you parents';
                    }
                    return false;
                }
            },
            {
                validateImmediately: true
            }
        );

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(false);

        inventoryDto.age = 18;

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(false);

        inventoryDto.name = 'Alcohol';

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(true);

        inventoryDto.name = 'Sweets';

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(false);

        inventoryDto.age = 7;

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(true);
    });

    test('Parent validation only tracks observed values', () => {
        const [inventoryDto] = editableInventory();

        const validator = jest.fn((age: number, dto: InventoryDto) => dto.name === 'beer' ? age >= 21 && '21+ only' : age >= 5 && 'Not for kids');
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                $: {
                    age: validator
                }
            },
            {
                validateImmediately: true
            }
        );

        // Simulate UI subscription
        autorun(() => {
            inventoryDtoEditor.$.age.hasError;
        });

        inventoryDtoEditor.$.age.onChange(2);
        inventoryDtoEditor.$.name.onChange('Coca cola');
        inventoryDtoEditor.$.location.onChange('LA');

        jest.runAllTimers();
        expect(validator).toHaveBeenCalledTimes(2);
    });

    test('Parent object hasError depends on children', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                $: {
                    age: age => age < 21 && '21+ only'
                }
            },
            {
                validateImmediately: true
            }
        );

        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(false);
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);

        inventoryDtoEditor.$.age.onChange(15);
        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(true);
        expect(inventoryDtoEditor.$.age.hasError).toBe(true);

        inventoryDto.age = 25;
        jest.runAllTimers();
        expect(inventoryDtoEditor.hasError).toBe(false);
        expect(inventoryDtoEditor.$.age.hasError).toBe(false);
    });

    test('Parent object hasError depends on children. Deep object.', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                $: {
                    metadata: {
                        $: {
                            key0: value => !value && 'Value should be true',
                        }
                    }
                }
            },
            {
                validateImmediately: true
            }
        );

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(true);
        expect(inventoryDtoEditor.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(true);

        inventoryDtoEditor.$.metadata.$!.key0.onChange(true);
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(false);
        expect(inventoryDtoEditor.hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(false);

        inventoryDto.metadata!.key0 = false;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key0.hasError).toBe(true);
        expect(inventoryDtoEditor.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(true);
    });

    test('Parent object hasError depends on children. Deep array.', () => {
        const [inventoryDto] = editableInventory();
        const inventoryDtoEditor = editor(
            inventoryDto,
            {
                $: {
                    metadata: {
                        $: {
                            key3: {
                                $: [value => value % 2 === 1 && 'Value should be even']
                            }
                        }
                    }
                }
            },
            {
                validateImmediately: true
            }
        );

        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(true);

        inventoryDto.metadata!.key3![0] = 0;
        inventoryDto.metadata!.key3![2] = 0;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(false);

        inventoryDto.metadata!.key3![3] = 3;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(true);

        inventoryDto.metadata!.key3![3] = 4;
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.hasError).toBe(false);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(false);

        inventoryDto.metadata!.key3!.push(7);
        jest.runAllTimers();
        expect(inventoryDtoEditor.$.metadata.$!.key3.hasError).toBe(true);
        expect(inventoryDtoEditor.$.metadata.hasError).toBe(true);
    });
});

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

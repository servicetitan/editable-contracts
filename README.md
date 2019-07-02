# editable-contracts
[![npm version](https://badge.fury.io/js/editable-contracts.svg)](https://badge.fury.io/js/editable-contracts)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Build Status](https://travis-ci.org/servicetitan/editable-contracts.svg?branch=master)](https://travis-ci.org/servicetitan/editable-contracts) [![Coverage Status](https://coveralls.io/repos/github/servicetitan/editable-contracts/badge.svg?branch=master)](https://coveralls.io/github/servicetitan/editable-contracts?branch=master)

Another React form state management library, but so simple it doesn't exist.

Editing DTO in React controlled form typically requires:
1) Mapping individual values from DTO to React form components such as inputs, dropdowns, radio buttons, etc..
2) Creating and providing `onChange` and `onBlur` handlers to React components to update DTO state
3) Validating DTO before it can be submitted back to the server
4) Subscribing React components on changes in DTO state to update UI

**editable-contracts**' purpose is to reduce amount of boilerplate code needed to build controlled React forms without compromising typesafety while adding almost zero additional abstractions on top of existing DTO <--> UI mapping chain. Essentially it takes DTO and derives an editor object of the same shape but loaded with all you need for React form state management and validation.

Enough said, example:
```TSX
interface User {
    id: number;
    name?: string;
    role?: string;
}

const user: User = {
    id: 1,
    name: 'Mark'
};

const userEditor = editor(user);

const Form: React.FC = observer(() => (
    <form>
        <label>Name</label>
        <input value={user.name} onChange={userEditor.$.name.onChange} />
        <label>Role</label>
        <input value={user.role} onChange={userEditor.$.role.onChange} />
    </form>
));
```

Example with validation and Anvil design system ([Codesandbox Demo](https://codesandbox.io/s/nice-hertz-v20wom70)):
```TSX
const contract = observable<{
  id: number;
  name: string;
  age: string;
  email?: string;
  role?: string;
  garage?: string[];
}>({
  id: 1,
  name: "Jack",
  age: "20"
});

const contractEditor = editor(contract, {
  $: {
    name: (value: string) => value === "Max" && "Max is already occupied",
    age: (value: string) => !/^\d*$/.test(value) && "Only digits allowed",
    garage: {
      $: [(value: string) => value.includes("Harley") && "Only cars allowed"]
    }
  }
});

const App = observer(() => {
  return (
    <Form>
      <Input
        label="Name"
        {...inputBinding(contract.name, contractEditor.$.name)}
      />
      <Input
        label="Age"
        {...inputBinding(contract.age, contractEditor.$.age)}
      />
      <Input
        label="Email"
        {...inputBinding(contract.email, contractEditor.$.email)}
      />
      <Input
        label="Role"
        {...inputBinding(contract.role, contractEditor.$.role)}
      />
      <Button
        onClick={() => {
          if (!contract.garage) {
            contract.garage = [];
          }
          contract.garage.push("");
        }}
        disabled={contract.garage && contract.garage.length >= 3}
      >
        Add Car to Garage
      </Button>
      <div>
        {contract.garage &&
          contract.garage.map((_0, index) => (
            <Input
              key={`car_${index}`}
              label={"Car " + (index + 1)}
              {...inputBinding(
                contract.garage![index],
                contractEditor.$.garage.$![index]
              )}
            />
          ))}
      </div>
    </Form>
  );
});
```

## Why editable-contracts?
TBD
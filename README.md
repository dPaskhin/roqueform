# Roqueform&ensp;🧀&ensp;[![build](https://github.com/smikhalevski/roqueform/actions/workflows/master.yml/badge.svg?branch=master&event=push)](https://github.com/smikhalevski/Roqueform/actions/workflows/master.yml)

Form state management library that can handle hundreds of fields without breaking a sweat.

- Extremely fast, re-renders only updated fields;
- Laconic API with strict typings;
- [Built-in extensibility mechanisms](#enhancers);
- [Just 1 kB gzipped](https://bundlephobia.com/result?p=roqueform);
- [Optional validation error management mechanism](#validation-errors).

```sh
npm install --save-prod roqueform
```

# Motivation

Here are the requirements I wanted the management solution to satisfy:

- Everything should be strictly typed ut to the very field value setter, so the string value from the silly input would
  be set to the number-typed value in the form value object.

- There should be no restrictions on how and when the input is submitted, because data submission is generally
  an application-specific process.

- There are many approaches to validation, and a great number of awesome validation libraries. The form library must
  be agnostic to where (client-side, server-side, or both), how (on field or on form level), and when (sync, or async)
  the validation is handled.

- Validation errors aren't standardized, so an arbitrary error object shape must be allowed and related typings must be
  seamlessly propagated to the error consumers/renderers.

- No excessive re-renders of unchanged fields.

# Walkthrough

Form lifecycle consists of four separate phases: Input, Validate, Display Errors, and Submit. These phases can be
represented as non-intersecting black boxes. The result obtained during one phase may be used as an input for another
phase:

- The user inputs form values;
- The input is validated;
- Validation errors are displayed;
- Input is submitted;
- Errors received from the backend are displayed.

Phases are non-intersecting, can happen in different order, or even in parallel as with async validation.

Roqueform provides a robust API for the input state management and a flexible [Enhancers](#enhancers) to extend the
functionality.

## `useField`

The central piece of Roqueform is a `useField` hook that returns a `Field` object that represents a node in a tree of
form input controllers:

```ts
import {useField} from 'roqueform';

const unconstrainedField = useField();
// → Field<any, {}>
```

You can provide an initial value to a field:

```ts
const field = useField({foo: 'bar'});
// → Field<{ foo: string }, {}>
```

You can derive new fields from the existing one using `at` method:

```ts
const fooField = field.at('foo');
// → Field<string, {}>
```

`fooField` is a derived field, it is linked to the parent `field`. Fields returned by the `at` method have a stable
identity, so you can invoke `at` with the same key multiple times and the same field instance would be returned:

```ts
field.at('foo') === field.at('foo') // → true
```

Fields can be derived at any depth:

```ts
const field = useField({foo: [{bar: 'qux'}]});

field.at('foo').at(0).at('bar');
// → Field<string, {}>
```

### Field value updates

The field is essentially a container that encapsulates the value and provides methods to update it. Let's have a look at
the `dispatchValue` method that updates the field value:

```ts
const field = useField({foo: 'bar'});

field.value // → {foo: 'bar'}

field.dispatchValue({foo: 'qux'});

// The field value was updated
field.value // → {foo: 'qux'}
```

`useField` doesn't trigger re-render of the enclosing component. Have a look at
[Field observability](#field-observability) section for more details.

When parent field is updated using `dispatchValue`, all of affected derived fields also receive an update:

```ts
const field = useField({foo: 'bar'});
const fooField = field.at('foo');

field.value    // → {foo: 'bar'}
fooField.value // → 'bar'

// Updating the root field
field.dispatchValue({foo: 'qux'});

// The update was propagated to the derived field
field.value    // → {foo: 'qux'}
fooField.value // → 'qux'
```

The same is valid for updating derived fields: when derived field is updated using `dispatchValue`, the update is
propagated to the parent field.

```ts
const field = useField({foo: 'bar'});
const fooField = field.at('foo');

// Updating the derived field
fooField.dispatchValue('qux');

// The update was propagated to the parent field
field.value    // → {foo: 'qux'}
fooField.value // → 'qux'
```

`dispatchValue` has a callback signature:

```ts
fooField.dispatchValue((prevValue) => 'qux');
```

### Transient updates

The field update can be done in a transient fashion, so the parent won't be notified. You can think about this as a
commit in git: you first stage your changes with `git add` and then commit them with `git commit`.

To achieve this behavior we're going to use `setValue`/`dispatch` instead of `dispatchValue` that we discussed in
[Field value updates](#field-value-updates) section:

```ts
const field = useField({foo: 'bar'});
const fooField = field.at('foo');

// Set the transient value, "git add"
fooField.setValue('qux');

// Notice that fooField was updated but field wasn't
field.value    // → {foo: 'bar'}
fooField.value // → 'qux'

// Notify the parent, "git commit"
fooField.dispatch();

// Now both fields are in sync
field.value    // → {foo: 'qux'}
fooField.value // → 'qux'
```

`setValue` can be called multiple times, but the most recent update would be propagated to parent only after
`dispatch`/`dispatchValue` call.

You can check that the field has a transient value using `transient` property:

```ts
const field = useField({foo: 'bar'});
const fooField = field.at('foo');

fooField.setValue('qux');

fooField.transient // → true

fooField.dispatch();

fooField.transient // → false
```

### Field observability

Fields are observable, you can subscribe to them and receive a callback whenever the field state is updated:

```ts
field.subscribe((targetField) => {
  // Handle the update here
});
```

`targetField` is a field that initiated the update, so this can be `field` itself, any of its derived fields, or any of
its ancestors (if `field` is also a derived field).

You can use subscriptions to force re-render your component, but this is strongly discouraged since it make your code
more imperative:

```ts
import {useEffect} from 'react';
import {useRerender} from 'react-hookers';
import {useField} from 'roqueform';

const rerender = useRerender();

const field = useField({foo: 'bar'});

useEffect(() => field.subscribe(rerender), []);
```

## `Field`

The `Field` component subscribes to the given field instance and re-renders its children when the field is updated:

```tsx
import {Field, useField} from 'roqueform';

const App = () => {
  const rootField = useField('foo');

  return (
      <Field field={rootField}>
        {(rootField) => (
            <input
                value={rootField.value}
                onChange={(event) => {
                  rootField.dispatchValue(event.target.value);
                }}
            />
        )}
      </Field>
  );
};
```

Now, when user would update the input value, the `rootField` would be updated. The single argument passed to `children`
render function is the field passed as a `field` prop to the `Field` component.

It is unlikely that you would use form with a single literal field. Most of the time multiple derived fields are
required:

```tsx
const App = () => {
  const rootField = useField({foo: 'bar', baz: 123});

  return <>
    <Field field={rootField.at('foo')}>
      {(fooField) => (
          <input
              type="text"
              value={fooField.value}
              onChange={(event) => {
                fooField.dispatchValue(event.target.value);
              }}
          />
      )}
    </Field>

    <Field field={rootField.at('bar')}>
      {(barField) => (
          <input
              type="number"
              value={barField.value}
              onChange={(event) => {
                barField.dispatchValue(event.target.valueAsNumber);
              }}
          />
      )}
    </Field>
  </>;
};
```

You may have noticed that even we didn't specify any types yet, but our fields are strictly typed. You can check this
by replacing the value dispatched to `barField`. This would cause TypeScript to show an error that `barField` value
must be of a number type.

```diff
- barField.dispatchValue(event.target.valueAsNumber);
+ barField.dispatchValue(event.target.value);
```

## Eager and lazy

By default, `Form` component re-renders only when the provided field was updated directly, so updates from ancestors or
derived fields would be ignored. This reflects to the lazy nature at the heart of Roqueform.

Let's consider the form with two `Field` elementss. One of them renders the value of the root field and the other one
updates the derived field:

```tsx
const App = () => {
  const rootField = useField({foo: 'bar'});

  return <>
    <Field field={rootField}>
      {(rootField) => JSON.stringify(rootField.value)}
    </Field>

    <Field field={rootField.at('foo')}>
      {(fooField) => (
          <input
              type="text"
              value={fooField.value}
              onChange={(event) => {
                fooField.dispatchValue(event.target.value);
              }}
          />
      )}
    </Field>
  </>;
};
```

You might expect that both `Field` elements would rerender when `fooField` is updated. But the `Field` that renders the
`rootField.value` won't update unless you add the `eagerlyUpdated` property.

```diff
- <Field field={rootField}>
+ <Field
      field={rootField}
      eagerlyUpdated={true}
  >
    {(rootField) => JSON.stringify(rootField.value)}
  </Field>
```

`eagerlyUpdated` forces `Field` to re-render whenever a `field` listener is notified.

# Enhancers

Enhancers are very powerful mechanism that allows enriching fields with custom functionality.

Let's enhance the field with the `ref` property that would hold the `RefObject`:

```ts
import {createRef} from 'react';
import {useField} from 'roqueform';

const rootField = useField(
    {foo: 'bar'},

    (field) => Object.assign(field, {ref: createRef<HTMLInputElement>()})
);
// → Field<{ foo: string }, { ref: RefObject<HTMLInputElement> }> & { ref: RefObject<HTMLInputElement> }
```

The second argument of the `useField` hook is the enhancer function that accepts a field instance and enriches it with
the new functionality. In our case it adds the `ref` to each field derived from the `rootField` and to the `rootField`
itself.

```tsx
<Field field={rootField.at('bar')}>
  {(barField) => (
      <input
          ref={barField.ref} // Notice the ref here
          value={barField.value}
          onChange={(event) => {
            barField.dispatchValue(event.target.value);
          }}
      />
  )}
</Field>
```

After the `Field` mounts we can use ref to imperatively scroll the input element into view:

```ts
rootField.at('bar').ref.current?.scrollIntoView();
```


# Accessors

# Error

# Validation errors

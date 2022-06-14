import {EffectCallback, useRef} from 'react';
import {useEffectOnce, useRerender} from 'react-hookers';
import {Accessor, FormObject} from './FormObject';
import {PropertyKey, Narrowed, ObjectPath, ValueAtKey, ValueAtPath} from './hook-types';
import {KeysAccessor} from './KeysAccessor';

export function useFormObject<U>(upstream: FormObject<any, U>): FormObject<U, U>;

export function useFormObject<U, K extends PropertyKey<U> & keyof any>(upstream: FormObject<any, U>, key: Narrowed<K>, transient?: boolean): FormObject<U, ValueAtKey<U, K>>;

export function useFormObject<U, P extends ObjectPath<U> & unknown[]>(upstream: FormObject<any, U>, path: Narrowed<P>, transient?: boolean): FormObject<U, ValueAtPath<U, P>>;

export function useFormObject<U, V>(upstream: FormObject<any, U>, accessor: Accessor<U, V>, transient?: boolean): FormObject<U, V>;

export function useFormObject<U, V>(upstream: FormObject<any, U> | undefined, accessor: Accessor<U | undefined, V>, transient?: boolean): FormObject<U | undefined, V>;

export function useFormObject<V>(initialValue: V | (() => V)): FormObject<any, V>;

export function useFormObject<V>(initialValue?: V | (() => V)): FormObject<any, V | undefined>;

export function useFormObject(upstream?: any, accessor?: any, transient?: boolean): FormObject<any> {

  const rerender = useRerender();
  const manager = useRef<ReturnType<typeof createFormObjectManager>>().current ||= createFormObjectManager(rerender, upstream, accessor, transient);

  useEffectOnce(manager.__effect);

  return manager.__formObject;
}

function createFormObjectManager(listener: () => void, upstream: unknown, accessorLike: Accessor<any, any> | keyof any | any[], transient?: boolean) {

  let __formObject: FormObject<any>;

  if (upstream instanceof FormObject) {
    const accessor = Array.isArray(accessorLike) ? new KeysAccessor(accessorLike) : accessorLike === null || typeof accessorLike !== 'object' ? new KeysAccessor([accessorLike]) : accessorLike;
    __formObject = new FormObject(listener, upstream, accessor, transient);
  } else {
    __formObject = new FormObject(listener, undefined, undefined, transient);
    __formObject.value = upstream;
  }

  const __effect: EffectCallback = () => () => __formObject.detach();

  return {
    __formObject,
    __effect,
  };
}

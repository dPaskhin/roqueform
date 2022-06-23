import {createElement, Fragment, ReactElement, ReactNode, SetStateAction, useEffect} from 'react';
import {useHandler, useRerender} from 'react-hookers';
import {callOrGet} from './utils';

export type Enhancer<M> = (field: Field) => Field & M;

export interface Accessor {

  get(obj: any, key: any): any;

  set(obj: any, key: any, value: any): any;
}

export interface Field<T = any, M = {}> {
  value: T;
  transient: boolean;

  dispatchValue(value: SetStateAction<T>): void;

  setValue(value: SetStateAction<T>): void;

  dispatch(): void;

  at<K extends keyof T>(key: K): Field<T[K], M> & M;

  subscribe(listener: (targetField: Field<any, M> & M) => void): () => void;

  notify(): void;
}

export interface FieldProps<F extends Field<T>, T> {
  field: F;
  children: ((field: F) => ReactNode) | ReactNode;
  onChange?: (value: T) => void;
}

export function Field<F extends Field<T>, T = any>(props: FieldProps<F, T>): ReactElement {
  const {field} = props;
  const rerender = useRerender();
  const handleChange = useHandler(props.onChange);

  useEffect(() => {

    let prevValue: T | undefined;

    return field.subscribe((targetField) => {
      const {value} = field;

      if (field === targetField) {
        rerender();
      }
      if (field.transient || Object.is(value, prevValue)) {
        return;
      }

      prevValue = value;
      handleChange(value);
    });
  }, [field]);

  return createElement(Fragment, null, callOrGet(props.children, field));
}

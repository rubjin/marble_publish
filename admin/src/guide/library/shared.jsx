import React, { useEffect, useRef } from 'react';

/** 조건부 클래스 결합: cx('a', { b: true, c: false }) → 'a b' */
export function cx(...args) {
  return args
    .flatMap((arg) => {
      if (!arg) return [];
      if (typeof arg === 'string') return [arg];
      return Object.keys(arg).filter((k) => arg[k]);
    })
    .join(' ');
}

/** 고정 시드 난수 (새로고침해도 같은 데모 데이터) */
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** .formCheck 체크박스 (indeterminate 지원) */
export function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <label className="formCheck">
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span className="checkIcon"></span>
    </label>
  );
}

/** 현재 상태를 보여주는 디버그 박스 */
export function StateView({ children }) {
  return <div className="libState">{children}</div>;
}

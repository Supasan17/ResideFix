import { cloneElement, useId } from 'react';

/**
 * Wraps a single form control with a label and an inline error message,
 * wiring up the ids and aria attributes automatically.
 *
 *   <Field label="Email" error={errors.email}><input ... /></Field>
 */
export default function Field({ label, error, hint, className = '', children }) {
  const id = useId();
  const errorId = `${id}-error`;
  const control = cloneElement(children, {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  });

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && (
        <small id={errorId} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}

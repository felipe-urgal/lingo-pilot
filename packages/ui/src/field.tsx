import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type FieldProps = {
  error?: string;
  hint?: string;
  id: string;
  label: string;
};

function describedBy(
  id: string,
  hint?: string,
  error?: string,
  existing?: string,
) {
  return (
    [existing, hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function FieldMessages({ id, hint, error }: Omit<FieldProps, "label">) {
  return (
    <>
      {hint ? (
        <span className="lp-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="lp-field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </>
  );
}

export type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function Input({
  error,
  hint,
  id,
  label,
  className,
  ...props
}: InputProps) {
  return (
    <label className="lp-field" htmlFor={id}>
      <span className="lp-field__label">{label}</span>
      <input
        {...props}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={["lp-input", className].filter(Boolean).join(" ")}
        id={id}
      />
      <FieldMessages error={error} hint={hint} id={id} />
    </label>
  );
}

export type TextareaProps = FieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({
  error,
  hint,
  id,
  label,
  className,
  ...props
}: TextareaProps) {
  return (
    <label className="lp-field" htmlFor={id}>
      <span className="lp-field__label">{label}</span>
      <textarea
        {...props}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={["lp-textarea", className].filter(Boolean).join(" ")}
        id={id}
      />
      <FieldMessages error={error} hint={hint} id={id} />
    </label>
  );
}

export type SelectProps = FieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    children: ReactNode;
  };

export function Select({
  children,
  error,
  hint,
  id,
  label,
  className,
  ...props
}: SelectProps) {
  return (
    <label className="lp-field" htmlFor={id}>
      <span className="lp-field__label">{label}</span>
      <select
        {...props}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={["lp-select", className].filter(Boolean).join(" ")}
        id={id}
      >
        {children}
      </select>
      <FieldMessages error={error} hint={hint} id={id} />
    </label>
  );
}

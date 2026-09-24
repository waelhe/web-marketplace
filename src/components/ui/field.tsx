import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: ReactNode;
}) {
  const baseId = useId();
  const controlId = `field-${baseId}`;
  const hintId = hint ? `field-hint-${baseId}` : undefined;
  const errorId = error ? `field-error-${baseId}` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const childId = isValidElement(children)
    ? (children as ReactElement<ControlProps>).props.id
    : undefined;
  const labelledId = childId ?? controlId;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<ControlProps>, {
        id: childId ?? controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className="field">
      <label className="field-label" htmlFor={labelledId}>
        {label}
      </label>
      {control}
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

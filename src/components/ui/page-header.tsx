import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: {
  title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {description ? (
          <p className="page-note">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="page-header-actions">{actions}</div>
      ) : null}
    </div>
  );
}

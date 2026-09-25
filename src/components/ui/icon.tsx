type IconName = "share" | "star" | "message" | "heart";

type IconProps = {
  name: IconName;
  label?: string;
  size?: number;
};

export function Icon({ name, label, size = 20 }: IconProps) {
  const title = label ? <title>{label}</title> : null;

  switch (name) {
    case "share":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={size}
          height={size}
          aria-hidden={label ? undefined : "true"}
          role={label ? "img" : undefined}
        >
          {title}
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.7 7.6-4.4M8.2 13.3l7.6 4.4" />
        </svg>
      );
    case "star":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={size}
          height={size}
          aria-hidden={label ? undefined : "true"}
          role={label ? "img" : undefined}
        >
          {title}
          <path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.19l-5.56 2.93 1.06-6.2L3 9.53l6.22-.9L12 3Z" />
        </svg>
      );
    case "message":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={size}
          height={size}
          aria-hidden={label ? undefined : "true"}
          role={label ? "img" : undefined}
        >
          {title}
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="m8 17 1.5 3 3.5-3" />
        </svg>
      );
    case "heart":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={size}
          height={size}
          aria-hidden={label ? undefined : "true"}
          role={label ? "img" : undefined}
        >
          {title}
          <path d="M20.5 8.8c0 5.2-8.5 9.9-8.5 9.9s-8.5-4.7-8.5-9.9A4.3 4.3 0 0 1 12 6.3a4.3 4.3 0 0 1 8.5 2.5Z" />
        </svg>
      );
  }
}

// Inline SVG icons used across the app. Each one inherits its color from `currentColor`.

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function GraduationCapIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  );
}

export function BookOpenIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M2 5.5C4.5 4 8 4 11 5.5V20c-3-1.5-6.5-1.5-9 0V5.5Z" />
      <path d="M13 5.5C16 4 19.5 4 22 5.5V20c-2.5-1.5-6-1.5-9 0V5.5Z" />
    </svg>
  );
}

export function AtIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
      <path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function AlertCircleIcon(props) {
  return (
    <svg {...base} {...props} stroke="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.3" fill="#fff" />
    </svg>
  );
}

export function WarningIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function GraduationCapSolidIcon(props) {
  return (
    <svg {...base} {...props} stroke="none" fill="currentColor">
      <path d="M12 4 1.5 9.5 12 15l8.5-4.45V16h2V9.5L12 4Z" />
      <path d="M5.5 13.3v3.6c1.7 1.4 4 2.1 6.5 2.1s4.8-.7 6.5-2.1v-3.6L12 16.7l-6.5-3.4Z" />
    </svg>
  );
}

export function IdBadgeIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="15" rx="2" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <circle cx="9" cy="12.5" r="2" />
      <path d="M6 18c.5-1.5 1.7-2.3 3-2.3s2.5.8 3 2.3" />
      <path d="M15 12h3" />
      <path d="M15 16h3" />
    </svg>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

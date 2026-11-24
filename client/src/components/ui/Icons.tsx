import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svgProps(size = 16, props?: IconProps): SVGProps<SVGSVGElement> {
  const { className, style, ...rest } = props ?? {};
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    style: { flexShrink: 0, ...style },
    'aria-hidden': true,
    ...rest,
  };
}

export function IconCheck({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconX({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconAlert({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function IconPlus({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconRefresh({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconDownload({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconUpload({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M12 15V3m0 0l-4 4m4-4l4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconMonitor({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function IconLock({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export function IconCode({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

export function IconFileText({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconTable({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  );
}

export function IconTerminal({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3M13 15h4" />
    </svg>
  );
}

export function IconCalculator({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

export function IconEdit({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconUsers({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconClipboard({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

export function IconActivity({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function IconExternal({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

export function IconAcademic({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  );
}

export function IconChevronLeft({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronUp({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function IconRestore({ size = 16, ...props }: IconProps) {
  return (
    <svg {...svgProps(size, props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

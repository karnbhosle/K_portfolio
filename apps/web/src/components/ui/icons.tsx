import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (props: IconProps) => <Icon {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const ArrowUpRight = (props: IconProps) => <Icon {...props}><path d="M7 17 17 7M8 7h9v9" /></Icon>;
export const ArrowUp = (props: IconProps) => <Icon {...props}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>;
export const Mail = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></Icon>;
export const Phone = (props: IconProps) => <Icon {...props}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Icon>;
export const MapPin = (props: IconProps) => <Icon {...props}><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>;
export const Clock = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const Copy = (props: IconProps) => <Icon {...props}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></Icon>;
export const Check = (props: IconProps) => <Icon {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const Menu = (props: IconProps) => <Icon {...props}><path d="M4 7h16M4 12h16M4 17h10" /></Icon>;
export const Close = (props: IconProps) => <Icon {...props}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const Replay = (props: IconProps) => <Icon {...props}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></Icon>;
export const Pause = (props: IconProps) => <Icon {...props}><path d="M9 6v12M15 6v12" /></Icon>;
export const Play = (props: IconProps) => <Icon {...props}><path d="M8 5.5v13l10-6.5-10-6.5Z" /></Icon>;
export const Volume = (props: IconProps) => <Icon {...props}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Icon>;
export const VolumeOff = (props: IconProps) => <Icon {...props}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></Icon>;
export const Award = (props: IconProps) => <Icon {...props}><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" /></Icon>;
export const Search = (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>;
export const Enter = (props: IconProps) => <Icon {...props}><path d="M20 5v7a3 3 0 0 1-3 3H5" /><path d="m9 11-4 4 4 4" /></Icon>;
export const Hash = (props: IconProps) => <Icon {...props}><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></Icon>;
export const Code = (props: IconProps) => <Icon {...props}><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></Icon>;
export const Alert = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></Icon>;

/** The GitHub mark (Simple Icons, CC0), filled rather than stroked. */
export function GitHub({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

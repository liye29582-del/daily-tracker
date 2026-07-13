/* SVG 线形图标组件集 */
import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ children, size = 22, viewBox = '0 0 24 24', ...props }: IconProps & { viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) { return <Icon {...props}><path d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5-4v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4" /></Icon> }
export function WeightIcon(props: IconProps) { return <Icon {...props}><path d="M12 3c-1.5 0-3 1.5-3 3 0 1.5 1.5 3 3 3s3-1.5 3-3c0-1.5-1.5-3-3-3z" /><path d="M9 9l-3 5h12l-3-5" /><path d="M4 18h16" /><path d="M6 14h12" /><path d="M7 21h10" /></Icon> }
export function CheckIcon(props: IconProps) { return <Icon {...props}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></Icon> }
export function ClockIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></Icon> }
export function EditIcon(props: IconProps) { return <Icon {...props}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon> }
export function LightbulbIcon(props: IconProps) { return <Icon {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5.72.72 1.17 1.5 1.41 2.5" /></Icon> }
export function ChartIcon(props: IconProps) { return <Icon {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></Icon> }
export function SettingsIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" /></Icon> }
export function WaveIcon(props: IconProps) { return <Icon {...props} size={28}><path d="M2 12c2-4 6-4 8 0s6 4 8 0 4-4 6-2" /><path d="M2 17c2-4 6-4 8 0s6 4 8 0 4-4 6-2" opacity="0.5" /></Icon> }
export function CalendarIcon(props: IconProps) { return <Icon {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon> }
export function ChevronRight(props: IconProps) { return <Icon {...props} size={16}><path d="M9 18l6-6-6-6" /></Icon> }

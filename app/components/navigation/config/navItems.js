import {
  HomeIcon,
  ClockIcon,
  PeopleIcon,
  GearFilledIcon,
  CalendarIcon,
  InboxIcon,
  CoinIcon,
  BarChartIcon,
  GearIcon,
  HelpIcon
} from '@/app/lib/icons'

export const NAV_ITEMS = [
  { id: 'nav-dashboard', name: 'Home', path: '/dashboard', icon: HomeIcon },
  { id: 'nav-shifts', name: 'Shifts', path: '/shifts', icon: ClockIcon, locationScoped: true },
  { id: 'nav-staff', name: 'Staff', path: '/staff', icon: PeopleIcon, locationScoped: true },
  { id: 'nav-rules', name: 'Rules', path: '/dashboard/rules', icon: GearFilledIcon },
  { id: 'nav-generate', name: 'Rota Builder', path: '/dashboard/generate', icon: CalendarIcon, dividerAfter: true },
  { id: 'nav-requests', name: 'Inbox', path: '/dashboard/requests', icon: InboxIcon },
  { id: 'nav-payroll', name: 'Payroll', path: '/dashboard/payroll', icon: CoinIcon, locked: true },
  { id: 'nav-reports', name: 'Reports', path: '/dashboard/reports', icon: BarChartIcon, dividerAfter: true },
  { id: 'nav-location-settings', name: 'Location Settings', path: '/location-settings', icon: GearIcon, locationScoped: true},
  { id: 'nav-help', name: 'Help Centre', path: '/dashboard/help', icon: HelpIcon },
]
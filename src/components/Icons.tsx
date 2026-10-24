import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & {
  size?: number | string
  color?: string
  weight?: IconWeight
  strokeWidth?: number
}

type IconComponent = ReturnType<typeof createIcon>

const ICON_ROOT = '/icons/hugeicons/'

/**
 * NaRégua semantic icon layer.
 *
 * The actual glyphs are a curated local subset of Hugeicons Free (Stroke Rounded).
 * Keeping the semantic exports here means product screens never depend directly on a
 * vendor name and we can keep iconography coherent without loading a huge package.
 */
function createIcon(file: string) {
  return forwardRef<HTMLSpanElement, IconProps>(function NaReguaIcon(
    {
      size = 20,
      color,
      weight: _weight,
      strokeWidth: _strokeWidth,
      style,
      className = '',
      title,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) {
    const dimension = typeof size === 'number' ? `${size}px` : size
    const iconStyle: CSSProperties = {
      width: dimension,
      height: dimension,
      color: color ?? undefined,
      backgroundColor: 'currentColor',
      WebkitMaskImage: `url(${ICON_ROOT}${file})`,
      maskImage: `url(${ICON_ROOT}${file})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      ...style,
    }

    return (
      <span
        {...rest}
        ref={ref}
        className={`nr-icon ${className}`.trim()}
        style={iconStyle}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        title={title}
      />
    )
  })
}

const icon = (file: string): IconComponent => createIcon(file)

export const LayoutDashboard = icon('dashboard-square-01.svg')
export const Calendar = icon('calendar-03.svg')
export const CalendarDays = icon('calendar-03.svg')
export const CalendarDots = icon('calendar-03.svg')
export const ClipboardList = icon('task-01.svg')
export const Users = icon('user-group.svg')
export const UsersRound = Users
export const Wallet = icon('wallet-02.svg')
export const WalletCards = Wallet
export const Settings = icon('settings-01.svg')
export const MessageSquare = icon('bubble-chat.svg')
export const MessageCircleMore = icon('bubble-chat-notification.svg')
export const LogOut = icon('logout-01.svg')
export const Menu = icon('menu-02.svg')
export const SidebarSimple = icon('sidebar-left.svg')
export const Search = icon('search-01.svg')
export const Plus = icon('add-01.svg')
export const X = icon('cancel-01.svg')
export const XCircle = icon('alert-circle.svg')
export const AlertCircle = icon('alert-circle.svg')
export const Info = icon('information-circle.svg')
export const AlertTriangle = icon('alert-02.svg')
export const Clock = icon('clock-03.svg')
export const Clock3 = Clock
export const ChevronLeft = icon('arrow-left-01.svg')
export const ChevronRight = icon('arrow-right-01.svg')
export const ChevronDown = icon('arrow-down-01.svg')
export const ArrowRight = icon('arrow-right-01.svg')
export const Send = icon('sent.svg')
export const StopCircle = icon('stop-circle.svg')
export const MoreHorizontal = icon('more-horizontal.svg')
export const Edit2 = icon('edit-02.svg')
export const ImageIcon = icon('image-02.svg')
export const Image = ImageIcon
export const Scissors = icon('scissor.svg')
export const Link2 = icon('link-02.svg')
export const Upload = icon('upload-02.svg')
export const Download = icon('download-02.svg')
export const Trash2 = icon('delete-02.svg')
export const ShieldCheck = icon('security-check.svg')
export const Lock = icon('lock-key.svg')
export const LockKeyhole = Lock
export const Eye = icon('view.svg')
export const EyeOff = icon('view-off.svg')
export const Bell = icon('notification-02.svg')
export const BellRing = Bell
export const Copy = icon('copy-01.svg')
export const Smartphone = icon('smart-phone-01.svg')
export const Globe = icon('globe-02.svg')
export const Globe2 = Globe
export const CreditCard = icon('credit-card.svg')
export const Database = icon('database-01.svg')
export const Webhook = icon('webhook.svg')
export const Megaphone = icon('megaphone-01.svg')
export const QrCode = icon('qr-code.svg')
export const Moon = icon('moon-02.svg')
export const Sun = icon('sun-03.svg')
export const Palette = icon('paint-board.svg')
export const CircleHelp = icon('help-circle.svg')
export const Compass = icon('compass.svg')
export const Sparkles = icon('ai-magic.svg')
export const Star = icon('star.svg')
export const BarChart3 = icon('analytics-01.svg')
export const Zap = icon('flash.svg')
export const HeartHandshake = icon('user-group.svg')
export const PlayCircle = icon('play-circle.svg')
export const RefreshCw = icon('reload.svg')
export const ExternalLink = icon('link-square-02.svg')
export const Paperclip = icon('attachment-02.svg')

export const Check = createIcon('tick-02.svg')

export const CheckCircle2 = createIcon('tick-02.svg')

import { cn } from '@/lib/utils'
import { useTheme } from '@/themes'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

// Brand badge: the Oxee Hermes app icon, theme-aware — the gradient tile in
// light mode, the dark tile in dark mode. The SVG carries the rounded shape and
// transparent corners, so no tile/rounding classes here. Sources live in
// oxeegen/assets (copied by oxeegen/scripts/apply-desktop-assets.cjs); size via
// className (default size-14).
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  const { renderedMode } = useTheme()
  const dark = renderedMode === 'dark'

  return (
    <span className={cn('inline-flex size-14 shrink-0 items-center justify-center', className)} {...props}>
      <img alt="" className="size-full object-contain" src={assetPath(dark ? 'oxeegen-icon-dark.svg' : 'oxeegen-icon.svg')} />
    </span>
  )
}

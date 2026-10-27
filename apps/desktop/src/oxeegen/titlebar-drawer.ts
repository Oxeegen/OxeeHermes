import { useEffect, useState } from 'react'

/** The column physically at the window's left, under the titlebar: sessions, bots, browser… */
const LEFT_COLUMN = '[data-tree-group][data-window-top="true"]'

/**
 * Oxee Hermes: the right edge (px) of the open left drawer, so the titlebar can put
 * the sidebar toggle on it with the wordmark at the far left. Null while the drawer
 * is closed or not laid out. Follows drags of the drawer's edge and layout changes.
 */
export function useLeftDrawerRight(open: boolean): null | number {
  const [right, setRight] = useState<null | number>(null)

   
  useEffect(() => {
    if (!open) {
      setRight(null)

      return
    }

    let frame = 0
    let observed: Element | null = null

    const resize = new ResizeObserver(() => schedule())

    const measure = (): void => {
      const column = [...document.querySelectorAll(LEFT_COLUMN)].find(el => el.getBoundingClientRect().left <= 1) ?? null

      if (column !== observed) {
        if (observed) {
          resize.unobserve(observed)
        }

        if (column) {
          resize.observe(column)
        }

        observed = column
      }

      const rect = column?.getBoundingClientRect()
      setRight(rect && rect.width > 0 ? Math.round(rect.right) : null)
    }

    const schedule = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })
    resize.observe(document.body)
    schedule()

    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [open])

  return right
}

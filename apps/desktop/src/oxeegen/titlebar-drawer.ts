import { useEffect, useState } from 'react'

/** The column physically at the window's left, under the titlebar: sessions, bots, browser… */
const LEFT_COLUMN = '[data-tree-group][data-window-top="true"]'
const TOGGLE = '[data-titlebar-cluster="left"] button'

export interface LeftDrawerGeometry {
  /** Open drawer: its right edge (px), where the sidebar toggle sits. */
  right: null | number
  /** Collapsed drawer: the left (px) that centres the toggle on the rail's tabs and wordmark. */
  toggleLeft: null | number
}

const NONE: LeftDrawerGeometry = { right: null, toggleLeft: null }

/**
 * Oxee Hermes: where the titlebar's sidebar toggle goes. Open, on the drawer's right
 * edge with the wordmark at the far left; collapsed, centred on the rail under it.
 * Follows drags of the drawer's edge and layout changes.
 */
export function useLeftDrawerGeometry(open: boolean): LeftDrawerGeometry {
  const [geometry, setGeometry] = useState<LeftDrawerGeometry>(NONE)

   
  useEffect(() => {
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

      if (!rect || rect.width <= 0) {
        setGeometry(NONE)

        return
      }

      if (open) {
        setGeometry({ right: Math.round(rect.right), toggleLeft: null })

        return
      }

      // macOS keeps its traffic lights in that corner: the toggle stays where the platform puts it.
      if (navigator.userAgent.includes('Mac OS')) {
        setGeometry(NONE)

        return
      }

      const toggle = document.querySelector(TOGGLE)?.getBoundingClientRect().width ?? 0
      const left = Math.round(rect.left + rect.width / 2 - toggle / 2)

      setGeometry(toggle > 0 ? { right: null, toggleLeft: Math.max(0, left) } : NONE)
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

  return geometry
}

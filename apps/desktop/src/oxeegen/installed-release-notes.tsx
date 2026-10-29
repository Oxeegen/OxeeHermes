import { type ReactElement, useEffect, useState } from 'react'

import { SectionHeading } from '@/app/settings/primitives'
import { MessageTextContent } from '@/components/assistant-ui/markdown-text'
import { useI18n } from '@/i18n'
import { ExternalLink, FileText } from '@/lib/icons'

import { fetchReleaseNotes, localizedNotesBody, type OxeegenReleaseNotes, releaseTagFor } from './release-notes'
import { useOxeegenStrings } from './strings'

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'ready'; notes: OxeegenReleaseNotes }

/** Settings > About > Version and updates: the GitHub release notes of the version running now, in the UI language when the release has them. */
export function InstalledReleaseNotes({ appVersion }: { appVersion: null | string | undefined }): null | ReactElement {
  const s = useOxeegenStrings()
  const { locale } = useI18n()
  const tag = releaseTagFor(appVersion)
  const [state, setState] = useState<State>({ kind: 'loading' })

   
  useEffect(() => {
    if (!tag) {
      return
    }

    let alive = true
    setState({ kind: 'loading' })
    void fetchReleaseNotes(tag).then(notes => {
      if (alive) {
        setState(notes ? { kind: 'ready', notes } : { kind: 'missing' })
      }
    })

    return () => {
      alive = false
    }
  }, [tag])

  if (!tag || state.kind === 'loading') {
    return null
  }

  const body = state.kind === 'ready' ? localizedNotesBody(state.notes.body, locale) : ''

  return (
    <section className="mt-6" data-oxee-release-notes={tag}>
      <SectionHeading icon={FileText} title={s.releaseNotesTitle(tag.slice(1))} />
      {state.kind === 'missing' ? (
        <p className="text-sm text-muted-foreground">{s.releaseNotesMissing}</p>
      ) : (
        <div className="grid gap-2">
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
            {body ? <MessageTextContent media={false} text={body} /> : s.releaseNotesEmpty}
          </div>
          <a
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground underline"
            href={state.notes.url}
            onClick={event => {
              event.preventDefault()
              void window.hermesDesktop?.openExternal?.(state.notes.url)
            }}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-3" />
            {s.releaseNotesOnGithub}
          </a>
        </div>
      )}
    </section>
  )
}

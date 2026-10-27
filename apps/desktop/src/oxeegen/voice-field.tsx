import { IconGenderFemale, IconGenderMale } from '@tabler/icons-react'
import type { ReactElement } from 'react'

import { ListRow } from '@/app/settings/primitives'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

import { OXEEGEN, OXEEGEN_VOICES, type OxeegenVoice } from './config'
import { useOxeegenStrings } from './strings'

const GENDER_ICON = {
  female: <IconGenderFemale aria-hidden className="size-4 shrink-0 text-pink-500" />,
  male: <IconGenderMale aria-hidden className="size-4 shrink-0 text-sky-500" />
} satisfies Record<OxeegenVoice['gender'], ReactElement>

/** Settings > Voice > Speech > Voice: the voxee voices, women then men, each marked by gender. */
export function OxeegenVoiceField({ onChange, value }: { onChange: (value: string) => void; value: unknown }): ReactElement {
  const s = useOxeegenStrings()
  const current = typeof value === 'string' && value ? value : OXEEGEN.ttsVoice

  const groups: [string, OxeegenVoice['gender']][] = [
    [s.ttsVoicesFemale, 'female'],
    [s.ttsVoicesMale, 'male']
  ]

  return (
    <ListRow
      action={
        <Select onValueChange={onChange} value={current}>
          <SelectTrigger aria-label={s.ttsVoice} className="min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map(([label, gender]) => (
              <SelectGroup key={gender}>
                <SelectLabel>{label}</SelectLabel>
                {OXEEGEN_VOICES.filter(voice => voice.gender === gender).map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <span className="inline-flex items-center gap-2">
                      {GENDER_ICON[voice.gender]}
                      {voice.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      }
      data-tour="field-tts.openai.voice"
      title={s.ttsVoice}
    />
  )
}

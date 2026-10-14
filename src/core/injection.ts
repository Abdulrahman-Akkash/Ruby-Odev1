/**
 * Prompt-injection imza tarayıcısı (deterministik, LLM'den bağımsız).
 *
 * Bu desenler bir sözleşme metninde doğal olarak geçmesi beklenmeyen, bir yapay
 * zekâya hitap eden ifadeleri hedefler. Eşleşen bölütler LLM'e GÖNDERİLMEZ
 * (karantina) ve raporda gösterilir. Liste bilinçli olarak dar tutuldu: amaç her
 * saldırıyı yakalamak değil (bu imkânsız), sinyali görünür kılmaktır. Asıl savunma
 * çıktı tarafındaki deterministik doğrulamadır (bkz. validate.ts, score.ts).
 */

export interface InjectionMatch {
  pattern: string
  excerpt: string
  index: number
}

const PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: 'ignore_previous_instructions',
    re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|preceding|all|any|your)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|directions|guidelines)\b/i,
  },
  { name: 'addresses_ai', re: /\b(as an|attention|note to|dear|hey)\s+(ai|a\.i\.|llm|language model|assistant|chat-?gpt|claude|gemini|qwen)\b/i },
  { name: 'role_reassignment', re: /\byou are (now )?(an? )?(ai|assistant|language model|chatbot|llm|helpful)\b/i },
  { name: 'system_prompt_reference', re: /\b(system|developer)\s+(prompt|message|instructions?)\b/i },
  { name: 'chat_role_marker', re: /(^|\n)\s*(system|assistant|user)\s*:\s*\S/i },
  { name: 'pseudo_tag', re: /<\/?\s*(system|instructions?|prompt|im_start|im_end)\s*>/i },
  {
    name: 'output_steering',
    re: /\b(respond|reply|answer|output|return|report)\b[^.\n]{0,25}\b(only|exactly|strictly)?\s*(with|as)\b[^.\n]{0,40}\b(json|risk score|safe|no risks?|empty)\b/i,
  },
  { name: 'score_manipulation', re: /\brisk[_ -]?score\b[^.\n]{0,20}(\bis\b|=|:|\bof\b|\bto\b)\s*\d+/i },
  {
    name: 'safety_claim_steering',
    re: /\b(mark|rate|classify|label|consider)\b[^.\n]{0,40}\b(as )?(safe|harmless|low[- ]risk|no[- ]risk|risk[- ]free)\b/i,
  },
  {
    name: 'tool_or_exfil',
    re: /\b(exfiltrat\w*|send (it|this|them|the (data|key|token|conversation|cookies?)) to (https?:\/\/|\S+@)|navigate to https?:|fetch\(|curl\s+https?:|reveal (your|the) (system prompt|api key|instructions))/i,
  },
  // Türkçe
  {
    name: 'tr_ignore_instructions',
    re: /(önceki|yukarıdaki|tüm|bütün)\s+(talimat|komut|kural)\w*\s+(yok\s*say|unut|görmezden\s+gel|dikkate\s+alma)/iu,
  },
  { name: 'tr_addresses_ai', re: /\b(yapay\s+zek[aâ]|dil\s+modeli|asistan)\s*(olarak|,|:)/iu },
  { name: 'tr_score_manipulation', re: /risk\s+(skoru|puanı)\w*\s*[^.\n]{0,20}\d+/iu },
  { name: 'tr_safety_claim', re: /(güvenli|risksiz|zararsız)\s+(olarak\s+)?(işaretle|raporla|göster|değerlendir)/iu },
]

export function scanForInjection(text: string, maxMatches = 20): InjectionMatch[] {
  const out: InjectionMatch[] = []
  for (const { name, re } of PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    let m: RegExpExecArray | null
    while ((m = g.exec(text)) && out.length < maxMatches) {
      const start = Math.max(0, m.index - 60)
      const end = Math.min(text.length, m.index + m[0].length + 60)
      out.push({ pattern: name, excerpt: text.slice(start, end).replace(/\s+/g, ' ').trim(), index: m.index })
      if (m[0].length === 0) g.lastIndex++
    }
  }
  return out.sort((a, b) => a.index - b.index)
}

export function hasInjection(text: string): boolean {
  return PATTERNS.some(({ re }) => re.test(text))
}

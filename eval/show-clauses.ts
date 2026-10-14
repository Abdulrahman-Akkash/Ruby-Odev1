// Bir eval belgesinin bölütlenmiş maddelerini yazdırır (etiketleme yardımcısı).
import { readFile } from 'node:fs/promises'
import { segmentText } from '../src/core/segment'
const doc = JSON.parse(await readFile(`eval/extracted/${process.argv[2]}.json`, 'utf8'))
for (const c of segmentText(doc.text)) console.log(`[${c.id}] ${c.text}\n`)

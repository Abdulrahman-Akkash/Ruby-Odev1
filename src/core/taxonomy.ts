/**
 * Sabit risk taksonomisi. LLM yalnızca bu kategorilerden birini seçebilir;
 * Türkçe etiketler ve varsayılan açıklamalar burada (LLM'den değil) gelir.
 */

export const CATEGORY_IDS = [
  'auto_renewal',
  'cancellation_refund',
  'price_change',
  'unilateral_changes',
  'account_termination',
  'liability_limitation',
  'indemnification',
  'dispute_resolution',
  'governing_law',
  'content_license',
  'data_sharing',
  'data_retention',
  'tracking_advertising',
  'other',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export const SEVERITIES = ['low', 'medium', 'high'] as const
export type Severity = (typeof SEVERITIES)[number]

export const CONFIDENCES = ['low', 'medium', 'high'] as const
export type Confidence = (typeof CONFIDENCES)[number]

export interface CategoryInfo {
  label: string
  /** LLM açıklaması reddedildiğinde kullanılan deterministik açıklama. */
  fallbackExplanation: string
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  auto_renewal: {
    label: 'Otomatik yenileme',
    fallbackExplanation: 'Abonelik siz iptal etmedikçe otomatik olarak yenilenebilir ve ücret tahsil edilebilir.',
  },
  cancellation_refund: {
    label: 'İptal ve iade kısıtı',
    fallbackExplanation: 'İptal veya para iadesi koşulları kısıtlayıcı olabilir; ödenen ücret geri alınamayabilir.',
  },
  price_change: {
    label: 'Fiyat değişikliği',
    fallbackExplanation: 'Şirket ücretleri değiştirebilir; yeni fiyat aboneliğinize uygulanabilir.',
  },
  unilateral_changes: {
    label: 'Tek taraflı değişiklik',
    fallbackExplanation: 'Şirket koşulları tek taraflı değiştirebilir; kullanmaya devam etmek kabul sayılabilir.',
  },
  account_termination: {
    label: 'Hesap kapatma / askıya alma',
    fallbackExplanation: 'Şirket hesabınızı geniş gerekçelerle veya bildirimsiz kapatabilir ya da askıya alabilir.',
  },
  liability_limitation: {
    label: 'Sorumluluk sınırlaması',
    fallbackExplanation: 'Şirketin zararlardan sorumluluğu ciddi biçimde sınırlanmış veya hariç tutulmuş olabilir.',
  },
  indemnification: {
    label: 'Tazmin yükümlülüğü',
    fallbackExplanation: 'Belirli durumlarda şirketin zararlarını ve masraflarını sizin karşılamanız istenebilir.',
  },
  dispute_resolution: {
    label: 'Tahkim / toplu dava feragati',
    fallbackExplanation: 'Uyuşmazlıklar mahkeme yerine tahkimde çözülebilir veya toplu dava hakkınız kısıtlanabilir.',
  },
  governing_law: {
    label: 'Yetkili hukuk ve mahkeme',
    fallbackExplanation: 'Uyuşmazlıklarda yabancı bir ülkenin hukuku veya mahkemesi yetkili kılınmış olabilir.',
  },
  content_license: {
    label: 'İçerik lisansı',
    fallbackExplanation: 'Yüklediğiniz içerik üzerinde şirkete geniş (ör. süresiz, dünya çapında) kullanım hakkı verilebilir.',
  },
  data_sharing: {
    label: 'Veri paylaşımı',
    fallbackExplanation: 'Kişisel verileriniz üçüncü taraflarla paylaşılabilir.',
  },
  data_retention: {
    label: 'Veri saklama',
    fallbackExplanation: 'Verileriniz uzun süre veya hesap kapandıktan sonra da saklanabilir.',
  },
  tracking_advertising: {
    label: 'İzleme ve reklam',
    fallbackExplanation: 'Davranışlarınız çerez veya benzeri araçlarla izlenip reklam amacıyla kullanılabilir.',
  },
  other: {
    label: 'Diğer',
    fallbackExplanation: 'Bu madde kullanıcı aleyhine sonuç doğurabilecek bir hüküm içeriyor olabilir.',
  },
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
}

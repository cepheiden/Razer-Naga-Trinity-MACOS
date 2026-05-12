import { Check, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNagaStore } from '../store/useNagaStore'

export function NoticeBar() {
  const { t, i18n } = useTranslation()
  const notice = useNagaStore((state) => state.notice)
  const dismiss = useNagaStore((state) => state.dismissNotice)

  if (!notice) return null
  const tone = notice.tone

  // 1) Wenn der Driver einen i18n-Key + ggf. Params liefert → übersetzen.
  // 2) Falls die Driver-Exception nur einen Englisch-Fallback-String hatte ('Razer Naga Trinity not found.'),
  //    auf den notFound-Key zurückfallen.
  let label = notice.message
  if (notice.key && i18n.exists(notice.key)) {
    label = t(notice.key, notice.params ?? {}) as string
  } else if (notice.message?.includes('Razer Naga Trinity not found')) {
    label = t('driverNotices.notFound') as string
  }

  return (
    <div className={`notice ${tone}`} role="status">
      <span className="notice-icon">
        {tone === 'success' ? <Check size={14} /> : <TriangleAlert size={14} />}
      </span>
      <span className="notice-text">{label}</span>
      <button
        type="button"
        className="notice-dismiss"
        onClick={dismiss}
        aria-label={t('notice.dismiss')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

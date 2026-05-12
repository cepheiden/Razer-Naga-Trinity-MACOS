import { Check, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNagaStore } from '../store/useNagaStore'

export function NoticeBar() {
  const { t } = useTranslation()
  const notice = useNagaStore((state) => state.notice)
  const dismiss = useNagaStore((state) => state.dismissNotice)

  if (!notice) return null
  const tone = notice.tone

  return (
    <div className={`notice ${tone}`} role="status">
      <span className="notice-icon">
        {tone === 'success' ? <Check size={14} /> : <TriangleAlert size={14} />}
      </span>
      <span className="notice-text">{notice.message}</span>
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

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { getHighRiskCount } from '../lib/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

const POLL_INTERVAL = 30_000 // 30 giây

export function NotificationProvider({ children }) {
  const { auth } = useAuth()

  // Badge count = số HIGH transactions mới kể từ lần cuối user xem trang "high-risk"
  const [badgeCount, setBadgeCount] = useState(0)

  // latestId đã xem — lưu trong localStorage để giữ qua reload
  const [seenId, setSeenId] = useState(() => {
    try { return parseInt(localStorage.getItem('fs_seen_high_id') || '0', 10) } catch { return 0 }
  })

  const timerRef = useRef(null)

  const fetchCount = useCallback(async () => {
    if (!auth) return
    try {
      const { count } = await getHighRiskCount(seenId)
      setBadgeCount(count)
    } catch {
      // Im lặng — không làm gián đoạn UI
    }
  }, [auth, seenId])

  // Poll ngay khi mount + mỗi POLL_INTERVAL
  useEffect(() => {
    fetchCount()
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [fetchCount])

  // Gọi khi user mở trang "Rủi ro cao" → reset badge và cập nhật seenId
  const markAllSeen = useCallback(async () => {
    try {
      const { latest_id } = await getHighRiskCount(0)
      if (latest_id > 0) {
        localStorage.setItem('fs_seen_high_id', String(latest_id))
        setSeenId(latest_id)
      }
      setBadgeCount(0)
    } catch {}
  }, [])

  return (
    <NotificationContext.Provider value={{ badgeCount, markAllSeen }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}

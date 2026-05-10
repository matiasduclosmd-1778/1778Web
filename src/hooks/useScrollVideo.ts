import { useEffect, type RefObject } from 'react'

export function useScrollVideo(videoRef: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let rafId: number
    let stopTimeout: ReturnType<typeof setTimeout>

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        video.play().catch(() => {})
        clearTimeout(stopTimeout)
        stopTimeout = setTimeout(() => video.pause(), 200)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
      clearTimeout(stopTimeout)
    }
  }, [])
}

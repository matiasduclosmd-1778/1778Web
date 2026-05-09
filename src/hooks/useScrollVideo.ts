import { useEffect, type RefObject } from 'react'

export function useScrollVideo(videoRef: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let stopTimeout: ReturnType<typeof setTimeout>

    const onScroll = () => {
      video.play().catch(() => {})
      clearTimeout(stopTimeout)
      stopTimeout = setTimeout(() => video.pause(), 150)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(stopTimeout)
    }
  }, [])
}

import { useEffect, useMemo } from 'react'

interface PhotoImgProps {
  blob: Blob
  className?: string
  onClick?: () => void
}

/** 用 objectURL 展示 IndexedDB 里的图片 Blob，卸载时释放 */
export default function PhotoImg({ blob, className, onClick }: PhotoImgProps) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])
  return <img src={url} className={className} alt="照片" loading="lazy" onClick={onClick} />
}

import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

export default function ScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function startScanner() {
      if (!('BarcodeDetector' in window)) {
        setError('Barcode scanning is not supported in this browser. You can search by SKU or barcode instead.')
        return
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'] })
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        if (cancelled) return stream.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const scan = async () => {
          if (cancelled) return
          try {
            const matches = await detector.detect(videoRef.current)
            if (matches[0]?.rawValue) return onDetected(matches[0].rawValue)
          } catch {
            setError('Unable to read the code. Try again with better lighting.')
          }
          window.requestAnimationFrame(scan)
        }
        scan()
      } catch (scanError) {
        setError(scanError.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Camera is unavailable. Search by SKU or barcode instead.')
      }
    }
    startScanner()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [onDetected])

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Camera className="text-cyan-600 dark:text-cyan-400" size={19} /><h2 className="font-semibold text-slate-900 dark:text-white">Scan QR or barcode</h2></div><button type="button" onClick={onClose} aria-label="Close scanner" className="!m-0 !bg-transparent !p-2 !text-slate-500 dark:!text-slate-400"><X size={18} /></button></div><video ref={videoRef} className="mt-4 aspect-video w-full rounded-xl bg-slate-950 object-cover" muted playsInline />{error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Point the camera at a QR code or barcode. You can close this window and use search if scanning is unavailable.</p></div></div>
}

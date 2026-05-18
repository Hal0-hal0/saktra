"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, CameraOff, ScanLine, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
      }
      getSupportedFormats(): Promise<string[]>
    }
  }
}

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const [detected, setDetected] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      if (typeof window === "undefined") return
      if (!window.BarcodeDetector) {
        setSupported(false)
        return
      }
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats()
        setSupported(formats.includes("qr_code"))
      } catch {
        setSupported(false)
      }
    }
    check()
  }, [])

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setError(null)
    setDetected(null)
    if (!supported || !window.BarcodeDetector) {
      setError("Your browser does not support in-app QR scanning. Open the camera app on your phone and scan the admin's QR code instead.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setScanning(true)

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] })

      const tick = async () => {
        if (!videoRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          if (results.length > 0) {
            const value = results[0].rawValue
            setDetected(value)
            stopCamera()
            handleResult(value)
            return
          }
        } catch {
          /* ignore frame errors */
        }
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (err: any) {
      setError(err?.message ?? "Could not access camera. Allow camera permission and try again.")
      stopCamera()
    }
  }

  const handleResult = (value: string) => {
    // Accept full URLs (the admin QR encodes an https://.../attend/<id> URL)
    // or a bare numeric event id.
    try {
      const url = new URL(value)
      router.push(url.pathname + url.search)
      return
    } catch {
      // not a URL — try numeric event id
    }
    if (/^\d+$/.test(value.trim())) {
      router.push(`/attend/${value.trim()}`)
      return
    }
    setError(`Scanned value is not a valid event QR: "${value}"`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Scan Attendance QR</h1>
        <p className="text-sm text-muted-foreground">
          Point your phone camera at the event QR code shown by the admin. You will be automatically checked in and awarded points.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="size-5" />
            Camera scanner
          </CardTitle>
          <CardDescription>
            {supported === null && "Checking browser support…"}
            {supported === false && "In-app scanning isn't supported in this browser — use your phone's native camera app on the QR code."}
            {supported === true && (scanning ? "Scanning… line up the QR within the frame." : "Tap Start to enable your camera.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border bg-black/90">
            <video
              ref={videoRef}
              className="size-full object-cover"
              playsInline
              muted
            />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                Camera off
              </div>
            )}
            {scanning && (
              <div className="absolute inset-8 rounded-xl border-2 border-violet-400/80" />
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {detected && (
            <p className="text-sm text-green-600">Detected QR — redirecting…</p>
          )}

          <div className="flex gap-2">
            {!scanning ? (
              <Button type="button" className="flex-1" onClick={startCamera} disabled={supported === false}>
                <Camera className="size-4" />
                Start camera
              </Button>
            ) : (
              <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>
                <CameraOff className="size-4" />
                Stop camera
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: if the in-app scanner doesn't work on your device, use your phone's built-in camera app — the QR encodes a URL that opens this app and checks you in automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

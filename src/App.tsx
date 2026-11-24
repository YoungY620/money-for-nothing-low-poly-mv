import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  FullscreenExitLineIcon,
  FullscreenLineIcon,
  ListRestartLineIcon,
  PauseLineIcon,
  PlayLineIcon,
  VolumeLineIcon,
  VolumeMuteLineIcon,
} from "@/components/icons"
import { chapters, MusicVideo } from "@/video/MusicVideo"
import envelope from "@/video/envelope.json"

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00"
  const seconds = Math.max(0, Math.floor(value))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export function App() {
  const playerRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<MusicVideo | null>(null)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(envelope.duration)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState("")
  const chapter = chapters.find((item) => currentTime >= item.start && currentTime < item.end) ?? chapters[0]

  useEffect(() => {
    if (!mountRef.current) return
    let animationFrame = 0
    try {
      const video = new MusicVideo(mountRef.current)
      videoRef.current = video
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      const applyMotionPreference = () => video.setReducedMotion(motionQuery.matches)
      applyMotionPreference()
      motionQuery.addEventListener("change", applyMotionPreference)
      const animate = () => {
        video.render(audioRef.current?.currentTime ?? 0)
        animationFrame = requestAnimationFrame(animate)
      }
      animate()
      return () => {
        cancelAnimationFrame(animationFrame)
        motionQuery.removeEventListener("change", applyMotionPreference)
        video.dispose()
        videoRef.current = null
      }
    } catch {
      queueMicrotask(() => setError("This browser could not start WebGL. Try a current browser with hardware acceleration enabled."))
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    setStarting(true)
    setError("")
    if (audio.ended || audio.currentTime >= audio.duration - 0.05) audio.currentTime = 0
    try {
      await audio.play()
    } catch {
      setError("Playback could not start. Press play to try again.")
    } finally {
      setStarting(false)
    }
  }, [])

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void play()
    else audio.pause()
  }, [play])

  const seek = useCallback((value: number | readonly number[]) => {
    const audio = audioRef.current
    if (!audio) return
    const nextTime = typeof value === "number" ? value : value[0]
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    setEnded(false)
  }, [])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await playerRef.current?.requestFullscreen()
    } catch {
      setError("Fullscreen is not available in this browser.")
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, button, [role='slider']")) return
      if (event.code === "Space") {
        event.preventDefault()
        togglePlayback()
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault()
        const audio = audioRef.current
        if (!audio) return
        const offset = event.key === "ArrowRight" ? 5 : -5
        seek([Math.min(Math.max(audio.currentTime + offset, 0), duration)])
      } else if (event.key.toLowerCase() === "m") toggleMute()
      else if (event.key.toLowerCase() === "f") void toggleFullscreen()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [duration, seek, toggleFullscreen, toggleMute, togglePlayback])

  return (
    <main
      ref={playerRef}
      className="player show-controls"
    >
      <div ref={mountRef} className="video-mount" />
      <div className="screen-texture" aria-hidden="true" />
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/money-for-nothing.mp3`}
        preload="auto"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => {
          setStarted(true)
          setPlaying(true)
          setEnded(false)
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setEnded(true)
        }}
        onError={() => setError("The audio file could not be loaded. Reload the page to try again.")}
      />

      {started && (
        <header className="video-header">
          <div>
            <p className="video-title">Money for Nothing</p>
            <p className="video-artist">Dire Straits</p>
          </div>
          <p className="chapter-title" aria-live="polite">{chapter.title}</p>
        </header>
      )}

      {!started && (
        <section className="intro-panel" aria-labelledby="video-heading">
          <div className="intro-copy">
            <h1 id="video-heading">Money for Nothing</h1>
            <p className="artist">Dire Straits</p>
            <p className="intro-description">A low-poly tribute to the original animated video.</p>
            <Button variant="primary" size="lg" onClick={() => void play()} disabled={starting} className="play-button">
              <PlayLineIcon className="size-5" aria-hidden="true" />
              {starting ? "Starting video" : "Play the video"}
            </Button>
            <p className="duration-note">4 minutes 39 seconds. Sound starts after you press play.</p>
          </div>
        </section>
      )}

      {ended && (
        <section className="replay-panel" aria-label="Video finished">
          <h2>Final transmission</h2>
          <Button variant="primary" size="lg" onClick={() => void play()}>
            <ListRestartLineIcon className="size-5" aria-hidden="true" />
            Watch again
          </Button>
        </section>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="sr-only" role="status">{playing ? `Playing ${chapter.title}` : "Video paused"}</p>

      {started && (
        <div className="controls" aria-label="Video controls">
          <Slider
            aria-label="Video progress"
            min={0}
            max={duration}
            step={0.01}
            value={[currentTime]}
            onValueChange={seek}
            className="timeline"
          />
          <div className="control-row">
            <div className="control-group">
              <Button variant="ghost" size="icon" onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"} title={playing ? "Pause" : "Play"}>
                {playing ? <PauseLineIcon className="size-5" aria-hidden="true" /> : <PlayLineIcon className="size-5" aria-hidden="true" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted} title={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeMuteLineIcon className="size-5" aria-hidden="true" /> : <VolumeLineIcon className="size-5" aria-hidden="true" />}
              </Button>
              <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={fullscreen} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {fullscreen ? <FullscreenExitLineIcon className="size-5" aria-hidden="true" /> : <FullscreenLineIcon className="size-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App

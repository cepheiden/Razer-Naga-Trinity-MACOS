import { useMemo } from 'react'
import type { NagaProfile, RgbSettings, SidePlate } from '../../electron/types'

interface Props {
  profile: NagaProfile
  compact?: boolean
}

const effectAnimation = (rgb: RgbSettings) => {
  switch (rgb.effect) {
    case 'off':
      return 'glow-off'
    case 'breathing':
      return 'glow-breathing'
    case 'spectrum':
      return 'glow-spectrum'
    case 'wave':
      return 'glow-wave'
    case 'reactive':
      return 'glow-reactive'
    default:
      return 'glow-static'
  }
}

const sideButtonLayouts: Record<SidePlate, Array<{ x: number; y: number; w: number; h: number; label: string }>> = {
  two: [
    { x: 22, y: 152, w: 50, h: 32, label: '1' },
    { x: 22, y: 190, w: 50, h: 32, label: '2' },
  ],
  seven: [
    { x: 18, y: 130, w: 38, h: 26, label: '1' },
    { x: 60, y: 130, w: 38, h: 26, label: '2' },
    { x: 18, y: 160, w: 38, h: 26, label: '3' },
    { x: 60, y: 160, w: 38, h: 26, label: '4' },
    { x: 18, y: 190, w: 38, h: 26, label: '5' },
    { x: 60, y: 190, w: 38, h: 26, label: '6' },
    { x: 39, y: 220, w: 38, h: 26, label: '7' },
  ],
  twelve: [
    { x: 14, y: 120, w: 28, h: 22, label: '1' },
    { x: 46, y: 120, w: 28, h: 22, label: '2' },
    { x: 78, y: 120, w: 28, h: 22, label: '3' },
    { x: 14, y: 146, w: 28, h: 22, label: '4' },
    { x: 46, y: 146, w: 28, h: 22, label: '5' },
    { x: 78, y: 146, w: 28, h: 22, label: '6' },
    { x: 14, y: 172, w: 28, h: 22, label: '7' },
    { x: 46, y: 172, w: 28, h: 22, label: '8' },
    { x: 78, y: 172, w: 28, h: 22, label: '9' },
    { x: 14, y: 198, w: 28, h: 22, label: '10' },
    { x: 46, y: 198, w: 28, h: 22, label: '11' },
    { x: 78, y: 198, w: 28, h: 22, label: '12' },
  ],
}

export function MouseVisualizer({ profile, compact = false }: Props) {
  const { rgb, sidePlate } = profile
  const animation = effectAnimation(rgb)

  const zoneColor = (zone: keyof RgbSettings['zones']) => {
    const config = rgb.zones[zone]
    if (!config.enabled || rgb.effect === 'off') return '#101410'
    if (rgb.syncZones) return rgb.color
    return config.color
  }

  const intensity = rgb.effect === 'off' ? 0 : rgb.brightness / 100
  const sideButtons = useMemo(() => sideButtonLayouts[sidePlate], [sidePlate])

  return (
    <div
      className={`mouse-visualizer ${compact ? 'compact' : ''}`}
      data-animation={animation}
      style={
        {
          '--logo-color': zoneColor('logo'),
          '--scroll-color': zoneColor('scroll'),
          '--side-color': zoneColor('side'),
          '--glow-intensity': intensity.toFixed(2),
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 260 360" role="img" aria-label="Razer Naga Trinity">
        <defs>
          <linearGradient id="bodyShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1d1a" />
            <stop offset="55%" stopColor="#0e100e" />
            <stop offset="100%" stopColor="#040504" />
          </linearGradient>
          <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--logo-color)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--logo-color)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          d="M180 18c34 6 58 38 60 78l4 142c2 56-38 104-90 104h-44c-44 0-78-32-82-78l-8-118c-4-44 22-90 64-118 24-16 60-14 96-10z"
          fill="url(#bodyShade)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1.4"
        />

        <ellipse
          cx="130"
          cy="60"
          rx="78"
          ry="22"
          fill="rgba(255,255,255,0.06)"
        />

        <g className="zone scroll-zone" style={{ filter: 'url(#scrollBlur)' }}>
          <rect x="118" y="118" width="24" height="46" rx="10" fill="#070907" />
          <rect
            x="120"
            y="120"
            width="20"
            height="42"
            rx="8"
            fill="var(--scroll-color)"
            opacity={intensity}
          />
        </g>

        <g className="zone logo-zone">
          <circle cx="130" cy="248" r="32" fill="rgba(0,0,0,0.55)" />
          <circle cx="130" cy="248" r="60" fill="url(#logoGlow)" opacity={intensity * 0.55} />
          <g
            transform="translate(130 248)"
            fill="var(--logo-color)"
            opacity={intensity}
          >
            <path d="M-18 -8c4-8 12-12 22-10l4 -4c-12-4-26 0-32 12zM-14 0l8 0 4 14c1 2 4 2 5 0l4-14h8l-6 22c-2 6-10 6-12 0l-3-8-3 8c-2 6-10 6-12 0z" />
          </g>
        </g>

        <g className="zone side-zone">
          {sideButtons.map((btn) => (
            <g key={btn.label}>
              <rect
                x={btn.x}
                y={btn.y}
                width={btn.w}
                height={btn.h}
                rx={6}
                fill="rgba(0,0,0,0.55)"
                stroke="rgba(255,255,255,0.06)"
              />
              <rect
                x={btn.x + 2}
                y={btn.y + 2}
                width={btn.w - 4}
                height={btn.h - 4}
                rx={4}
                fill="var(--side-color)"
                opacity={intensity * 0.35}
              />
              <text
                x={btn.x + btn.w / 2}
                y={btn.y + btn.h / 2 + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="rgba(255,255,255,0.65)"
              >
                {btn.label}
              </text>
            </g>
          ))}
        </g>

        <path
          d="M82 60c-22 22-32 56-30 88l4 60"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  )
}

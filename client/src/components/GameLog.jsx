import { useEffect, useRef } from 'react'

export default function GameLog({ log }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
      <div className="section-title">Nhật ký</div>
      <div className="game-log">
        {log.map((entry, i) => (
          <div key={i} className="log-entry">{entry}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

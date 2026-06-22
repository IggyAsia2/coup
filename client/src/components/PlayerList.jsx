import { vi } from '../charNames'

export default function PlayerList({ players, myId, currentPlayerId, pendingResponses }) {
  return (
    <div>
      <div className="section-title">Người chơi</div>
      {players.map(p => {
        const isMe = p.id === myId
        const isCurrent = p.id === currentPlayerId
        const isEliminated = p.influence === 0
        const isPending = pendingResponses.includes(p.id)

        return (
          <div
            key={p.id}
            className={[
              'player-item',
              isCurrent && !isEliminated ? 'current-turn' : '',
              isEliminated ? 'eliminated' : '',
              isMe ? 'me' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="player-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {!isEliminated && isCurrent && (
                  <div className="dot-pulse" />
                )}
                <span className="player-name">{p.name}</span>
                {isMe && <span className="me-badge">bạn</span>}
                {isPending && !isEliminated && (
                  <span style={{ fontSize: '0.65rem', color: '#f5c518' }}>đang suy nghĩ...</span>
                )}
              </div>
              <span className="player-coins">💰 {p.coins}</span>
            </div>

            <div className="player-cards">
              {p.cards.map((card, i) => (
                <div
                  key={i}
                  className={[
                    'card-chip',
                    card.revealed ? 'revealed' : (card.character !== '?' ? card.character : 'hidden'),
                  ].filter(Boolean).join(' ')}
                >
                  {card.revealed ? `✗ ${vi(card.character)}` : (card.character === '?' ? '?' : vi(card.character))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

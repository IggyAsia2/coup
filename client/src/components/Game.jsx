import { useState } from 'react'
import PlayerList from './PlayerList'
import ActionPanel from './ActionPanel'
import GameLog from './GameLog'
import { vi } from '../charNames'

const TABS = [
  { id: 'action', label: 'Hành động', icon: '⚔️' },
  { id: 'players', label: 'Người chơi', icon: '👥' },
  { id: 'log', label: 'Nhật ký', icon: '📜' },
]

export default function Game({ gameState, myId, roomCode, isHost, emit, error, setError }) {
  const { phase, players, winner, log, currentPlayerId, pendingResponses, pendingLoseInfluence, isSpectator } = gameState
  const [activeTab, setActiveTab] = useState('action')

  const winnerPlayer = winner ? players.find(p => p.id === winner) : null

  // Auto-switch to action tab when it's my turn or I need to respond
  const myTurnActive =
    (phase === 'action' && currentPlayerId === myId) ||
    (phase === 'action_response' && pendingResponses.includes(myId)) ||
    (phase === 'block_response' && pendingResponses.includes(myId)) ||
    (phase === 'lose_influence' && pendingLoseInfluence?.playerId === myId) ||
    (phase === 'exchange_select' && gameState.currentAction?.actorId === myId)

  const actionNeedsAttention = myTurnActive && activeTab !== 'action'

  function handleLeave() {
    if (!window.confirm('Thoát và về màn hình chính?')) return
    emit('leave-room', {})
  }

  function handleRestart() {
    if (phase !== 'game_over' && !window.confirm('Bắt đầu ván mới? Ván hiện tại sẽ bị hủy.')) return
    emit('restart-game', {})
  }

  return (
    <div className="game-layout">
      {/* Top bar */}
      <div className="game-topbar">
        <span className="game-topbar-title">COUP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isHost && (
            <button className="btn-restart" onClick={handleRestart} title="Bắt đầu ván mới">
              ↺ Ván mới
            </button>
          )}
          <button className="btn-leave" onClick={handleLeave} title="Thoát phòng">
            ✕ Thoát
          </button>
          <span className="game-topbar-room">Phòng: <span>{roomCode}</span></span>
        </div>
      </div>

      {/* Mobile: player strip */}
      <div className="player-strip">
        {players.map(p => {
          const isMe = p.id === myId
          const isCurrent = p.id === currentPlayerId
          const isEliminated = p.influence === 0
          return (
            <div
              key={p.id}
              className={[
                'player-chip',
                isCurrent && !isEliminated ? 'current-turn' : '',
                isEliminated ? 'eliminated' : '',
                isMe ? 'me' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="player-chip-name">
                {isCurrent && !isEliminated && <span className="dot-pulse" style={{ marginRight: 3 }} />}
                {p.name}{isMe ? ' (bạn)' : ''}
              </div>
              <div className="player-chip-coins">💰 {p.coins}</div>
              <div className="player-chip-cards">
                {p.cards.map((c, i) => (
                  <div
                    key={i}
                    className={['chip-card', c.revealed ? 'revealed' : (c.character !== '?' ? c.character : '')].filter(Boolean).join(' ')}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* My cards bar */}
      {!isSpectator && <MyCardsBar players={players} myId={myId} />}

      {/* Tab content */}
      <div className="game-tab-content">
        {/* Desktop sidebar left */}
        <div className="game-sidebar-left" style={{ display: 'none' }}>
          <PlayerList
            players={players}
            myId={myId}
            currentPlayerId={currentPlayerId}
            pendingResponses={pendingResponses}
          />
        </div>

        {/* Desktop main */}
        <div className="game-main" style={{ display: 'none' }}>
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}
          <ActionPanel gameState={gameState} myId={myId} emit={emit} />
        </div>

        {/* Desktop sidebar right */}
        <div className="game-sidebar-right" style={{ display: 'none' }}>
          <GameLog log={log} />
        </div>

        {/* Mobile tab panels */}
        <div className="mobile-only">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {activeTab === 'action' && (
            <ActionPanel gameState={gameState} myId={myId} emit={emit} />
          )}

          {activeTab === 'players' && (
            <PlayerList
              players={players}
              myId={myId}
              currentPlayerId={currentPlayerId}
              pendingResponses={pendingResponses}
            />
          )}

          {activeTab === 'log' && <GameLog log={log} />}
        </div>
      </div>

      {/* Bottom tab bar (mobile) */}
      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ position: 'relative' }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
            {tab.id === 'action' && actionNeedsAttention && (
              <span className="notif" />
            )}
          </button>
        ))}
      </div>

      {/* Game Over */}
      {phase === 'game_over' && winnerPlayer && (
        <div className="game-over-overlay">
          <div className="game-over-box">
            <h2>Trò chơi kết thúc!</h2>
            <div>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Người thắng</div>
              <div className="winner-name">
                {winnerPlayer.id === myId ? '🏆 Bạn thắng!' : `🏆 ${winnerPlayer.name}`}
              </div>
            </div>
            {isHost ? (
              <button className="btn-primary" onClick={handleRestart} style={{ width: '100%' }}>
                Chơi lại
              </button>
            ) : (
              <p style={{ color: '#555', fontSize: '0.85rem' }}>Chờ chủ phòng khởi động lại...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CHAR_COLOR = {
  Duke:        { bg: '#2d2040', border: '#5e35b1', text: '#ce93d8', emoji: '👑' },
  Assassin:    { bg: '#2d1515', border: '#b71c1c', text: '#ef9a9a', emoji: '🗡️' },
  Captain:     { bg: '#0a1e30', border: '#0277bd', text: '#81d4fa', emoji: '⚓' },
  Ambassador:  { bg: '#0a1a0c', border: '#2e7d32', text: '#a5d6a7', emoji: '🕊️' },
  Contessa:    { bg: '#2a0d1a', border: '#ad1457', text: '#f48fb1', emoji: '🌹' },
}

function MyCardsBar({ players, myId }) {
  const me = players.find(p => p.id === myId)
  if (!me) return null

  return (
    <div className="my-cards-bar">
      <span className="my-cards-label">Bài của bạn</span>
      <div className="my-cards-row">
        {me.cards.map((card, i) => {
          const style = CHAR_COLOR[card.character] || { bg: '#1a2a40', border: '#2a4a6a', text: '#5a8ab0', emoji: '?' }
          return (
            <div
              key={i}
              className={`my-card-visual ${card.revealed ? 'dead' : ''}`}
              style={{
                background: card.revealed ? '#1a1a1a' : style.bg,
                borderColor: card.revealed ? '#333' : style.border,
              }}
            >
              {card.revealed ? (
                <>
                  <span className="my-card-emoji" style={{ opacity: 0.3 }}>{style.emoji}</span>
                  <span className="my-card-name" style={{ color: '#444', textDecoration: 'line-through' }}>
                    {vi(card.character)}
                  </span>
                  <span className="my-card-dead">mất</span>
                </>
              ) : (
                <>
                  <span className="my-card-emoji">{style.emoji}</span>
                  <span className="my-card-name" style={{ color: style.text }}>{vi(card.character)}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

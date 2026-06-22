import { useState } from 'react'
import { vi } from '../charNames'

const CHAR_NOTES = [
  { char: 'Duke',       color: '#b39ddb', emoji: '👑', ability: 'Thu thuế +3 đồng', block: 'Chặn Viện trợ nước ngoài' },
  { char: 'Assassin',  color: '#ef9a9a', emoji: '🗡️', ability: 'Ám sát (tốn 3 đồng)', block: null },
  { char: 'Captain',   color: '#81d4fa', emoji: '⚓', ability: 'Cướp +2 đồng từ người khác', block: 'Chặn Cướp (Captain hoặc Đại Sứ)' },
  { char: 'Ambassador',color: '#a5d6a7', emoji: '🕊️', ability: 'Đổi bài với bộ bài', block: 'Chặn Cướp' },
  { char: 'Contessa',  color: '#f48fb1', emoji: '🌹', ability: null, block: 'Chặn Ám sát' },
]

function CharNotes() {
  const [open, setOpen] = useState(false)
  return (
    <div className="char-notes">
      <button className="char-notes-toggle" onClick={() => setOpen(o => !o)}>
        ℹ️ Nhân vật {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="char-notes-body">
          {CHAR_NOTES.map(c => (
            <div key={c.char} className="char-note-row">
              <span className="char-note-name" style={{ color: c.color }}>{c.emoji} {vi(c.char)}</span>
              <div className="char-note-details">
                {c.ability && <span className="char-note-ability">⚔️ {c.ability}</span>}
                {c.block   && <span className="char-note-block">🛡️ {c.block}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BLOCK_CHARS = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
}

const ACTION_LABELS = {
  income: 'Thu nhập',
  foreign_aid: 'Viện trợ nước ngoài',
  coup: 'Đảo chính',
  tax: 'Thu thuế',
  assassinate: 'Ám sát',
  steal: 'Cướp',
  exchange: 'Trao đổi bài',
}

export default function ActionPanel({ gameState, myId, emit }) {
  const {
    phase,
    players,
    currentPlayerId,
    currentAction,
    currentBlock,
    pendingResponses,
    pendingLoseInfluence,
    exchangeCards,
    isSpectator,
    spectators,
  } = gameState

  const me = players.find(p => p.id === myId)
  const isMyTurn = currentPlayerId === myId
  const iAmPending = pendingResponses.includes(myId)

  // Spectator view
  if (isSpectator) {
    const cur = players.find(p => p.id === currentPlayerId)
    return (
      <div className="action-panel">
        <div className="spectator-badge">👁 Đang xem</div>
        <p className="waiting-msg" style={{ marginTop: '0.5rem' }}>
          {phase === 'game_over'
            ? 'Ván kết thúc — bạn sẽ tham gia ván tiếp theo!'
            : `Lượt của ${cur?.name ?? '...'}. Chờ ván mới để tham gia.`}
        </p>
        {(spectators?.length ?? 0) > 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#555' }}>
            Đang xem: {spectators.map(s => s.name).join(', ')}
          </div>
        )}
      </div>
    )
  }
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [selectedExchange, setSelectedExchange] = useState([])

  function sendAction(actionType, targetId) {
    emit('take-action', { actionType, targetId }, () => setSelectedTarget(null))
  }

  function sendChallenge() { emit('challenge', {}) }
  function sendBlock(char) { emit('block', { claimedCharacter: char }) }
  function sendPass() { emit('pass', {}) }

  // ── Lượt của mình: chọn hành động
  if (phase === 'action' && isMyTurn) {
    const activePlayers = players.filter(p => p.influence > 0 && p.id !== myId)
    const needsTarget = (type) => ['coup', 'assassinate', 'steal'].includes(type)

    function handleAction(type) {
      if (needsTarget(type)) {
        if (!selectedTarget) return
        sendAction(type, selectedTarget)
      } else {
        sendAction(type, null)
      }
    }

    const mustCoup = me.coins >= 10
    const canCoup = me.coins >= 7
    const canAssassinate = me.coins >= 3

    return (
      <div className="action-panel">
        <h3>Lượt của bạn — Chọn hành động</h3>

        <div className="target-select">
          <label>Chọn mục tiêu (Đảo chính / Ám sát / Cướp):</label>
          <div className="target-list">
            {activePlayers.map(p => (
              <button
                key={p.id}
                className={`target-btn ${selectedTarget === p.id ? 'selected' : ''}`}
                onClick={() => setSelectedTarget(selectedTarget === p.id ? null : p.id)}
              >
                {p.name} ({p.coins}💰)
              </button>
            ))}
          </div>
        </div>

        <div className="action-grid">
          <button
            className="action-btn"
            onClick={() => handleAction('income')}
            disabled={mustCoup}
          >
            Thu nhập
            <span className="cost">+1 đồng</span>
          </button>

          <button
            className="action-btn"
            onClick={() => handleAction('foreign_aid')}
            disabled={mustCoup}
          >
            Viện trợ
            <span className="cost">+2 đồng</span>
            <span className="claim">Bá Tước có thể chặn</span>
          </button>

          <button
            className="action-btn"
            onClick={() => handleAction('tax')}
            disabled={mustCoup}
          >
            Thu thuế
            <span className="cost">+3 đồng</span>
            <span className="claim">dùng Bá Tước</span>
          </button>

          <button
            className="action-btn"
            onClick={() => handleAction('steal')}
            disabled={mustCoup || !selectedTarget}
            title={!selectedTarget ? 'Chọn mục tiêu trước' : ''}
          >
            Cướp
            <span className="cost">+2 đồng</span>
            <span className="claim">dùng Đại Úy</span>
          </button>

          <button
            className="action-btn"
            onClick={() => handleAction('assassinate')}
            disabled={mustCoup || !canAssassinate || !selectedTarget}
            title={!canAssassinate ? 'Cần 3 đồng' : !selectedTarget ? 'Chọn mục tiêu' : ''}
          >
            Ám sát
            <span className="cost">3 đồng</span>
            <span className="claim">dùng Sát Thủ</span>
          </button>

          <button
            className="action-btn"
            onClick={() => handleAction('exchange')}
            disabled={mustCoup}
          >
            Đổi bài
            <span className="claim">dùng Đại Sứ</span>
          </button>

          <button
            className="action-btn coup-btn"
            onClick={() => handleAction('coup')}
            disabled={!canCoup || !selectedTarget}
            title={!canCoup ? 'Cần 7 đồng' : !selectedTarget ? 'Chọn mục tiêu' : ''}
          >
            Đảo chính {mustCoup && '(Bắt buộc!)'}
            <span className="cost">7 đồng</span>
          </button>
        </div>

        {mustCoup && (
          <p style={{ color: '#e74c3c', fontSize: '0.82rem', marginTop: '0.75rem', textAlign: 'center' }}>
            Bạn có 10+ đồng — bắt buộc phải Đảo chính!
          </p>
        )}
        <CharNotes />
      </div>
    )
  }

  // ── Mất ảnh hưởng
  if (phase === 'lose_influence' && pendingLoseInfluence?.playerId === myId) {
    const myCards = me.cards
      .map((c, i) => ({ ...c, i }))
      .filter(c => !c.revealed)

    return (
      <div className="lose-influence-panel">
        <h3>Chọn một lá bài để lật ngửa (mất ảnh hưởng)</h3>
        <div className="card-choices">
          {myCards.map(card => (
            <button
              key={card.i}
              className="card-choice-btn"
              onClick={() => emit('lose-influence', { cardIndex: card.i })}
            >
              {vi(card.character)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Đổi bài (Ambassador)
  if (phase === 'exchange_select' && currentAction?.actorId === myId && exchangeCards) {
    const myActiveCards = me.cards.filter(c => !c.revealed)
    const allCards = [
      ...myActiveCards.map(c => ({ character: c.character, source: 'tay' })),
      ...exchangeCards.map(c => ({ character: c, source: 'rút' })),
    ]
    const keepCount = myActiveCards.length

    function toggleExchange(idx) {
      setSelectedExchange(prev => {
        if (prev.includes(idx)) return prev.filter(i => i !== idx)
        if (prev.length >= keepCount) return prev
        return [...prev, idx]
      })
    }

    function confirmExchange() {
      emit('exchange-select', { selectedIndices: selectedExchange }, () => setSelectedExchange([]))
    }

    return (
      <div className="exchange-panel">
        <h3>Đổi bài</h3>
        <p>Chọn {keepCount} lá để giữ lại ({selectedExchange.length}/{keepCount} đã chọn)</p>
        <div className="exchange-cards">
          {allCards.map((card, i) => (
            <button
              key={i}
              className={`exchange-card-btn ${selectedExchange.includes(i) ? 'selected' : ''}`}
              onClick={() => toggleExchange(i)}
            >
              {vi(card.character)}
              <span className="card-source">{card.source}</span>
            </button>
          ))}
        </div>
        <button
          className="btn-primary"
          onClick={confirmExchange}
          disabled={selectedExchange.length !== keepCount}
          style={{ width: '100%' }}
        >
          Xác nhận
        </button>
      </div>
    )
  }

  // ── Phản hồi hành động (challenge / block / pass)
  if (phase === 'action_response' && iAmPending && currentAction) {
    const action = currentAction
    const actor = players.find(p => p.id === action.actorId)
    const target = action.targetId ? players.find(p => p.id === action.targetId) : null
    const isTarget = action.targetId === myId
    const blockChars = BLOCK_CHARS[action.type] || []
    const canBlockThis = blockChars.length > 0 && (action.type !== 'assassinate' || isTarget)

    return (
      <div className="action-panel">
        <h3>Phản hồi hành động</h3>
        <div className="action-announcement">
          <strong>{actor?.name}</strong> tuyên bố{' '}
          <strong>{ACTION_LABELS[action.type]}</strong>
          {action.claimedCharacter && <> (nhận là {vi(action.claimedCharacter)})</>}
          {target && <> → <strong>{target.name}</strong></>}
        </div>

        <div className="response-buttons">
          {action.claimedCharacter && (
            <button className="btn-danger" onClick={sendChallenge} style={{ width: '100%' }}>
              Thách thức (họ không có {vi(action.claimedCharacter)})
            </button>
          )}

          {canBlockThis && (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem' }}>Chặn bằng:</div>
              <div className="block-options">
                {blockChars.map(char => (
                  <button key={char} className="btn-warn" onClick={() => sendBlock(char)}>
                    Chặn bằng {vi(char)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn-ghost" onClick={sendPass} style={{ width: '100%' }}>
            Bỏ qua (cho phép)
          </button>
        </div>
        <CharNotes />
      </div>
    )
  }

  // ── Phản hồi chặn (challenge block hoặc pass)
  if (phase === 'block_response' && iAmPending && currentBlock) {
    const blocker = players.find(p => p.id === currentBlock.blockerId)
    const action = currentAction

    return (
      <div className="action-panel">
        <h3>Phản hồi lệnh chặn</h3>
        <div className="action-announcement">
          <strong>{blocker?.name}</strong> chặn{' '}
          {action && <strong>{ACTION_LABELS[action.type]}</strong>}{' '}
          bằng <strong>{vi(currentBlock.claimedCharacter)}</strong>
        </div>

        <div className="response-buttons">
          <button className="btn-danger" onClick={sendChallenge} style={{ width: '100%' }}>
            Thách thức (họ không có {vi(currentBlock.claimedCharacter)})
          </button>
          <button className="btn-ghost" onClick={sendPass} style={{ width: '100%' }}>
            Chấp nhận (để bị chặn)
          </button>
        </div>
        <CharNotes />
      </div>
    )
  }

  // ── Chờ
  const waitingFor = players.filter(p => pendingResponses.includes(p.id)).map(p => p.name)
  let waitMsg = ''

  if (phase === 'action' && !isMyTurn) {
    const cur = players.find(p => p.id === currentPlayerId)
    waitMsg = `Chờ ${cur?.name} chọn hành động...`
  } else if (phase === 'action_response' && !iAmPending) {
    waitMsg = waitingFor.length
      ? `Chờ: ${waitingFor.join(', ')}`
      : 'Đang xử lý hành động...'
  } else if (phase === 'block_response' && !iAmPending) {
    waitMsg = waitingFor.length
      ? `Chờ: ${waitingFor.join(', ')}`
      : 'Đang xử lý lệnh chặn...'
  } else if (phase === 'lose_influence') {
    const lp = players.find(p => p.id === pendingLoseInfluence?.playerId)
    waitMsg = `Chờ ${lp?.name} chọn bài để lật...`
  } else if (phase === 'exchange_select') {
    const actor = players.find(p => p.id === currentAction?.actorId)
    waitMsg = `Chờ ${actor?.name} chọn bài đổi...`
  }

  return (
    <div className="action-panel">
      <p className="waiting-msg">{waitMsg || 'Đang chờ...'}</p>
      <CharNotes />
    </div>
  )
}

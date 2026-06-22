export default function WaitingRoom({ gameState, roomCode, isHost, myId, onStart, error }) {
  const players = gameState?.players || []

  return (
    <div className="waiting-room">
      <h2 style={{ color: '#f5c518', fontSize: '1.5rem' }}>COUP</h2>

      <div className="room-code-display">
        <div className="code">{roomCode}</div>
        <p>Chia mã này cho bạn bè để vào phòng</p>
      </div>

      <div className="player-list-waiting">
        <h3>Người chơi ({players.length}/6)</h3>
        <ul>
          {players.map((p, i) => (
            <li key={p.id}>
              <span>{p.name}</span>
              {i === 0 && <span className="host-badge">CHỦ</span>}
              {p.id === myId && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#3498db' }}>bạn</span>}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {isHost ? (
        <button
          className="btn-primary"
          style={{ width: 200 }}
          onClick={onStart}
          disabled={players.length < 2}
        >
          {players.length < 2 ? 'Chờ thêm người...' : 'Bắt đầu'}
        </button>
      ) : (
        <p style={{ color: '#555' }}>Chờ chủ phòng bắt đầu...</p>
      )}

      <div style={{ color: '#333', fontSize: '0.75rem', maxWidth: 340, textAlign: 'center' }}>
        <p>Bá Tước · Sát Thủ · Đại Úy · Đại Sứ · Hầu Tước</p>
      </div>
    </div>
  )
}

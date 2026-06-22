import { useState } from 'react'

export default function Lobby({ onCreate, onJoin, error, setError }) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [tab, setTab] = useState('create') // create | join

  function submit() {
    setError('')
    if (!name.trim()) return setError('Nhập tên của bạn')
    if (tab === 'create') {
      onCreate(name.trim())
    } else {
      if (!joinCode.trim()) return setError('Nhập mã phòng')
      onJoin(name.trim(), joinCode.trim())
    }
  }

  return (
    <div className="lobby">
      <div>
        <h1>COUP</h1>
        <p className="lobby-subtitle">Trò chơi bài bluffing</p>
      </div>

      <div className="lobby-box">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            className={tab === 'create' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1, padding: '0.5rem' }}
            onClick={() => setTab('create')}
          >
            Tạo phòng
          </button>
          <button
            className={tab === 'join' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1, padding: '0.5rem' }}
            onClick={() => setTab('join')}
          >
            Vào phòng
          </button>
        </div>

        <input
          placeholder="Tên của bạn"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
          autoFocus
        />

        {tab === 'join' && (
          <input
            placeholder="Mã phòng (vd: XK4T2)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && submit()}
            maxLength={5}
            style={{ textTransform: 'uppercase', letterSpacing: '0.2rem', fontWeight: 700 }}
          />
        )}

        {error && <p className="error-msg">{error}</p>}

        <button className="btn-primary" onClick={submit}>
          {tab === 'create' ? 'Tạo phòng' : 'Vào phòng'}
        </button>
      </div>

      <div style={{ color: '#444', fontSize: '0.8rem', textAlign: 'center', maxWidth: 340 }}>
        <p>2–6 người chơi · Bluff để chiến thắng</p>
      </div>
    </div>
  )
}

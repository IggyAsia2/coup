import { useState, useEffect } from 'react'
import socket from './socket'
import Lobby from './components/Lobby'
import WaitingRoom from './components/WaitingRoom'
import Game from './components/Game'

function getPersistentId() {
  let id = localStorage.getItem('coup_pid')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('coup_pid', id)
  }
  return id
}

function saveSession(roomCode, playerName, isHost) {
  localStorage.setItem('coup_session', JSON.stringify({ roomCode, playerName, isHost }))
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem('coup_session')) } catch { return null }
}

function clearSession() {
  localStorage.removeItem('coup_session')
}

export default function App() {
  const [screen, setScreen] = useState('lobby')
  const [myId, setMyId] = useState(null)
  const [myName, setMyName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState('')
  const [rejoining, setRejoining] = useState(false)

  useEffect(() => {
    socket.connect()

    socket.on('connect', () => {
      setMyId(socket.id)

      // Thử rejoin nếu có session cũ
      const session = loadSession()
      if (session) {
        setRejoining(true)
        socket.emit('rejoin-room', {
          roomCode: session.roomCode,
          persistentId: getPersistentId(),
        }, (res) => {
          setRejoining(false)
          if (res.error) {
            clearSession()
            return
          }
          setRoomCode(session.roomCode)
          setMyName(session.playerName)
          setIsHost(res.isHost)
          setGameState(res.gameState)
          setScreen(res.gameState.phase === 'waiting' ? 'waiting' : 'game')
        })
      }
    })

    socket.on('state-update', (state) => {
      setGameState(state)
      if (state.phase === 'game_over') {
        setScreen('game')
      } else if (state.phase === 'waiting') {
        setScreen('waiting')
      } else {
        setScreen('game')
      }
    })

    return () => {
      socket.off('connect')
      socket.off('state-update')
    }
  }, [])

  function handleCreate(name) {
    setMyName(name)
    socket.emit('create-room', { playerName: name, persistentId: getPersistentId() }, (res) => {
      if (res.error) return setError(res.error)
      setRoomCode(res.roomCode)
      setIsHost(true)
      setGameState(res.gameState)
      saveSession(res.roomCode, name, true)
      setScreen('waiting')
    })
  }

  function handleJoin(name, code) {
    setMyName(name)
    socket.emit('join-room', { roomCode: code.toUpperCase(), playerName: name, persistentId: getPersistentId() }, (res) => {
      if (res.error) return setError(res.error)
      setRoomCode(code.toUpperCase())
      setIsHost(false)
      setGameState(res.gameState)
      saveSession(code.toUpperCase(), name, false)
      setScreen(res.gameState?.phase === 'waiting' ? 'waiting' : 'game')
    })
  }

  function handleStart() {
    socket.emit('start-game', {}, (res) => {
      if (res?.error) setError(res.error)
    })
  }

  function emit(event, data, cb) {
    if (event === 'leave-room') {
      socket.emit('leave-room', {}, () => {
        clearSession()
        setScreen('lobby')
        setGameState(null)
        setRoomCode('')
        setMyName('')
        setIsHost(false)
        setError('')
      })
      return
    }
    socket.emit(event, data, (res) => {
      if (res?.error) setError(res.error)
      cb?.()
    })
  }

  if (!myId || rejoining) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40vh', color: '#888' }}>
        {rejoining ? 'Đang kết nối lại...' : 'Đang kết nối...'}
      </div>
    )
  }

  if (screen === 'lobby') {
    return <Lobby onCreate={handleCreate} onJoin={handleJoin} error={error} setError={setError} />
  }

  if (screen === 'waiting') {
    return (
      <WaitingRoom
        gameState={gameState}
        roomCode={roomCode}
        isHost={isHost}
        myId={myId}
        onStart={handleStart}
        error={error}
      />
    )
  }

  return (
    <Game
      gameState={gameState}
      myId={myId}
      roomCode={roomCode}
      isHost={isHost}
      emit={emit}
      error={error}
      setError={setError}
    />
  )
}

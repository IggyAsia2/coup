import { io } from 'socket.io-client'

// Dev: vite proxy chuyển /socket.io → localhost:3001
// Production: kết nối cùng origin (Express serve static + socket.io cùng port)
const socket = io(
  import.meta.env.DEV ? 'http://localhost:3001' : undefined,
  { autoConnect: false }
)

export default socket

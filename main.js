import { WebSocketServer } from 'ws'
import { v4 as uuid } from 'uuid'

const PORT = process.env.PORT || 6969
const DEV = process.env.NODE_VARS === 'production'

let rooms = {}
let users = {}

const sendMessage = (ws, type, payload) => {
    ws.send(JSON.stringify({ type, payload }))
}

// User methods
const createUser = (ws) => {
    const id = uuid()
    const user = { id, ws }
    users[id] = user
    console.log('created user', user.id)
    return user
}

const removeUser = (user) => {
    delete users[user.id]
    // TODO: remove user from rooms they may be in
    console.log('removed user', user.id)
}

// Room methods
const createRoom = (initialUser) => {
    const id = uuid()
    const room = { id, host: initialUser, peer: null }
    rooms[id] = room
    console.log('created room', id);
    return room
}

// Connection methods
const handleError = (e) => {
    console.error(e)
}

const handleDisconnect = (user, code) => {
    console.log(`user ${user.id} disconnected, code: ${code}`)
    removeUser(user)
}

const handleMessage = ({ type, payload }, user) => {
    DEV && console.log('message', type, payload)
    switch (type) {
        case 'create-room':
            const room = createRoom(user)
            sendMessage(user.ws, 'room-created', room.id)
            break
        case 'join-any-room':
            let joined = false
            for (let rid in rooms) {
                const room = rooms[rid]
                if (!room.peer) {
                    room.peer = user
                    joined = true
                    sendMessage(room.host.ws, 'peer-joined', user.id)
                    sendMessage(user.ws, 'joined-room', room.id)
                    break
                }
            }
            if (!joined) {
                console.warn('could not join room', user.id)
            }
            break
        // TODO:
        case 'join-named-room': break
        case 'sdp-offer':
            const { peer } = rooms[payload.roomId]
            sendMessage(peer.ws, 'sdp-offer', payload.offer)
            break
        case 'sdp-answer':
            const { host } = rooms[payload.roomId]
            sendMessage(host.ws, 'sdp-answer', payload.answer)
            break
        case 'ice-candidate':
            const toRoom = rooms[payload.roomId]
            const toUser = toRoom.host.id === user.id ? toRoom.peer : toRoom.host
            sendMessage(toUser.ws, 'ice-candidate', payload.candidate)
            break
        // TODO: requires an old user id and a new user id
        // we remove the new user and put this user object
        // in the previous objects places
        case 'reconnect':
            break
        default: console.warn('unhandled message', { type, payload })
    }
}

const handleConnection = (ws) => {
    const user = createUser(ws)
    const messageHandler = (data) => handleMessage(JSON.parse(data.toString()), user)
    ws.on('message', messageHandler)
    ws.on('error', (e) => handleError(e))
    ws.on('close', (code) => {
        // TODO: destroy
        ws.off('message', messageHandler)
        handleDisconnect(user, code)
    })
    console.log(Object.keys(users))
}

const wss = new WebSocketServer({ port: PORT })
wss.on('connection', (ws) => handleConnection(ws))

console.log(`Websocket server listening on port ${PORT}`)

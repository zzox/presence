
import { WebSocket, WebSocketServer } from 'ws'
import { logger, LogLevel, setLogLevel } from './logger.js'
import { createRoom, rooms, removeUserFromRooms, getRoom } from './rooms.js'
import { createUser, removeUser, User, users } from './users.js'
import http from 'http'

type MessagePayload = {
    type: string,
    payload: any
}

const PORT = process.env.PORT || 6969

setLogLevel(LogLevel.Log)

export const sendMessage = (ws:WebSocket, type:string, payload:any) => {
    ws.send(JSON.stringify({ type, payload }))
}

const handleError = (e) => {
    logger.error(e)
}

const handleDisconnect = (user:User, code:number) => {
    logger.log(`user ${user.id} disconnected, code: ${code}`)
    removeUser(user)
    // ^^^ this calls vvv
    // removeUserFromRooms(user)
}

const handleMessage = ({ type, payload }:MessagePayload, user:User) => {
    logger.debug('message', type, payload)
    try {
        let willCreate = false
        switch (type) {
            case 'create-room':
                const room = createRoom(user)
                sendMessage(user.ws, 'room-created', room.id)
                break
            case 'join-or-create':
                // fall through to joining a room and creating if room isn't found
                willCreate = true
            case 'join-any-room':
                let joined = false
                rooms.forEach((room) => {
                    if (!joined && !room.peer) {
                        room.peer = user
                        joined = true
                        sendMessage(room.host.ws, 'peer-joined', user.id)
                        sendMessage(user.ws, 'joined-room', room.id)
                        return
                    }
                })
                if (!joined) {
                    if (willCreate) {
                        const room = createRoom(user)
                        sendMessage(user.ws, 'room-created', room.id)
                    } else {
                        throw new Error('No rooms available.');
                    }
                }
                break
            case 'leave-room':
                removeUserFromRooms(user)
                break
            // TODO:
            case 'join-named-room': break
            case 'sdp-offer':
                const { peer } = getRoom(payload.roomId)

                if (peer == null) {
                    throw new Error('Peer does not exist.')
                }

                sendMessage(peer.ws, 'sdp-offer', payload.offer)
                break
            case 'sdp-answer':
                const { host } = getRoom(payload.roomId)
                sendMessage(host.ws, 'sdp-answer', payload.answer)
                break
            case 'ice-candidate':
                const toRoom = getRoom(payload.roomId)
                const toUser = toRoom.host.id === user.id ? toRoom.peer : toRoom.host

                if (toUser == null) {
                    throw new Error('Peer has disappeared.')
                }

                sendMessage(toUser.ws, 'ice-candidate', payload.candidate)
                break
            // TODO: requires an old user id and a new user id
            // we remove the new user and put this user object
            // in the previous objects places
            case 'reconnect':
                break
            case 'ping':
                break
            default:
                throw new Error('Unhandled message')
        }
    } catch (e) {
        sendMessage(user.ws, 'error', e.message)
    }
}

let joins = 0

const handleConnection = (ws:WebSocket) => {
    joins++
    const user = createUser(ws)

    const messageHandler = (data) => handleMessage(JSON.parse(data.toString()), user)
    const errorHandler = (e) => handleError(e)
    const closeHandler = (code) => {
        ws.off('message', messageHandler)
        ws.off('error', errorHandler)
        ws.off('close', closeHandler)
        ws.close()
        handleDisconnect(user, code)
    }

    ws.on('message', messageHandler)
    ws.on('error', errorHandler)
    ws.on('close', closeHandler)

    logger.debug('num users:', Object.keys(users).length)
}

let maxUsers = 0
const startTime = Date.now()
let usercleanups = 0
let roomcleanups = 0

const server = http.createServer((req, res) => {
    const r:string[] = []
    rooms.forEach((_, id) => {
        r.push(id)
    })

    const u:string[] = []
    users.forEach((_, id) => {
        u.push(id)
    })

    if (u.length > maxUsers) {
        maxUsers = u.length
    }

    res.write(JSON.stringify({
        rooms: r,
        users: u,
        uptimeMinutes: Math.floor((Date.now() - startTime) / (60 * 1000)),
        maxUsers,
        joins,
        usercleanups,
        roomcleanups
    }))
    res.statusCode = 200
    res.end()
}).listen(PORT)

setInterval(() => {
    for (let id in users) {
        if (users[id].ws.readyState === WebSocket.CLOSED) {
            removeUserFromRooms(users[id])
            delete users[id]
            usercleanups++
        }
    }

    for (let id in rooms) {
        if (rooms[id].peer == null) {
            if (rooms[id].host.ws.readyState === WebSocket.CLOSED) {
                delete rooms[id]
                roomcleanups++
            }
        } else {
            if (rooms[id].host.ws.readyState === WebSocket.CLOSED && rooms[id].host.ws.readyState === WebSocket.CLOSED) {
                delete rooms[id]
                roomcleanups++
            }
        }
    }
}, 15 * 1000)

logger.info(`HTTP server listening on port ${PORT}`)

const wss = new WebSocketServer({ server })
wss.on('connection', (ws) => handleConnection(ws))

logger.info(`Websocket server listening on port ${PORT}`)

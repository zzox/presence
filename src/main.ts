
import { WebSocket, WebSocketServer } from 'ws'
import { logger } from './logger.js'
import { createRoom, rooms } from './rooms.js'
import { createUser, removeUser, User, users } from './users.js'

type MessagePayload = {
    type: string,
    payload: any
}

const PORT = process.env.PORT || 6969

const sendMessage = (ws:WebSocket, type:string, payload:any) => {
    ws.send(JSON.stringify({ type, payload }))
}

const handleError = (e) => {
    logger.error(e)
}

const handleDisconnect = (user:User, code:number) => {
    logger.log(`user ${user.id} disconnected, code: ${code}`)
    removeUser(user)
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
                    if (willCreate) {
                        const room = createRoom(user)
                        sendMessage(user.ws, 'room-created', room.id)
                    } else {
                        throw new Error('No rooms available.');
                    }
                }
                break
            // TODO:
            case 'join-named-room': break
            case 'sdp-offer':
                const { peer } = rooms[payload.roomId]

                if (peer == null) {
                    throw new Error('Peer does not exist.')
                }

                sendMessage(peer.ws, 'sdp-offer', payload.offer)
                break
            case 'sdp-answer':
                const { host } = rooms[payload.roomId]
                sendMessage(host.ws, 'sdp-answer', payload.answer)
                break
            case 'ice-candidate':
                const toRoom = rooms[payload.roomId]
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
            default:
                throw new Error('Unhandled message')
        }
    } catch (e) {
        sendMessage(user.ws, 'error', e.message)
    }
}

const handleConnection = (ws:WebSocket) => {
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

    logger.debug('users:', Object.keys(users))
}

const wss = new WebSocketServer({ port: PORT as number })
wss.on('connection', (ws) => handleConnection(ws))

logger.info(`Websocket server listening on port ${PORT}`)

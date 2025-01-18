import { v4 as uuid } from 'uuid'
import { logger } from './logger.js'
import { User } from './users.js'
import { sendMessage } from './main.js'

export type Room = {
    id: string,
    host: User,
    peer: User | null
}

type Rooms = {
    [key: string]: Room
}

export const rooms:Rooms = {}

export const createRoom = (initialUser:User):Room => {
    const id = uuid()
    const room = { id, host: initialUser, peer: null }
    rooms[id] = room
    logger.log('created room', id)
    return room
}

export const removeUserFromRooms = (user:User) => {
    for (let roomId in rooms) {
        if (rooms[roomId].peer === user) {
            rooms[roomId].peer = null
            // send a message to hosts ws?
            rooms[roomId].host && sendMessage(rooms[roomId].host.ws, 'peer-left', user.id)
            logger.log('removed from room', user.id)
            continue
        }

        if (rooms[roomId].host === user) {
            rooms[roomId].peer && sendMessage(rooms[roomId].peer.ws, 'peer-left', user.id)
            delete rooms[roomId]
            logger.log('removed from room', user.id)
            logger.log('destroyed room', roomId)
            // send a disconnect message to peers ws?
        }
    }
}

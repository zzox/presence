import { v4 as uuid } from 'uuid'
import { logger } from './logger.js'
import { User } from './users.js'

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
    logger.log('created room', id);
    return room
}

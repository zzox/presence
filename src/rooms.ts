import { v4 as uuid } from 'uuid'
import { logger } from './logger.js'
import { User } from './users.js'
import { sendMessage } from './main.js'

export enum RoomState {
    Open = 'open',
    Full = 'full',
    // Over = 'over'
}

export type Room = {
    id: string,
    host: User,
    peer: User | null,
    state: RoomState
}

type Rooms = Map<string, Room>

export const rooms:Rooms = new Map();

export const getRoom = (roomId:string):Room => {
    const room = rooms.get(roomId)
    if (!room) {
        throw new Error('No room exists with that id')
    }

    return room
}

export const createRoom = (initialUser:User):Room => {
    if (initialUser.roomId !== undefined) {
        throw 'User already in room'
    }

    const id = uuid()
    const room = { id, host: initialUser, state: RoomState.Open, peer: null }
    rooms.set(id, room)
    logger.log('created room', id)
    initialUser.roomId = id
    return room
}

export const joinRoom = (room:Room, user:User) => {
    if (room.peer !== null) {
        throw 'Peer already in room'
    }

    if (room.state === RoomState.Full) {
        throw 'Room is full'
    }

    room.peer = user
    room.state = RoomState.Full
}

export const removeUserFromRooms = (user:User) => {
    rooms.forEach((room, roomId) => {
        if (room.peer === user) {
            room.peer = null
            room.host && sendMessage(room.host.ws, 'peer-left', user.id)
            logger.log('removed from room', user.id)
            return
        }

        if (room.host === user) {
            rooms.delete(roomId)
            room.peer && sendMessage(room.peer.ws, 'peer-left', user.id)
            logger.log('removed from room', user.id)
            logger.log('destroyed room', roomId)
        }
    })

    user.roomId = undefined
}

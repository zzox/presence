import { logger } from './logger.js'
import { v4 as uuid } from 'uuid'
import { WebSocket } from 'ws'
import { removeUserFromRooms } from './rooms.js'

export type User = {
    id:string,
    ws:WebSocket,
    roomId?:string
}

type Users = Map<string, User>;

export const users:Users = new Map();

export const createUser = (ws:WebSocket):User => {
    const id = uuid()
    const user = { id, ws }
    users.set(id, user)
    logger.log('created user', user.id)
    return user
}

export const removeUser = (user:User) => {
    users.delete(user.id)
    removeUserFromRooms(user)
    logger.log('removed user', user.id)
}

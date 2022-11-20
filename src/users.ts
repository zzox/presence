import { logger } from './logger.js'
import { v4 as uuid } from 'uuid'
import { WebSocket } from 'ws'

export type User = {
    id:string,
    ws:WebSocket
}

type Users = {
    [key: string]: User
}

export const users:Users = {}

export const createUser = (ws:WebSocket):User => {
    const id = uuid()
    const user = { id, ws }
    users[id] = user
    logger.log('created user', user.id)
    return user
}

export const removeUser = (user:User) => {
    delete users[user.id]
    // TODO: remove user from rooms they may be in
    logger.log('removed user', user.id)
}

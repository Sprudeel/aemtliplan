import prisma from '~/server/utils/prisma'
import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

const SESSION_COOKIE = 'sid'
const DAYS = 30

const isProd = () => process.env.NODE_ENV === 'production'

export function setSessionCookie(event: H3Event, token: string, maxAgeSec: number) {
    setCookie(event, SESSION_COOKIE, token, {
        httpOnly: true, secure: isProd(), sameSite: 'lax', path: '/', maxAge: maxAgeSec,
    })
}

export async function createSession(event: H3Event, userId: number) {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + DAYS * 24 * 3600 * 1000)
    await prisma.session.create({ data: { id: token, userId, expiresAt } })
    setSessionCookie(event, token, DAYS * 24 * 3600)
}

export async function getSession(event: H3Event) {
    const token = getCookie(event, SESSION_COOKIE)
    if (!token) return null
    const s = await prisma.session.findUnique({ where: { id: token }, include: { user: true } })
    if (!s || s.expiresAt.getTime() <= Date.now()) {
        if (s) await prisma.session.delete({ where: { id: s.id } }).catch(() => {})
        deleteCookie(event, SESSION_COOKIE, { path: '/' })
        return null
    }
    return s
}

export async function requireUser(event: H3Event) {
    const s = await getSession(event)
    if (!s) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    return s.user
}

export async function requireAdmin(event: H3Event) {
    const u = await requireUser(event)
    if (u.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    return u
}
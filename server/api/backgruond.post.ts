// Takes as an input a new image file with high resolution and then uploads it to the public/ folder with the name backgruond.png
import { readMultipartFormData } from 'h3'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
    const parts = await readMultipartFormData(event)
    if (!parts || !parts.length) {
        throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
    }

    // Find the first file-like part
    const file = parts.find(p => p.type && p.filename)
    if (!file) {
        throw createError({ statusCode: 400, statusMessage: 'No image file part found' })
    }

    // Optionally validate mime
    const allowed = ['image/png']
    if (file.type && !allowed.includes(file.type)) {
        throw createError({ statusCode: 415, statusMessage: 'Unsupported media type' })
    }

    const dest = join(process.cwd(), 'public', 'newbackground.png')
    await fsp.writeFile(dest, file.data)

    return { ok: true, path: '/newbackground.png' }
})

export const config = {
    api: {
        bodyParser: false
    }
}

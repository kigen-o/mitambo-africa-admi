
import { PrismaClient } from '@prisma/client'
console.log('PrismaClient loaded')
try {
    const prisma = new PrismaClient()
    console.log('PrismaClient instantiated')
} catch (e) {
    console.error(e)
}

import express from 'express'
import cors from 'cors'
import type { Server } from 'http'
import 'reflect-metadata'
import 'dotenv/config'
import { AppDataSource } from './config/database'
import authRoutes from './routes/auth'
import companyRoutes from './routes/companies'
import userRoutes from './routes/users'
import warehouseRoutes from './routes/warehouses'
import locationRoutes from './routes/locations'
import complianceRoutes from './routes/compliance'
import productRoutes from './routes/products'
import customerRoutes from './routes/customers'

const app = express()
const PORT = parseInt(process.env.PORT || '3006', 10)

let server: Server | null = null
let shuttingDown = false

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/users', userRoutes)
app.use('/api/warehouses', warehouseRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/compliance', complianceRoutes)
app.use('/api/products', productRoutes)
app.use('/api/customers', customerRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'medical-cloud-backend' })
})

app.get('/', (_req, res) => {
  res.json({ message: '医享云进销存系统后端服务运行中' })
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const reportPortConflict = (port: number) => {
  console.error(`端口 ${port} 已被旧进程占用，新代码未加载。请先结束旧进程再启动：`)
  console.error(`  netstat -ano | findstr :${port}`)
  console.error(`  taskkill /PID <PID> /F`)
}

const startServer = async (port: number) => {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      server = await new Promise<Server>((resolve, reject) => {
        const nextServer = app.listen(port, () => resolve(nextServer))
        nextServer.once('error', reject)
      })
      console.log(`服务器运行在 http://localhost:${port}`)
      return
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code !== 'EADDRINUSE') {
        console.error('服务器启动失败:', err)
        process.exit(1)
        return
      }
      if (attempt < 12) {
        await sleep(500)
        continue
      }
      try {
        const probe = await fetch(`http://127.0.0.1:${port}/api/health`)
        if (probe.ok) {
          reportPortConflict(port)
        } else {
          console.error(`端口 ${port} 已被占用且服务不可用，请先关闭占用进程后再启动`)
        }
      } catch {
        console.error(`端口 ${port} 已被占用且服务不可用，请先关闭占用进程后再启动`)
      }
      process.exit(1)
    }
  }
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`收到 ${signal}，正在关闭服务...`)

  const closeServer = () =>
    new Promise<void>(resolve => {
      if (!server) {
        resolve()
        return
      }
      server.close(() => resolve())
    })

  const closeDb = () =>
    AppDataSource.isInitialized
      ? AppDataSource.destroy().catch(() => undefined)
      : Promise.resolve()

  await Promise.race([
    Promise.all([closeServer(), closeDb()]),
    sleep(3000)
  ])

  process.exit(0)
}

process.once('SIGINT', () => { void shutdown('SIGINT') })
process.once('SIGTERM', () => { void shutdown('SIGTERM') })

AppDataSource.initialize()
  .then(async () => {
    console.log('数据库连接成功')
    await startServer(PORT)
  })
  .catch((error) => {
    console.error('数据库连接失败:', error)
    process.exit(1)
  })

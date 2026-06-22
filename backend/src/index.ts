import express from 'express'
import cors from 'cors'
import 'reflect-metadata'
import 'dotenv/config'
import { AppDataSource } from './config/database'
import authRoutes from './routes/auth'
import companyRoutes from './routes/companies'
import userRoutes from './routes/users'
import warehouseRoutes from './routes/warehouses'
import locationRoutes from './routes/locations'
import complianceRoutes from './routes/compliance'

const app = express()
let PORT = parseInt(process.env.PORT || '3000')

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/users', userRoutes)
app.use('/api/warehouses', warehouseRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/compliance', complianceRoutes)

app.get('/', (req, res) => {
  res.json({ message: '医享云进销存系统后端服务运行中' })
})

AppDataSource.initialize()
  .then(() => {
    console.log('数据库连接成功')
    const startServer = (port: number) => {
      const server = app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`)
      })
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`端口 ${port} 已被占用，请先关闭旧的后端进程后再启动`)
          process.exit(1)
        } else {
          console.error('服务器启动失败:', err)
          process.exit(1)
        }
      })
    }
    startServer(PORT)
  })
  .catch((error) => {
    console.error('数据库连接失败:', error)
  })
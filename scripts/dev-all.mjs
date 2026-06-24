/**
 * 一键启动前后端（Windows 友好）
 * - 已在运行：直接打开浏览器
 * - 端口被死进程占用：自动清理后重启
 * - 双击「启动开发服务.bat」即可，无需 cd
 */
import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = path.join(root, 'backend')
const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'
const LOGIN_URL = 'http://localhost:5174/login'
const BACKEND_PORT = 3006
const FRONTEND_PORT = 5174

const children = []

async function probe(url, accept401 = false) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return res.ok || (accept401 && res.status === 401)
  } catch {
    return false
  }
}

function killPort(port) {
  if (!isWin) return
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const pids = new Set()
    out.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
    })
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`[dev:all] 已释放端口 ${port} (PID ${pid})`)
      } catch {
        // ignore
      }
    })
  } catch {
    // ignore
  }
}

function openBrowser(url) {
  if (!isWin) return
  spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
}

function start(label, cwd) {
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
    shell: false,
    windowsHide: false
  })
  child.on('exit', (code, signal) => {
    if (signal) return
    if (code && code !== 0) {
      console.error(`[dev:all] ${label} 已退出 (code ${code})`)
      shutdown(code || 1)
    }
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  children.forEach(child => {
    if (!child.killed) child.kill()
  })
  process.exit(code)
}

async function waitUntilReady(timeoutMs = 60000) {
  const startAt = Date.now()
  while (Date.now() - startAt < timeoutMs) {
    const backendOk =
      (await probe(`http://127.0.0.1:${BACKEND_PORT}/api/health`)) ||
      (await probe(`http://127.0.0.1:${BACKEND_PORT}/api/companies`, true))
    const frontendOk = await probe(`http://127.0.0.1:${FRONTEND_PORT}/`)
    if (backendOk && frontendOk) return true
    await new Promise(r => setTimeout(r, 800))
  }
  return false
}

async function main() {
  console.log('[dev:all] 检查服务状态...')

  const backendOk =
    (await probe(`http://127.0.0.1:${BACKEND_PORT}/api/health`)) ||
    (await probe(`http://127.0.0.1:${BACKEND_PORT}/api/companies`, true))
  const frontendOk = await probe(`http://127.0.0.1:${FRONTEND_PORT}/`)

  if (backendOk && frontendOk) {
    console.log('[dev:all] 前后端已在运行，正在打开浏览器...')
    console.log(`[dev:all] ${LOGIN_URL}`)
    openBrowser(LOGIN_URL)
    console.log('[dev:all] 完成。关闭此窗口不影响已在运行的服务。')
    return
  }

  if (!backendOk) {
    console.log('[dev:all] 后端未就绪，清理端口并启动...')
    killPort(BACKEND_PORT)
  }
  if (!frontendOk) {
    console.log('[dev:all] 前端未就绪，清理端口并启动...')
    killPort(FRONTEND_PORT)
  }

  console.log(`[dev:all] 启动后端 (http://localhost:${BACKEND_PORT}) ...`)
  start('backend', backendDir)

  await new Promise(r => setTimeout(r, 2000))

  console.log(`[dev:all] 启动前端 (http://localhost:${FRONTEND_PORT}) ...`)
  start('frontend', root)

  console.log('[dev:all] 等待服务就绪...')
  const ready = await waitUntilReady()
  if (ready) {
    console.log('[dev:all] 启动成功！')
    console.log(`[dev:all] ${LOGIN_URL}`)
    openBrowser(LOGIN_URL)
  } else {
    console.log('[dev:all] 启动超时，请稍后在浏览器手动打开上述地址')
  }
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch(err => {
  console.error('[dev:all] 启动失败:', err)
  process.exit(1)
})

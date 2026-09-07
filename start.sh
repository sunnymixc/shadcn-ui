#!/bin/bash
# shadcn-ui 前端服务管理脚本（本地开发模式）
# 用法: ./start.sh {start|stop|restart|status|man}
#   start/restart 以 npm run dev 后台运行 vite dev 服务器（端口: 6201，带 HMR），
#   不做生产构建；仅在 node_modules 缺失或过期时按需安装依赖。
#   本脚本的 PID/日志/端口与 deploy.sh（生产模式，6200）完全隔离，
#   两套服务可同时运行、互不抢占。详细说明见 ./start.sh man

APP_NAME="shadcn-ui"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-6201}"
# 默认只绑 127.0.0.1：vite dev server 会按需读取源码目录下的任意文件，
# 绑 0.0.0.0 等于把整个工作区暴露到局域网。需要手机联调时显式 HOST=0.0.0.0 覆盖。
HOST="${HOST:-127.0.0.1}"
PID_FILE="$APP_DIR/.$APP_NAME.pid"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/$APP_NAME.log"
INSTALL_LOG="$LOG_DIR/install.log"
# 进程命令行特征：仅用于 PID 文件失效后按端口回退时，确认端口上的进程确实是本脚本
# 起的 vite（argv 含 <APP_DIR>/node_modules/...），而不是碰巧占用该端口的其他项目。
# 用绝对路径而非裸 "vite"，避免误杀别处的 vite 服务
PROC_PATTERN="$APP_DIR/node_modules"
START_TIMEOUT=30
STOP_TIMEOUT=10

# 进程是否存活
is_alive() {
	[ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

# 读取 PID 文件中的 PID（进程已死则返回空）
get_pid() {
	local pid
	[ -f "$PID_FILE" ] || return 0
	pid="$(cat "$PID_FILE" 2>/dev/null)"
	if is_alive "$pid"; then
		echo "$pid"
	fi
}

# 端口是否处于监听状态
port_listening() {
	lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1
}

# 递归收集进程及其全部后代 PID（npm -> sh -> node/vite 进程树）
collect_tree() {
	local pid="$1" child
	echo "$pid"
	for child in $(pgrep -P "$pid" 2>/dev/null); do
		collect_tree "$child"
	done
}

# 进程树中是否还有存活进程
tree_alive() {
	local pid
	for pid in $1; do
		is_alive "$pid" && return 0
	done
	return 1
}

# 终止整个进程树：先 TERM，超时后 KILL；等待所有进程退出且端口释放
kill_tree() {
	local root="$1" pids waited=0 leftover
	pids="$(collect_tree "$root")"
	kill $pids 2>/dev/null
	while [ $waited -lt $STOP_TIMEOUT ]; do
		if ! tree_alive "$pids" && ! port_listening; then
			return 0
		fi
		sleep 1
		waited=$((waited + 1))
	done
	echo "[$APP_NAME] 进程未在 ${STOP_TIMEOUT}s 内退出，强制终止..."
	kill -9 $pids 2>/dev/null
	# 兜底：按端口清理仍在监听的进程
	leftover="$(lsof -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null)"
	[ -n "$leftover" ] && kill -9 $leftover 2>/dev/null
	return 0
}

# 依赖是否需要重新安装：node_modules 缺失，或 package.json / package-lock.json 比它更新
deps_outdated() {
	[ ! -d "$APP_DIR/node_modules" ] && return 0
	[ "$APP_DIR/package.json" -nt "$APP_DIR/node_modules" ] && return 0
	[ -f "$APP_DIR/package-lock.json" ] && [ "$APP_DIR/package-lock.json" -nt "$APP_DIR/node_modules" ] && return 0
	return 1
}

# 按需安装依赖（输出同时打到终端和 $INSTALL_LOG，便于失败后回看）
install_deps() {
	local rc
	deps_outdated || {
		echo "[$APP_NAME] 依赖已是最新，跳过安装"
		return 0
	}
	mkdir -p "$LOG_DIR"
	cd "$APP_DIR" || return 1
	echo "[$APP_NAME] 正在安装依赖 (npm install)..."
	npm install 2>&1 | tee "$INSTALL_LOG"
	rc=${PIPESTATUS[0]}
	if [ "$rc" -ne 0 ]; then
		echo "[$APP_NAME] 依赖安装失败 (exit: $rc)，日志: $INSTALL_LOG"
		return 1
	fi
	return 0
}

start() {
	local pid waited=0
	pid="$(get_pid)"
	if [ -n "$pid" ]; then
		echo "[$APP_NAME] 已在运行 (PID: $pid, 端口: $PORT)，无需重复启动"
		return 0
	fi
	if port_listening; then
		echo "[$APP_NAME] 端口 $PORT 已被其他进程占用，启动失败（可用 PORT 覆盖端口）："
		lsof -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null
		return 1
	fi
	if ! command -v npm >/dev/null 2>&1; then
		echo "[$APP_NAME] 未找到 npm，请先安装 Node.js 环境"
		return 1
	fi

	install_deps || return 1

	mkdir -p "$LOG_DIR"
	echo "[$APP_NAME] 正在启动 (npm run dev, 端口: $PORT)..."
	cd "$APP_DIR" || return 1
	# --strictPort 必须带：默认行为是端口被占时静默 +1 漂到 6202，
	# 那样按 $PORT 轮询会一直失败判为“启动超时”，而实际上有个野服务在 6202 上跑着，
	# PID 文件已被删除，之后再也 stop 不掉。
	# npm run 需要 `--` 把参数透传给 vite。
	nohup npm run dev -- --port "$PORT" --strictPort --host "$HOST" >>"$LOG_FILE" 2>&1 &
	pid=$!
	echo "$pid" >"$PID_FILE"

	# 轮询等待端口监听
	while [ $waited -lt $START_TIMEOUT ]; do
		if ! is_alive "$pid"; then
			echo "[$APP_NAME] 启动失败，进程已退出，最近日志如下："
			tail -n 20 "$LOG_FILE"
			rm -f "$PID_FILE"
			return 1
		fi
		if port_listening; then
			echo "[$APP_NAME] 启动成功 (PID: $pid)"
			echo "  访问地址: http://localhost:$PORT"
			echo "  日志文件: $LOG_FILE"
			return 0
		fi
		sleep 1
		waited=$((waited + 1))
	done
	echo "[$APP_NAME] 启动超时 (${START_TIMEOUT}s)，端口 $PORT 仍未监听，最近日志如下："
	tail -n 20 "$LOG_FILE"
	return 1
}

stop() {
	local pid
	pid="$(get_pid)"
	if [ -z "$pid" ]; then
		# PID 文件失效时，回退按端口查找；但只认命令行匹配本项目的进程，
		# 否则会把碰巧占用该端口的无关进程一起停掉
		pid="$(lsof -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1)"
		if [ -z "$pid" ]; then
			echo "[$APP_NAME] 未在运行"
			rm -f "$PID_FILE"
			return 0
		fi
		if ! ps -o command= -p "$pid" 2>/dev/null | grep -qF -- "$PROC_PATTERN"; then
			# ${pid} 必须加花括号：macOS bash 3.2 在 UTF-8 环境下会把紧跟的中文标点
			# 首字节当作变量名的一部分，导致 PID 显示为空且字符被截断
			echo "[$APP_NAME] 未在运行（端口 $PORT 被非本脚本启动的进程占用: PID ${pid}，未做处理）"
			rm -f "$PID_FILE"
			return 0
		fi
		echo "[$APP_NAME] PID 文件失效，按端口 $PORT 找到进程 (PID: $pid)"
	fi
	echo "[$APP_NAME] 正在停止 (PID: $pid)..."
	kill_tree "$pid"
	rm -f "$PID_FILE"
	echo "[$APP_NAME] 已停止"
}

status() {
	local pid
	pid="$(get_pid)"
	if [ -n "$pid" ]; then
		if port_listening; then
			echo "[$APP_NAME] 运行中 (PID: $pid, 端口: $PORT)"
			echo "  访问地址: http://localhost:$PORT"
			echo "  日志文件: $LOG_FILE"
		else
			echo "[$APP_NAME] 进程存活 (PID: $pid)，但端口 $PORT 尚未监听（可能正在启动中）"
		fi
		return 0
	fi
	if [ -f "$PID_FILE" ]; then
		echo "[$APP_NAME] 已停止（清理残留 PID 文件）"
		rm -f "$PID_FILE"
	else
		echo "[$APP_NAME] 已停止"
	fi
	return 1
}

# 详细手册。函数名不叫 man：若有人 `source ./start.sh`，同名函数会永久遮蔽
# 他那个 shell 里的系统 man 命令。命令行入口仍然是 ./start.sh man
man_page() {
	cat <<EOF
名称
  $(basename "$0") - shadcn-ui 开发模式（vite dev server）管理脚本

用法
  $0 {start|stop|restart|status|man}

命令
  start     启动 vite dev server（带 HMR）；已在运行时直接返回成功。
            启动前按需安装依赖，并检查端口占用（被占则报错退出，不抢占）。
  stop      停止服务。优先用 PID 文件；PID 文件失效时按端口回退查找，
            但只终止命令行属于本项目的进程，无关进程一律不动。
  restart   等价于 stop 后 start。
  status    查看运行状态。运行中退出码 0，已停止退出码 1（便于脚本判断）。
  man       显示本手册。help / -h / --help 等效。

端口与地址
  开发模式  http://localhost:$PORT   （本脚本，vite dev server，源码热更新）
  生产模式  http://localhost:6200    （deploy.sh，node server.mjs 托管 dist/）
  两者端口、PID 文件、日志文件均独立，可同时运行、互不干扰。

文件位置
  项目目录  $APP_DIR
  PID 文件  $PID_FILE
  运行日志  $LOG_FILE
  安装日志  $INSTALL_LOG
  日志为追加写入，不会自动轮转；体积过大时可自行删除，不影响运行中的服务。

环境变量
  PORT      监听端口，默认 6201。例: PORT=6301 $0 start
  HOST      监听地址，默认 127.0.0.1（仅本机可访问）。
            设为 0.0.0.0 可供局域网访问，但 vite dev server 会按需读取源码
            目录下的文件，请仅在可信网络中这样做。

示例
  $0 start                    启动开发服务器
  $0 status                   查看是否在运行
  $0 restart                  重启（改了 vite.config 等需要重启的配置时用）
  PORT=6301 $0 start          换个端口启动
  HOST=0.0.0.0 $0 restart     开放到局域网，供手机调试
  tail -f $LOG_FILE           实时查看日志

说明
  - 本脚本只负责开发模式，不做生产构建。要验证构建产物请用 ./deploy.sh。
  - 依赖安装是按需的：仅当 node_modules 缺失，或 package.json /
    package-lock.json 比 node_modules 更新时才执行 npm install。
  - 启动使用 --strictPort：端口被占时直接失败，绝不静默漂移到相邻端口。
EOF
}

usage() {
	echo "Usage: $0 {start|stop|restart|status|man}"
	echo "详细说明请执行: $0 man"
	exit 1
}

case "$1" in
	start)
		start
		;;
	stop)
		stop
		;;
	restart)
		stop
		start
		;;
	status)
		status
		;;
	man|help|-h|--help)
		man_page
		;;
	*)
		usage
		;;
esac

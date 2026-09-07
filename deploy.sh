#!/bin/bash
# shadcn-ui 编译部署脚本（本地生产模式：先编译，再运行编译产物）
# 用法: ./deploy.sh {build|start|stop|deploy|status|man}
#   build   按需装依赖 + vite build，产出 dist/；不动运行中的服务
#   start   直接启动已有编译产物（node server.mjs 托管 dist/，端口: 6200）
#   stop    停止；status 查看状态（运行中返回 0，已停止返回 1）
#   deploy  = build + stop + start。必须先 build 成功再 stop：
#           编译失败时旧服务完全不受影响，仍在对外提供服务。
#   本脚本的 PID/日志加 -deploy 后缀，与 start.sh（开发模式，6201）完全隔离，
#   端口也另起一套，故 dev 与 deploy 两套服务可同时在跑、互不抢占。
#   详细说明见 ./deploy.sh man

APP_NAME="shadcn-ui-deploy"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-6200}"
# 生产产物是纯静态文件，不含源码，默认绑 0.0.0.0 便于同网段设备访问演示
HOST="${HOST:-0.0.0.0}"
SERVER_JS="$APP_DIR/server.mjs"
DIST_DIR="$APP_DIR/dist"
DIST_INDEX="$DIST_DIR/index.html"
PID_FILE="$APP_DIR/.$APP_NAME.pid"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/$APP_NAME.log"
BUILD_LOG="$LOG_DIR/build.log"
INSTALL_LOG="$LOG_DIR/install-deploy.log"
# 进程命令行特征：仅用于 PID 文件失效后按端口回退时，确认端口上的进程确实是本脚本
# 起的静态服务器（node <APP_DIR>/server.mjs）。带绝对路径，从而与 start.sh 起的
# vite、以及别处的同名 server.mjs 都区分得开
PROC_PATTERN="$SERVER_JS"
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

# 递归收集进程及其全部后代 PID。server.mjs 是单进程、没有子进程，
# 这里保留树形收集是为了与 start.sh 行为一致，且不依赖“它永远是单进程”这个假设
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

# 终止整个进程树：先 TERM（server.mjs 会走优雅关闭），超时后 KILL；
# 等待所有进程退出且端口释放
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

# 取文件 mtime 的可读时间。macOS 的 date -r 收的是秒数不是文件名（与 GNU 相反），
# 所以优先用 BSD stat，失败再退回 GNU stat，保证脚本在 Linux 上也能用
file_mtime() {
	stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$1" 2>/dev/null \
		|| stat -c "%y" "$1" 2>/dev/null | cut -d. -f1
}

# 编译：按需装依赖 + vite build，校验产物存在
build() {
	local rc
	if ! command -v npx >/dev/null 2>&1; then
		echo "[$APP_NAME] 未找到 npx，请先安装 Node.js 环境"
		return 1
	fi
	install_deps || return 1
	mkdir -p "$LOG_DIR"
	cd "$APP_DIR" || return 1
	echo "[$APP_NAME] 正在编译 (vite build)..."
	# 用 npx vite build 而不是 npm run build：绕开 package.json 里 build 脚本串联的
	# tsc -b —— 类型错误不该阻断“把演示跑起来”这件事；
	# 需要类型检查时单独执行 npm run typecheck。
	npx vite build 2>&1 | tee "$BUILD_LOG"
	rc=${PIPESTATUS[0]}
	if [ "$rc" -ne 0 ]; then
		echo "[$APP_NAME] 编译失败 (exit: $rc)，日志: $BUILD_LOG"
		return 1
	fi
	if [ ! -f "$DIST_INDEX" ]; then
		echo "[$APP_NAME] 编译完成但未找到产物: $DIST_INDEX"
		return 1
	fi
	echo "[$APP_NAME] 编译完成"
	echo "  产物目录: $DIST_DIR"
	echo "  产物大小: $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1)"
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
	if ! command -v node >/dev/null 2>&1; then
		echo "[$APP_NAME] 未找到 node，请先安装 Node.js 环境"
		return 1
	fi
	if [ ! -f "$SERVER_JS" ]; then
		echo "[$APP_NAME] 未找到静态服务器脚本: $SERVER_JS"
		return 1
	fi
	if [ ! -f "$DIST_INDEX" ]; then
		echo "[$APP_NAME] 未找到编译产物 ($DIST_INDEX)，请先执行 $0 build"
		return 1
	fi

	mkdir -p "$LOG_DIR"
	echo "[$APP_NAME] 正在启动 (node server.mjs, 端口: $PORT)..."
	cd "$APP_DIR" || return 1
	# 变量赋值前缀作用于 nohup，nohup 再 exec node，故 $! 拿到的就是 node 自身的 PID，
	# 中间不会多一层进程，stop 时按 PID 直接 TERM 即可命中
	PORT="$PORT" HOST="$HOST" ACCESS_LOG="${ACCESS_LOG:-0}" \
		nohup node "$SERVER_JS" >>"$LOG_FILE" 2>&1 &
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
		# PID 文件失效时，回退按端口查找；但只认命令行匹配本脚本运行方式的进程，
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
	local pid rc=1
	pid="$(get_pid)"
	if [ -n "$pid" ]; then
		if port_listening; then
			echo "[$APP_NAME] 运行中"
			echo "  PID:      $pid"
			echo "  端口:     $PORT (监听地址 $HOST)"
			echo "  访问地址: http://localhost:$PORT"
		else
			echo "[$APP_NAME] 进程存活 (PID: $pid)，但端口 $PORT 尚未监听（可能正在启动中）"
		fi
		rc=0
	elif [ -f "$PID_FILE" ]; then
		echo "[$APP_NAME] 已停止（清理残留 PID 文件）"
		rm -f "$PID_FILE"
	else
		echo "[$APP_NAME] 已停止"
	fi
	echo "  日志文件: $LOG_FILE"
	# 产物信息独立于运行状态输出：服务没起来时，最常见的原因就是压根没 build 过
	if [ -f "$DIST_INDEX" ]; then
		echo "  编译产物: $DIST_DIR (大小 $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1))"
		echo "  构建时间: $(file_mtime "$DIST_INDEX")"
	else
		echo "  编译产物: 不存在（请先执行 $0 build）"
	fi
	return $rc
}

# 编译并重启：先 build 成功再 stop —— 编译失败时运行中的旧服务完全不受影响
deploy() {
	build || return 1
	stop
	start
}

# 详细手册。函数名不叫 man：若有人 `source ./deploy.sh`，同名函数会永久遮蔽
# 他那个 shell 里的系统 man 命令。命令行入口仍然是 ./deploy.sh man
man_page() {
	cat <<EOF
名称
  $(basename "$0") - shadcn-ui 生产模式（vite build + Node 静态服务器）管理脚本

用法
  $0 {build|start|stop|deploy|status|man}

命令
  build     按需安装依赖后执行 vite build，产出 dist/。
            只编译，不停服、不启服，运行中的服务完全不受影响。
  start     用 node server.mjs 托管 dist/ 并后台运行。
            产物不存在时直接报错，提示先执行 $0 build。
  stop      停止服务。先发 SIGTERM 让服务器优雅关闭，超时才强杀。
            PID 文件失效时按端口回退，但只终止确实是本脚本启动的进程。
  deploy    = build + stop + start（日常发布用这个）。
            顺序是先编译再停服：编译失败则旧服务继续对外服务，不产生停机窗口。
  status    查看运行状态、PID、端口、日志路径、产物是否存在及构建时间。
            运行中退出码 0，已停止退出码 1。
  man       显示本手册。help / -h / --help 等效。

端口与地址
  生产模式  http://localhost:$PORT   （本脚本，node server.mjs 托管 dist/）
  开发模式  http://localhost:6201    （start.sh，vite dev server，带 HMR）
  两者端口、PID 文件、日志文件均独立，可同时运行、互不干扰。

文件位置
  项目目录  $APP_DIR
  静态服务  $SERVER_JS
  编译产物  $DIST_DIR
  PID 文件  $PID_FILE
  运行日志  $LOG_FILE
  编译日志  $BUILD_LOG
  安装日志  $INSTALL_LOG
  日志为追加写入，不会自动轮转；体积过大时可自行删除，不影响运行中的服务。

环境变量
  PORT        监听端口，默认 6200。例: PORT=6300 $0 deploy
  HOST        监听地址，默认 0.0.0.0（局域网可访问）。设为 127.0.0.1 则仅本机。
  ACCESS_LOG  设为 1 时 server.mjs 记录每条请求的访问日志（默认关闭）。

静态服务器行为（server.mjs，零依赖，只用 Node 内置模块）
  - /assets/* 带内容 hash，响应 Cache-Control: immutable，缓存一年。
  - index.html 响应 Cache-Control: no-cache，每次回源校验，配合 ETag 走 304。
  - 前端路由回退：路径不存在且看起来像页面路由时返回 index.html（200）。
    但 /assets/ 下以及带已知资源扩展名的路径【不】回退，直接 404 ——
    避免拼错的 .js 拿到 text/html 后报成 MIME 错误，掩盖真正的原因。
  - 只接受 GET / HEAD，其余返回 405；解码后越出 dist/ 的路径返回 403。

示例
  $0 deploy                   编译并重启（日常发布）
  $0 build                    只编译，先看产物大小再决定要不要重启
  $0 status                   查看服务状态和产物构建时间
  PORT=6300 $0 deploy         换个端口发布
  ACCESS_LOG=1 $0 start       带访问日志启动，排查 404 时用
  tail -f $LOG_FILE           实时查看日志

说明
  - 本脚本跑的是构建产物，改了源码必须重新 $0 deploy 才会生效；
    需要热更新请用 ./start.sh（开发模式，6201）。
  - 依赖安装是按需的：仅当 node_modules 缺失，或 package.json /
    package-lock.json 比 node_modules 更新时才执行 npm install。
  - build 用 npx vite build，不走 npm run build，从而绕开串联的 tsc -b：
    类型错误不阻断构建；需要类型检查请单独执行 npm run typecheck。
EOF
}

usage() {
	echo "Usage: $0 {build|start|stop|deploy|status|man}"
	echo "详细说明请执行: $0 man"
	exit 1
}

case "$1" in
	build)
		build
		;;
	start)
		start
		;;
	stop)
		stop
		;;
	deploy)
		deploy
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

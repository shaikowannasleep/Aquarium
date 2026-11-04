package main

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed index.html
var indexHTML string

// ---------- data types ----------

type Proc struct {
	PID   int     `json:"pid"`
	PPID  int     `json:"ppid"`
	Name  string  `json:"name"`
	Cmd   string  `json:"cmd"`
	Start string  `json:"start"`
	MemMB float64 `json:"memMB"`
}

type Listener struct {
	Proto string
	Addr  string
	Port  int
	PID   int
}

type PortRow struct {
	Port      int      `json:"port"`
	Proto     string   `json:"proto"`
	Addrs     []string `json:"addrs"`
	Scope     string   `json:"scope"` // local | lan
	PID       int      `json:"pid"`
	Name      string   `json:"name"`
	Cmd       string   `json:"cmd"`
	Group     string   `json:"group"`
	System    bool     `json:"system"`
	Protected bool     `json:"protected"`
}

type ProcRow struct {
	Proc
	Ports     []int  `json:"ports"`
	Children  int    `json:"children"`
	Parent    string `json:"parent"`
	System    bool   `json:"system"`
	Protected bool   `json:"protected"`
}

type Group struct {
	Key   string    `json:"key"`
	Title string    `json:"title"`
	Icon  string    `json:"icon"`
	Procs []ProcRow `json:"procs"`
}

type Snapshot struct {
	Ports   []PortRow `json:"ports"`
	Groups  []Group   `json:"groups"`
	TookMS  int64     `json:"tookMs"`
	Time    string    `json:"time"`
	OS      string    `json:"os"`
	Warning string    `json:"warning,omitempty"`
}

// ---------- classification ----------

type category struct {
	key, title, icon string
	names            []string
}

var categories = []category{
	{"shell", "Terminal / Shell (bash, cmd, PowerShell…)", "⌨️", []string{"bash", "sh", "zsh", "fish", "dash", "mintty", "git-bash", "cmd", "powershell", "pwsh", "wsl", "nu", "tmux", "screen"}},
	{"node", "Node.js / JS runtime", "🟩", []string{"node", "bun", "deno", "npm", "npx", "yarn", "pnpm", "tsx", "nodemon"}},
	{"python", "Python", "🐍", []string{"python", "python3", "pythonw", "py", "uvicorn", "gunicorn", "celery", "jupyter", "jupyter-lab", "jupyter-notebook", "streamlit", "flask"}},
	{"java", "Java / JVM", "☕", []string{"java", "javaw", "gradle", "mvn", "kotlin"}},
	{"dotnet", ".NET / Go / Rust / PHP / Ruby", "⚙️", []string{"dotnet", "go", "air", "cargo", "php", "php-cgi", "ruby", "rails", "puma", "perl"}},
	{"db", "Database / Server", "🗄️", []string{"postgres", "mysqld", "mariadbd", "mongod", "redis-server", "memurai", "nginx", "httpd", "caddy", "rabbitmq-server", "elasticsearch", "ollama", "minio"}},
	{"docker", "Docker / WSL", "🐳", []string{"com.docker.backend", "com.docker.build", "docker", "dockerd", "docker desktop", "vpnkit", "wslrelay", "wslhost", "vmmem", "vmmemwsl"}},
}

var systemNames = map[string]bool{
	"system": true, "system idle process": true, "idle": true, "svchost": true, "lsass": true,
	"wininit": true, "services": true, "spoolsv": true, "csrss": true, "smss": true, "winlogon": true,
	"explorer": true, "dwm": true, "registry": true, "memory compression": true, "fontdrvhost": true,
	"searchhost": true, "searchindexer": true, "msmpeng": true, "nissrv": true, "sihost": true,
	"systemd": true, "systemd-resolved": true, "systemd-networkd": true, "sshd": true, "cupsd": true,
	"launchd": true, "mdnsresponder": true, "rapportd": true, "controlcenter": true, "init": true,
	"avahi-daemon": true, "chronyd": true, "dnsmasq": true, "rpcbind": true, "jhi_service": true,
}

func baseName(n string) string {
	n = strings.ToLower(strings.TrimSpace(n))
	n = strings.TrimSuffix(n, ".exe")
	if i := strings.LastIndexAny(n, `/\`); i >= 0 {
		n = n[i+1:]
	}
	return n
}

func classify(name string) string {
	b := baseName(name)
	for _, c := range categories {
		for _, n := range c.names {
			if b == n {
				return c.key
			}
		}
	}
	// python3.11, node18 ...
	for _, pre := range []string{"python", "node", "java", "php", "ruby", "postgres"} {
		if strings.HasPrefix(b, pre) {
			for _, c := range categories {
				for _, n := range c.names {
					if n == pre {
						return c.key
					}
				}
			}
		}
	}
	return ""
}

func isSystem(p Proc) bool {
	if p.PID <= 4 {
		return true
	}
	return systemNames[baseName(p.Name)]
}

// ---------- scanning ----------

func scan() Snapshot {
	t0 := time.Now()
	var warn []string

	var procs []Proc
	var lst []Listener
	var perr, lerr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); procs, perr = listProcs() }()
	go func() { defer wg.Done(); lst, lerr = listListeners() }()
	wg.Wait()
	if perr != nil {
		warn = append(warn, "Không đọc được danh sách tiến trình: "+perr.Error())
	}
	if lerr != nil {
		warn = append(warn, "Không đọc được danh sách cổng: "+lerr.Error())
	}

	byPID := map[int]*Proc{}
	children := map[int][]int{}
	for i := range procs {
		p := &procs[i]
		byPID[p.PID] = p
	}
	for _, p := range procs {
		if p.PPID != p.PID {
			if _, ok := byPID[p.PPID]; ok {
				children[p.PPID] = append(children[p.PPID], p.PID)
			}
		}
	}

	self := os.Getpid()
	// ancestors of self are protected (killing them would kill this app)
	protected := map[int]bool{self: true}
	for cur, seen := self, map[int]bool{}; ; {
		p, ok := byPID[cur]
		if !ok || seen[cur] {
			break
		}
		seen[cur] = true
		protected[p.PPID] = true
		cur = p.PPID
	}
	// descendants of self (netstat / powershell helpers) are hidden
	hidden := map[int]bool{}
	var hide func(int)
	hide = func(pid int) {
		for _, c := range children[pid] {
			if !hidden[c] {
				hidden[c] = true
				hide(c)
			}
		}
	}
	hide(self)

	descendants := func(pid int) []int {
		var out []int
		seen := map[int]bool{pid: true}
		stack := []int{pid}
		for len(stack) > 0 {
			cur := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			for _, c := range children[cur] {
				if !seen[c] {
					seen[c] = true
					out = append(out, c)
					stack = append(stack, c)
				}
			}
		}
		return out
	}

	// ports per pid
	portsOf := map[int][]int{}
	type key struct {
		proto string
		port  int
		pid   int
	}
	agg := map[key]*PortRow{}
	for _, l := range lst {
		if hidden[l.PID] {
			continue
		}
		k := key{l.Proto, l.Port, l.PID}
		row, ok := agg[k]
		if !ok {
			row = &PortRow{Port: l.Port, Proto: l.Proto, PID: l.PID, Scope: "local"}
			if p, ok := byPID[l.PID]; ok {
				row.Name = p.Name
				row.Cmd = p.Cmd
				row.System = isSystem(*p)
				row.Group = classify(p.Name)
			} else {
				row.Name = "?"
				row.System = l.PID <= 4
			}
			row.Protected = protected[l.PID]
			agg[k] = row
			if !containsInt(portsOf[l.PID], l.Port) {
				portsOf[l.PID] = append(portsOf[l.PID], l.Port)
			}
		}
		if !containsStr(row.Addrs, l.Addr) {
			row.Addrs = append(row.Addrs, l.Addr)
		}
		if !isLoopback(l.Addr) {
			row.Scope = "lan"
		}
	}
	var ports []PortRow
	for _, r := range agg {
		ports = append(ports, *r)
	}
	sort.Slice(ports, func(i, j int) bool {
		if ports[i].Port != ports[j].Port {
			return ports[i].Port < ports[j].Port
		}
		return ports[i].PID < ports[j].PID
	})

	// groups
	groupMap := map[string]*Group{}
	var order []string
	for _, c := range categories {
		groupMap[c.key] = &Group{Key: c.key, Title: c.title, Icon: c.icon}
		order = append(order, c.key)
	}
	groupMap["other"] = &Group{Key: "other", Title: "Tiến trình khác đang giữ cổng", Icon: "🔌"}
	order = append(order, "other")

	for _, p := range procs {
		if hidden[p.PID] || p.PID == self {
			continue
		}
		g := classify(p.Name)
		allPorts := append([]int{}, portsOf[p.PID]...)
		desc := descendants(p.PID)
		for _, d := range desc {
			for _, pt := range portsOf[d] {
				if !containsInt(allPorts, pt) {
					allPorts = append(allPorts, pt)
				}
			}
		}
		sort.Ints(allPorts)
		if g == "" {
			if len(portsOf[p.PID]) == 0 || isSystem(p) {
				continue
			}
			g = "other"
		}
		parent := ""
		if pp, ok := byPID[p.PPID]; ok {
			parent = pp.Name
		}
		groupMap[g].Procs = append(groupMap[g].Procs, ProcRow{
			Proc: p, Ports: allPorts, Children: len(desc), Parent: parent,
			System: isSystem(p), Protected: protected[p.PID],
		})
	}
	var groups []Group
	for _, k := range order {
		g := groupMap[k]
		if len(g.Procs) == 0 {
			continue
		}
		sort.Slice(g.Procs, func(i, j int) bool {
			a, b := g.Procs[i], g.Procs[j]
			if (len(a.Ports) > 0) != (len(b.Ports) > 0) {
				return len(a.Ports) > 0
			}
			return a.PID < b.PID
		})
		groups = append(groups, *g)
	}

	return Snapshot{
		Ports: ports, Groups: groups,
		TookMS:  time.Since(t0).Milliseconds(),
		Time:    time.Now().Format("15:04:05"),
		OS:      runtime.GOOS,
		Warning: strings.Join(warn, " · "),
	}
}

func isLoopback(addr string) bool {
	a := strings.Trim(addr, "[]")
	if a == "localhost" {
		return true
	}
	if i := strings.Index(a, "%"); i >= 0 {
		a = a[:i]
	}
	ip := net.ParseIP(a)
	return ip != nil && ip.IsLoopback()
}

func containsInt(s []int, v int) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}
func containsStr(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

// splitHostPort handles "0.0.0.0:80", "[::]:80", "*:80", "[fe80::1%5]:80"
func splitHostPort(s string) (string, int, bool) {
	i := strings.LastIndex(s, ":")
	if i <= 0 {
		return "", 0, false
	}
	port, err := strconv.Atoi(s[i+1:])
	if err != nil {
		return "", 0, false
	}
	return s[:i], port, true
}

// ---------- killing ----------

type KillResult struct {
	PID int    `json:"pid"`
	OK  bool   `json:"ok"`
	Msg string `json:"msg"`
}

func killPIDs(pids []int, allowSystem bool) []KillResult {
	snap, _ := listProcs()
	byPID := map[int]Proc{}
	for _, p := range snap {
		byPID[p.PID] = p
	}
	self := os.Getpid()
	prot := map[int]bool{self: true}
	for cur, seen := self, map[int]bool{}; ; {
		p, ok := byPID[cur]
		if !ok || seen[cur] {
			break
		}
		seen[cur] = true
		prot[p.PPID] = true
		cur = p.PPID
	}
	var out []KillResult
	done := map[int]bool{}
	for _, pid := range pids {
		if done[pid] {
			continue
		}
		done[pid] = true
		r := KillResult{PID: pid}
		p, known := byPID[pid]
		switch {
		case pid <= 4:
			r.Msg = "PID hệ thống, không thể kill"
		case prot[pid]:
			r.Msg = "Đây là app này (hoặc cửa sổ chạy nó) — bỏ qua"
		case known && isSystem(p) && !allowSystem:
			r.Msg = "Tiến trình hệ thống — bật \"Cho phép kill hệ thống\" nếu chắc chắn"
		default:
			if err := killTree(pid); err != nil {
				r.Msg = err.Error()
			} else {
				r.OK = true
				name := p.Name
				if name == "" {
					name = "PID"
				}
				r.Msg = fmt.Sprintf("Đã ngắt %s (%d)", name, pid)
			}
		}
		out = append(out, r)
	}
	return out
}

// ---------- http ----------

var token string

func main() {
	b := make([]byte, 16)
	rand.Read(b)
	token = hex.EncodeToString(b)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprint(w, strings.Replace(indexHTML, "__TOKEN__", token, 1))
	})
	mux.HandleFunc("/api/scan", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, scan())
	}))
	mux.HandleFunc("/api/kill", guard(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			PIDs        []int `json:"pids"`
			AllowSystem bool  `json:"allowSystem"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		writeJSON(w, killPIDs(req.PIDs, req.AllowSystem))
	}))
	mux.HandleFunc("/api/killport", guard(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Port        int  `json:"port"`
			AllowSystem bool `json:"allowSystem"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		lst, err := listListeners()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		var pids []int
		for _, l := range lst {
			if l.Port == req.Port && !containsInt(pids, l.PID) {
				pids = append(pids, l.PID)
			}
		}
		if len(pids) == 0 {
			writeJSON(w, []KillResult{{PID: 0, Msg: fmt.Sprintf("Không có tiến trình nào đang listen cổng %d", req.Port)}})
			return
		}
		writeJSON(w, killPIDs(pids, req.AllowSystem))
	}))
	mux.HandleFunc("/api/quit", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]bool{"ok": true})
		go func() { time.Sleep(300 * time.Millisecond); os.Exit(0) }()
	}))

	port := 47321
	if v := os.Getenv("PORTKILLER_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			port = n
		}
	}
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fmt.Println("Không mở được server:", err)
			waitEnter()
			return
		}
	}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())
	fmt.Println("==============================================")
	fmt.Println("  Port & Process Killer đang chạy")
	fmt.Println("  Mở trình duyệt:", url)
	fmt.Println("  Đóng cửa sổ này (hoặc bấm Thoát trên web) để tắt")
	fmt.Println("==============================================")
	if os.Getenv("PORTKILLER_NO_BROWSER") == "" {
		go func() { time.Sleep(300 * time.Millisecond); openBrowser(url) }()
	}
	if err := http.Serve(ln, mux); err != nil {
		fmt.Println(err)
		waitEnter()
	}
}

func guard(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Token") != token {
			http.Error(w, "forbidden", 403)
			return
		}
		h(w, r)
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(v)
}

func waitEnter() {
	fmt.Println("Nhấn Enter để thoát...")
	var s string
	fmt.Scanln(&s)
}

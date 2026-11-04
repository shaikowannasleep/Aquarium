//go:build !windows

package main

import (
	"fmt"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

var pidRe = regexp.MustCompile(`pid=(\d+)`)

func listListeners() ([]Listener, error) {
	if runtime.GOOS == "linux" {
		out, err := exec.Command("ss", "-ltnupH").Output()
		if err == nil {
			return parseSS(string(out)), nil
		}
	}
	out, err := exec.Command("lsof", "-nP", "-iTCP", "-sTCP:LISTEN").Output()
	if err != nil {
		return nil, err
	}
	return parseLsof(string(out)), nil
}

func parseSS(s string) []Listener {
	var out []Listener
	for _, line := range strings.Split(s, "\n") {
		f := strings.Fields(line)
		if len(f) < 5 {
			continue
		}
		proto := "TCP"
		if f[0] == "udp" {
			proto = "UDP"
		} else if f[0] != "tcp" {
			continue
		}
		host, port, ok := splitHostPort(f[4])
		if !ok {
			continue
		}
		pid := 0
		if m := pidRe.FindStringSubmatch(line); m != nil {
			pid, _ = strconv.Atoi(m[1])
		}
		out = append(out, Listener{Proto: proto, Addr: host, Port: port, PID: pid})
	}
	return out
}

func parseLsof(s string) []Listener {
	var out []Listener
	for i, line := range strings.Split(s, "\n") {
		f := strings.Fields(line)
		if i == 0 || len(f) < 9 {
			continue
		}
		pid, _ := strconv.Atoi(f[1])
		host, port, ok := splitHostPort(f[8])
		if !ok {
			continue
		}
		out = append(out, Listener{Proto: "TCP", Addr: host, Port: port, PID: pid})
	}
	return out
}

func listProcs() ([]Proc, error) {
	out, err := exec.Command("ps", "-eo", "pid=,ppid=,rss=,comm=,args=").Output()
	if err != nil {
		return nil, err
	}
	var procs []Proc
	for _, line := range strings.Split(string(out), "\n") {
		f := strings.Fields(line)
		if len(f) < 4 {
			continue
		}
		pid, e1 := strconv.Atoi(f[0])
		ppid, e2 := strconv.Atoi(f[1])
		rss, _ := strconv.ParseFloat(f[2], 64)
		if e1 != nil || e2 != nil {
			continue
		}
		procs = append(procs, Proc{PID: pid, PPID: ppid, Name: f[3], Cmd: strings.Join(f[4:], " "), MemMB: rss / 1024})
	}
	return procs, nil
}

func killTree(pid int) error {
	procs, _ := listProcs()
	children := map[int][]int{}
	for _, p := range procs {
		children[p.PPID] = append(children[p.PPID], p.PID)
	}
	var order []int
	var walk func(int)
	seen := map[int]bool{}
	walk = func(p int) {
		if seen[p] {
			return
		}
		seen[p] = true
		for _, c := range children[p] {
			walk(c)
		}
		order = append(order, p) // children first
	}
	walk(pid)
	var firstErr error
	for _, p := range order {
		if err := syscall.Kill(p, syscall.SIGTERM); err != nil && p == pid {
			firstErr = err
		}
	}
	if firstErr != nil {
		return fmt.Errorf("%v (thử chạy bằng sudo)", firstErr)
	}
	time.Sleep(400 * time.Millisecond)
	for _, p := range order {
		syscall.Kill(p, syscall.SIGKILL)
	}
	return nil
}

func openBrowser(url string) {
	if runtime.GOOS == "darwin" {
		exec.Command("open", url).Start()
		return
	}
	exec.Command("xdg-open", url).Start()
}

//go:build windows

package main

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
)

const createNoWindow = 0x08000000

func command(name string, args ...string) *exec.Cmd {
	c := exec.Command(name, args...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
	return c
}

func listListeners() ([]Listener, error) {
	out, err := command("netstat", "-ano").Output()
	if err != nil {
		return nil, err
	}
	return parseNetstat(string(out)), nil
}

const psScript = `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;` +
	`Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{` +
	`p=[int]$_.ProcessId;pp=[int]$_.ParentProcessId;n=$_.Name;c=$_.CommandLine;` +
	`s=$(if($_.CreationDate){$_.CreationDate.ToString('yyyy-MM-dd HH:mm')}else{''});` +
	`m=[double]$_.WorkingSetSize } } | ConvertTo-Json -Compress`

func listProcs() ([]Proc, error) {
	out, err := command("powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript).Output()
	if err == nil {
		if procs, perr := parsePSJSON(out); perr == nil && len(procs) > 0 {
			return procs, nil
		}
	}
	// fallback: tasklist (no parent / command line)
	return listProcsTasklist()
}

func listProcsTasklist() ([]Proc, error) {
	out, err := command("tasklist", "/FO", "CSV", "/NH").Output()
	if err != nil {
		return nil, err
	}
	rd := csv.NewReader(bytes.NewReader(out))
	rd.FieldsPerRecord = -1
	recs, err := rd.ReadAll()
	if err != nil {
		return nil, err
	}
	var procs []Proc
	for _, r := range recs {
		if len(r) < 2 {
			continue
		}
		pid, err := strconv.Atoi(r[1])
		if err != nil {
			continue
		}
		procs = append(procs, Proc{PID: pid, PPID: -1, Name: r[0]})
	}
	return procs, nil
}

func killTree(pid int) error {
	out, err := command("taskkill", "/PID", strconv.Itoa(pid), "/T", "/F").CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		low := strings.ToLower(msg)
		if strings.Contains(low, "access") || strings.Contains(low, "denied") || strings.Contains(low, "từ chối") {
			msg += " → thử chạy app bằng \"Run as administrator\""
		}
		return fmt.Errorf("%s", msg)
	}
	return nil
}

func openBrowser(url string) {
	command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

package main

import (
	"bytes"
	"encoding/json"
	"strconv"
	"strings"
)

// parseNetstat reads `netstat -ano`. Works on localized Windows too:
// a TCP socket is listening when its foreign address is x:0 / [::]:0.
func parseNetstat(s string) []Listener {
	var out []Listener
	for _, line := range strings.Split(s, "\n") {
		f := strings.Fields(line)
		if len(f) < 4 {
			continue
		}
		proto := strings.ToUpper(f[0])
		switch {
		case strings.HasPrefix(proto, "TCP") && len(f) >= 5:
			if !strings.HasSuffix(f[2], ":0") {
				continue
			}
			host, port, ok := splitHostPort(f[1])
			pid, err := strconv.Atoi(f[len(f)-1])
			if !ok || err != nil {
				continue
			}
			out = append(out, Listener{Proto: "TCP", Addr: host, Port: port, PID: pid})
		case strings.HasPrefix(proto, "UDP") && len(f) == 4:
			host, port, ok := splitHostPort(f[1])
			pid, err := strconv.Atoi(f[3])
			if !ok || err != nil {
				continue
			}
			out = append(out, Listener{Proto: "UDP", Addr: host, Port: port, PID: pid})
		}
	}
	return out
}

func parsePSJSON(b []byte) ([]Proc, error) {
	b = bytes.TrimSpace(bytes.TrimPrefix(b, []byte("\xef\xbb\xbf")))
	type raw struct {
		P  int     `json:"p"`
		PP int     `json:"pp"`
		N  string  `json:"n"`
		C  *string `json:"c"`
		S  string  `json:"s"`
		M  float64 `json:"m"`
	}
	var arr []raw
	if len(b) > 0 && b[0] == '{' {
		var one raw
		if err := json.Unmarshal(b, &one); err != nil {
			return nil, err
		}
		arr = []raw{one}
	} else if err := json.Unmarshal(b, &arr); err != nil {
		return nil, err
	}
	procs := make([]Proc, 0, len(arr))
	for _, r := range arr {
		c := ""
		if r.C != nil {
			c = *r.C
		}
		procs = append(procs, Proc{PID: r.P, PPID: r.PP, Name: r.N, Cmd: c, Start: r.S, MemMB: r.M / 1048576})
	}
	return procs, nil
}

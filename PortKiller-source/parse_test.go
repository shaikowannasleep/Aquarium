package main

import "testing"

func TestNetstat(t *testing.T) {
	s := `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1180
  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       9920
  TCP    127.0.0.1:5173         127.0.0.1:53211        ESTABLISHED     9920
  TCP    [::]:3000              [::]:0                 LISTENING       4410
  TCP    [::1]:8000             [::]:0                 ĐANG NGHE       5000
  UDP    0.0.0.0:5353           *:*                                    2200
`
	l := parseNetstat(s)
	if len(l) != 5 {
		t.Fatalf("got %d: %+v", len(l), l)
	}
	if l[3].Addr != "[::1]" || l[3].Port != 8000 || l[3].PID != 5000 {
		t.Fatal(l[3])
	}
	if !isLoopback(l[3].Addr) || isLoopback(l[2].Addr) {
		t.Fatal("loopback")
	}
}

func TestPS(t *testing.T) {
	b := []byte("\xef\xbb\xbf" + `[{"p":4,"pp":0,"n":"System","c":null,"s":"","m":0},{"p":9920,"pp":800,"n":"node.exe","c":"node vite","s":"2026-11-03 10:00","m":104857600}]`)
	p, err := parsePSJSON(b)
	if err != nil || len(p) != 2 || p[1].MemMB != 100 || p[1].Cmd != "node vite" {
		t.Fatal(err, p)
	}
	one, err := parsePSJSON([]byte(`{"p":1,"pp":0,"n":"x","c":"y","s":"","m":0}`))
	if err != nil || len(one) != 1 {
		t.Fatal(err)
	}
	if classify("node.exe") != "node" || classify("python3.11") != "python" || classify("bash.exe") != "shell" || classify("C:\\x\\pwsh.exe") != "shell" {
		t.Fatal("classify")
	}
}

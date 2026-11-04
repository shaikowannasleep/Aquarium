// Calm deep-sea Three.js background. Fixed canvas #ocean-bg, no CDN.
// Fallback: if anything throws, the CSS gradient on <html> stays visible.
import * as THREE from 'three';

(function () {
  'use strict';
  const canvas = document.getElementById('ocean-bg');
  if (!canvas) return;

  const fail = (err) => {
    if (err) console.warn('[ocean-bg] disabled:', err.message || err);
    document.documentElement.classList.add('no-webgl');
    canvas.remove();
  };

  try {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isMobile = () => window.innerWidth <= 760;
    const dprCap = () => (isMobile() ? 1 : 1.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x0b1620, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 0, 6);

    // --- Gradient backdrop (full-screen quad in clip space, sRGB values written directly) ---
    const bgMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: [
        'varying vec2 vUv;',
        'void main(){',
        '  vec3 bottom = vec3(0.027, 0.059, 0.086);', // ~ #070f16
        '  vec3 top    = vec3(0.075, 0.150, 0.205);', // ~ #132634
        '  float t = smoothstep(0.0, 1.0, vUv.y);',
        '  gl_FragColor = vec4(mix(bottom, top, t), 1.0);',
        '}'
      ].join('\n')
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -10;
    scene.add(bg);

    // --- Soft light shafts (additive, opacity <= 0.08) ---
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0.06 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec2 vUv; uniform float uOpacity;',
        'void main(){',
        '  float across = 1.0 - abs(vUv.x - 0.5) * 2.0;',
        '  float a = pow(max(across, 0.0), 2.0) * pow(vUv.y, 1.5) * uOpacity;',
        '  gl_FragColor = vec4(vec3(0.30, 0.52, 0.60) * a, a);',
        '}'
      ].join('\n')
    });
    const shafts = [];
    const shaftDefs = [[-4.0, 0.25, 2.2], [0.5, -0.18, 3.0], [4.2, 0.12, 2.0]];
    for (let i = 0; i < shaftDefs.length; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(shaftDefs[i][2], 18), shaftMat);
      m.position.set(shaftDefs[i][0], 1.5, -4 - i);
      m.rotation.z = shaftDefs[i][1];
      m.renderOrder = -5;
      scene.add(m);
      shafts.push(m);
    }

    // --- Marine snow particles ---
    const COUNT = isMobile() ? 300 : 500;
    const SPREAD_X = 14, SPREAD_Y = 9;
    const pos = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD_X * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y * 2;
      pos[i * 3 + 2] = -6 + Math.random() * 8;
      speed[i] = 0.05 + Math.random() * 0.12;
      phase[i] = Math.random() * 6.2832;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    geo.setAttribute('position', posAttr);
    const snow = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9fb8c6,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    }));
    snow.frustumCulled = false;
    scene.add(snow);

    // --- Light parallax (camera offset <= 0.3) ---
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const PARALLAX = 0.3;
    const updateTarget = (mx, my) => {
      target.x = Math.max(-1, Math.min(1, mx)) * PARALLAX * 0.6;
      target.y = Math.max(-1, Math.min(1, my)) * PARALLAX * 0.4;
    };
    let mouseX = 0, mouseY = 0, scrollT = 0;
    const applyParallax = () => {
      updateTarget(mouseX, mouseY);
      target.y = Math.max(-PARALLAX, Math.min(PARALLAX, target.y + (scrollT - 0.5) * PARALLAX * 0.8));
    };
    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
      applyParallax();
    }, { passive: true });
    window.addEventListener('scroll', () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollT = Math.min(1, Math.max(0, (window.scrollY || 0) / max));
      applyParallax();
    }, { passive: true });

    // --- Frame update ---
    const clock = new THREE.Clock();
    const step = (dt) => {
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        pos[i3 + 1] += speed[i] * dt;
        pos[i3] += Math.sin(phase[i] + clock.elapsedTime * 0.2) * 0.004;
        if (pos[i3 + 1] > SPREAD_Y) { pos[i3 + 1] = -SPREAD_Y; pos[i3] = (Math.random() - 0.5) * SPREAD_X * 2; }
      }
      posAttr.needsUpdate = true;
      for (let i = 0; i < shafts.length; i++) {
        shafts[i].rotation.z = shaftDefs[i][1] + Math.sin(clock.elapsedTime * 0.1 + i) * 0.03;
      }
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      camera.position.x = cur.x;
      camera.position.y = cur.y;
    };
    const draw = () => renderer.render(scene, camera);

    // --- Loop: 30 fps cap, paused when hidden, static when reduced motion ---
    const FRAME_MS = 1000 / 30;
    let rafId = 0, last = 0, running = false;
    const loop = (t) => {
      rafId = requestAnimationFrame(loop);
      if (t - last < FRAME_MS) return;
      last = t;
      step(Math.min(clock.getDelta(), 0.1));
      draw();
    };
    const start = () => {
      if (running || document.hidden || mqReduce.matches) return;
      running = true;
      clock.getDelta();
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    const onMotionPref = () => { if (mqReduce.matches) { stop(); draw(); } else start(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMotionPref);

    // --- Resize ---
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (!running) draw();
      }, 120);
    }, { passive: true });

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); fail(new Error('context lost')); });

    draw(); // first frame always (this is the single static frame for reduced motion)
    if (!mqReduce.matches) start();
  } catch (err) {
    fail(err);
  }
})();

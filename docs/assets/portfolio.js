/**
 * DINDUN OCEANIC HUD & SUBSEA OPERATIONS SCRIPT
 * Features:
 * - Dynamic Depth & Hydrostatic Pressure Telemetry on scroll
 * - Web Audio API Procedural Deep-Sea Hydrophone Ambience (Zero external audio files)
 * - 60 FPS Particle Canvas: Ascending Micro-Bubbles & Bioluminescent Plankton
 * - Interactive Feeding & Attraction Mechanics in the Abyss Tank
 * - Category Fleet Filtering for Projects
 * - Mobile Subsea Cockpit Menu & Smooth Anchor Navigation
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. DYNAMIC DEPTH & PRESSURE TELEMETRY
  // =========================================================================
  const depthDisplay = document.getElementById('hud-depth-display');
  const pressureDisplay = document.getElementById('hud-pressure-display');

  const updateTelemetry = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(
      document.body.scrollHeight - window.innerHeight,
      1
    );
    const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    
    // Depth scales from 0m at surface up to 3,850m in the Bathypelagic deep
    const currentDepth = Math.round(scrollRatio * 3850);
    // Pressure = 1 ATM at surface + 1 ATM per 10m depth
    const currentPressure = (1.0 + currentDepth / 10).toFixed(1);

    if (depthDisplay) {
      depthDisplay.textContent = currentDepth.toLocaleString() + 'm';
    }
    if (pressureDisplay) {
      pressureDisplay.textContent = currentPressure + ' ATM';
    }
  };

  window.addEventListener('scroll', updateTelemetry, { passive: true });
  updateTelemetry();

  // =========================================================================
  // 2. PROCEDURAL DEEP OCEAN HYDROPHONE AUDIO AMBIENCE (Web Audio API)
  // =========================================================================
  const audioBtn = document.getElementById('audio-toggle-btn');
  const audioLabel = audioBtn ? audioBtn.querySelector('.audio-btn-label') : null;
  let audioCtx = null;
  let isPlayingAudio = false;
  let ambientNoiseNode = null;
  let ambientGain = null;
  let bubbleInterval = null;

  const initOceanAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      audioCtx = new AudioContext();

      // Pink/Brown noise generator for underwater resonance
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise curve
        lastOut = output[i];
        output[i] *= 3.5;
      }

      ambientNoiseNode = audioCtx.createBufferSource();
      ambientNoiseNode.buffer = noiseBuffer;
      ambientNoiseNode.loop = true;

      // Lowpass filter for muffled deep water resonance
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(220, audioCtx.currentTime);

      ambientGain = audioCtx.createGain();
      ambientGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

      ambientNoiseNode.connect(lowpass);
      lowpass.connect(ambientGain);
      ambientGain.connect(audioCtx.destination);
      ambientNoiseNode.start(0);

      // Periodic gentle bubble pops
      const playSoftBubblePop = () => {
        if (!isPlayingAudio || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startFreq = 300 + Math.random() * 500;
        const endFreq = startFreq + 150 + Math.random() * 200;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      };

      bubbleInterval = setInterval(() => {
        if (Math.random() > 0.35) playSoftBubblePop();
      }, 1400);

      return true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
      return false;
    }
  };

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      if (!isPlayingAudio) {
        if (!audioCtx) {
          initOceanAudio();
        } else if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        isPlayingAudio = true;
        audioBtn.classList.add('playing');
        if (audioLabel) audioLabel.textContent = 'HYDROPHONE: LIVE';
      } else {
        if (audioCtx && audioCtx.state === 'running') {
          audioCtx.suspend();
        }
        isPlayingAudio = false;
        audioBtn.classList.remove('playing');
        if (audioLabel) audioLabel.textContent = 'HYDROPHONE: OFF';
      }
    });
  }

  // =========================================================================
  // 3. HIGH-PERFORMANCE CANVAS: ASCENDING BUBBLES & BIOLUMINESCENT PLANKTON
  // =========================================================================
  const canvas = document.getElementById('ocean-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    // Pool of lightweight bubble particles
    const bubbleCount = Math.min(Math.floor(window.innerWidth / 30), 45);
    const bubbles = [];

    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.5 + Math.random() * 3.5,
        speed: 0.5 + Math.random() * 1.4,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobbleDist: 10 + Math.random() * 20,
        seed: Math.random() * 100,
        alpha: 0.2 + Math.random() * 0.5
      });
    }

    // Bioluminescent plankton motes
    const planktonCount = 30;
    const planktons = [];
    for (let i = 0; i < planktonCount; i++) {
      planktons.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        hue: Math.random() > 0.4 ? 185 : 155, // Cyan or emerald
        pulse: Math.random() * Math.PI
      });
    }

    // Zero-GC cursor wake bubble pool with swap-remove
    const MAX_CURSOR_BUBBLES = 30;
    const cursorBubbles = [];
    let cursorBubbleCount = 0;
    for (let i = 0; i < MAX_CURSOR_BUBBLES; i++) {
      cursorBubbles.push({ x: 0, y: 0, radius: 2, speed: 1.5, life: 0, wobble: 5 });
    }
    let lastMouseX = 0, lastMouseY = 0;

    window.addEventListener('mousemove', (e) => {
      const dist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
      if (dist > 25 && cursorBubbleCount < MAX_CURSOR_BUBBLES) {
        const cb = cursorBubbles[cursorBubbleCount++];
        cb.x = e.clientX;
        cb.y = e.clientY;
        cb.radius = 1 + Math.random() * 2.5;
        cb.speed = 1.2 + Math.random() * 2;
        cb.life = 1.0;
        cb.wobble = Math.random() * 10;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    }, { passive: true });

    // Pre-computed color LUTs to eliminate per-frame string allocations
    const bubbleColorLUT = [];
    const planktonColorCyanLUT = [];
    const planktonColorEmeraldLUT = [];
    const cursorColorLUT = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20).toFixed(2);
      bubbleColorLUT.push(`rgba(180, 240, 255, ${a})`);
      planktonColorCyanLUT.push(`rgba(0, 229, 255, ${a})`);
      planktonColorEmeraldLUT.push(`rgba(0, 255, 163, ${a})`);
      cursorColorLUT.push(`rgba(0, 229, 255, ${(i / 40).toFixed(2)})`);
    }

    let t = 0;
    let animId = null;
    let isRunning = false;
    let lastFrameTime = performance.now();

    const isReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderOceanFx = (now) => {
      if (document.hidden || isReducedMotion()) {
        isRunning = false;
        return;
      }

      // Throttle to 30-60 FPS for power efficiency
      const elapsed = now - lastFrameTime;
      if (elapsed < 25) {
        animId = requestAnimationFrame(renderOceanFx);
        return;
      }
      lastFrameTime = now;

      ctx.clearRect(0, 0, width, height);
      t += 0.018;

      // 1. Render & Update Ascending Bubbles
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed;
        const currentX = b.x + Math.sin(t * b.wobbleSpeed * 60 + b.seed) * b.wobbleDist;

        if (b.y < -20) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(currentX, b.y, b.radius, 0, Math.PI * 2);
        const lutIdx = Math.min(20, Math.max(0, Math.floor(b.alpha * 0.4 * 20)));
        ctx.fillStyle = bubbleColorLUT[lutIdx];
        ctx.fill();
        ctx.stroke();
      }

      // 2. Render Plankton Motes
      for (let i = 0; i < planktons.length; i++) {
        const p = planktons[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.03;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const glow = (Math.sin(p.pulse) + 1) * 0.5;
        const alpha = 0.2 + glow * 0.6;
        const lutIdx = Math.min(20, Math.max(0, Math.floor(alpha * 20)));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 + glow * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 185 ? planktonColorCyanLUT[lutIdx] : planktonColorEmeraldLUT[lutIdx];
        ctx.fill();
      }

      // 3. Render Cursor Wake Bubbles with O(1) swap-remove
      for (let i = cursorBubbleCount - 1; i >= 0; i--) {
        const cb = cursorBubbles[i];
        cb.y -= cb.speed;
        cb.life -= 0.02;

        if (cb.life <= 0) {
          const lastIdx = --cursorBubbleCount;
          if (i !== lastIdx) {
            const last = cursorBubbles[lastIdx];
            cursorBubbles[i] = last;
            cursorBubbles[lastIdx] = cb;
          }
          continue;
        }

        ctx.beginPath();
        ctx.arc(cb.x + Math.sin(cb.y * 0.05) * cb.wobble, cb.y, cb.radius * cb.life, 0, Math.PI * 2);
        const lutIdx = Math.min(20, Math.max(0, Math.floor(cb.life * 20)));
        ctx.fillStyle = cursorColorLUT[lutIdx];
        ctx.fill();
      }

      animId = requestAnimationFrame(renderOceanFx);
    };

    const startOceanFx = () => {
      if (!isRunning && !document.hidden && !isReducedMotion()) {
        isRunning = true;
        lastFrameTime = performance.now();
        animId = requestAnimationFrame(renderOceanFx);
      }
    };

    const stopOceanFx = () => {
      isRunning = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopOceanFx();
      else startOceanFx();
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (e.matches) stopOceanFx();
        else startOceanFx();
      });
    }

    startOceanFx();
  }

  // =========================================================================
  // 4. INTERACTIVE ABYSS TANK: CLICK TO DROP LUMINOUS FOOD & ATTRACT FAUNA
  // =========================================================================
  const tank = document.getElementById('abyss-tank');
  if (tank) {
    const creatures = tank.querySelectorAll('.interactive-fish');

    tank.addEventListener('click', (e) => {
      const rect = tank.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Spawn luminous morsel
      const food = document.createElement('div');
      food.className = 'tank-food-morsel';
      food.style.left = `${clickX}px`;
      food.style.top = `${clickY}px`;
      tank.appendChild(food);

      // Spawn shockwave water ripple
      const ripple = document.createElement('div');
      ripple.className = 'tank-water-ripple';
      ripple.style.left = `${clickX}px`;
      ripple.style.top = `${clickY}px`;
      tank.appendChild(ripple);

      setTimeout(() => food.remove(), 2200);
      setTimeout(() => ripple.remove(), 1100);

      // Move nearby fish towards the morsel
      creatures.forEach((fish) => {
        const fishRect = fish.getBoundingClientRect();
        const currentFishX = fishRect.left - rect.left + fishRect.width / 2;
        const currentFishY = fishRect.top - rect.top + fishRect.height / 2;

        const dx = clickX - currentFishX;
        const dy = clickY - currentFishY;
        const dist = Math.hypot(dx, dy);

        // Only creatures within attraction radius react
        if (dist < 420) {
          const moveX = dx * 0.45;
          const moveY = dy * 0.45;
          const facing = dx > 0 ? 1 : -1;
          
          fish.style.transition = 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)';
          fish.style.transform = `translate(${moveX}px, ${moveY}px) scaleX(${facing})`;

          // Return to drifting idle state after a short while
          setTimeout(() => {
            fish.style.transition = 'transform 3.5s ease-in-out';
            fish.style.transform = `translate(0px, 0px) scaleX(${facing})`;
          }, 2400);
        }
      });
    });
  }

  // =========================================================================
  // 5. PROJECTS FLEET CATEGORY FILTER
  // =========================================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project, .fleet-card');

  if (filterBtns.length && projectCards.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        const filter = btn.dataset.filter;

        projectCards.forEach((card) => {
          const category = card.dataset.category || '';
          if (filter === 'all' || category.includes(filter)) {
            card.style.display = '';
            card.style.opacity = '1';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // =========================================================================
  // 6. SUBSEA COCKPIT NAVIGATION & ACTIVE HIGHLIGHT
  // =========================================================================
  const menuToggle = document.querySelector('.subsea-menu-toggle');
  const subseaNav = document.getElementById('subsea-nav');

  if (menuToggle && subseaNav) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(open));
      subseaNav.classList.toggle('open', open);
    });

    subseaNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        subseaNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scrollspy for active nav link
  const navLinks = [...document.querySelectorAll('.subsea-nav-link[data-nav]')];
  const trackedSections = ['about', 'experience', 'education', 'work', 'skills', 'dive', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window && trackedSections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((l) => {
              l.classList.toggle('active', l.dataset.nav === id);
            });
          }
        });
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    );
    trackedSections.forEach((sec) => observer.observe(sec));
  }

  // =========================================================================
  // 7. EMAIL DIRECT CLIPBOARD COPY & FEEDBACK
  // =========================================================================
  const emailBtns = document.querySelectorAll('.email-reveal-btn, .copy-email-btn');
  const targetEmail = 'vandinhdung.work@gmail.com';

  emailBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetEmail).catch(() => {});
      }

      btn.classList.add('copied');
      const textSpan = btn.querySelector('.email-reveal-text') || btn;
      const origText = textSpan.textContent;
      textSpan.textContent = 'Copied! 📋';

      setTimeout(() => {
        btn.classList.remove('copied');
        textSpan.textContent = origText;
      }, 2000);
    });
  });

  // =========================================================================
  // 8. RANDOMIZE MASCOT SPRITE FOR COMPANION BADGE & COPYRIGHT YEAR
  // =========================================================================
  const mascotSprites = [
    'orange_seahorse.png', 'clownfish.png', 'blue_tang.png',
    'pink_jellyfish.png', 'blue_jellyfish.png', 'nautilus.png',
    'yellow_pufferfish.png', 'spotted_ray.png'
  ];
  const mascotImg = document.getElementById('companion-mascot-img');
  if (mascotImg) {
    const chosen = mascotSprites[Math.floor(Math.random() * mascotSprites.length)];
    mascotImg.src = 'assets/sprites/' + chosen;
  }

  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

})();


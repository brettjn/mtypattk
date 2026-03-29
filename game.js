/**
 * Missile Command Style Type Attack
 * Game logic
 */

const WORDS = [
  'fire', 'blast', 'code', 'type', 'fast', 'hack', 'bomb', 'word', 'shot',
  'kill', 'nuke', 'raid', 'blitz', 'smash', 'crash', 'force', 'speed',
  'power', 'storm', 'crush', 'flash', 'laser', 'turbo', 'hyper', 'ultra',
  'rapid', 'vital', 'alpha', 'delta', 'gamma', 'sigma', 'omega', 'zeta',
  'phantom', 'vector', 'hunter', 'target', 'strike', 'impact', 'breach',
  'reboot', 'stealth', 'cipher', 'matrix', 'binary', 'kernel', 'buffer',
  'syntax', 'module', 'system', 'network', 'server', 'packet', 'signal',
  'terminal', 'command', 'defense', 'protocol', 'frequency', 'override',
  'sequence', 'launcher', 'warhead', 'payload', 'scramble', 'intercept',
  'detonate', 'trajectory', 'encryption', 'decryption'
];

const CITY_WIDTH = 48;
const CITY_HEIGHT = 28;
const NUM_CITIES = 6;
const BASE_SPEED = 28;   // px/sec at level 1
const SPEED_INCREMENT = 8; // px/sec per level
const SPAWN_INTERVAL_START = 2200; // ms
const SPAWN_INTERVAL_MIN = 600;    // ms

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset();
    this.lastTime = 0;
    this.animFrame = null;
  }

  reset() {
    this.missiles = [];     // falling word objects
    this.explosions = [];   // active explosion animations
    this.cities = this._initCities();
    this.score = 0;
    this.level = 1;
    this.wordsDestroyed = 0;
    this.wordsThisLevel = 0;
    this.targetMissile = null;  // missile currently being typed
    this.typed = '';
    this.running = false;
    this.gameOver = false;
    this.spawnTimer = 0;
    this.spawnInterval = SPAWN_INTERVAL_START;
    this.levelUpPending = false;
    this.stars = this._initStars();
  }

  _initStars() {
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height * 0.75),
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.6 + 0.3,
      });
    }
    return stars;
  }

  _initCities() {
    const cities = [];
    const canvas = this.canvas;
    const spacing = canvas.width / (NUM_CITIES + 1);
    for (let i = 0; i < NUM_CITIES; i++) {
      cities.push({
        x: spacing * (i + 1),
        y: canvas.height - CITY_HEIGHT - 4,
        alive: true,
      });
    }
    return cities;
  }

  get speed() {
    return BASE_SPEED + SPEED_INCREMENT * (this.level - 1);
  }

  start() {
    this.running = true;
    this.gameOver = false;
    this.lastTime = performance.now();
    this._scheduleSpawn();
    this.animFrame = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this._spawnTimeout) {
      clearTimeout(this._spawnTimeout);
      this._spawnTimeout = null;
    }
  }

  _scheduleSpawn() {
    if (this._spawnTimeout) clearTimeout(this._spawnTimeout);
    this._spawnTimeout = setTimeout(() => {
      if (this.running) {
        this._spawnMissile();
        this._scheduleSpawn();
      }
    }, this.spawnInterval);
  }

  _spawnMissile() {
    // Pick a random alive city as target
    const aliveCities = this.cities.filter(c => c.alive);
    if (aliveCities.length === 0) return;
    const target = aliveCities[Math.floor(Math.random() * aliveCities.length)];

    // Pick a word not currently in flight
    const inFlight = this.missiles.map(m => m.word);
    let available = WORDS.filter(w => !inFlight.includes(w));
    if (available.length === 0) available = WORDS;
    const word = available[Math.floor(Math.random() * available.length)];

    // Start x slightly random within canvas
    const margin = 40;
    const startX = margin + Math.random() * (this.canvas.width - margin * 2);
    const startY = 20;

    // Direction toward target city
    const targetX = target.x;
    const targetY = target.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);

    this.missiles.push({
      word,
      typed: 0,
      x: startX,
      y: startY,
      vx: (dx / dist) * this.speed,
      vy: (dy / dist) * this.speed,
      targetCity: target,
      trail: [],
    });
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.running) {
      this._update(dt);
    }
    this._draw();

    if (this.running) {
      this.animFrame = requestAnimationFrame((t) => this._loop(t));
    }
  }

  _update(dt) {
    // Update missiles
    const toRemove = [];
    for (const m of this.missiles) {
      // Store trail point
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 28) m.trail.shift();

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Check if it reached its target city
      const city = m.targetCity;
      if (city.alive) {
        const dist = Math.hypot(m.x - city.x, m.y - city.y);
        if (dist < CITY_WIDTH / 2) {
          // Hit the city
          city.alive = false;
          this._explode(city.x, city.y, '#f80', 40);
          toRemove.push(m);

          // Check game over
          const remaining = this.cities.filter(c => c.alive).length;
          if (remaining === 0) {
            this._triggerGameOver();
            return;
          }
        }
      } else {
        // City already dead, missile hits the ground area
        if (m.y >= this.canvas.height - CITY_HEIGHT - 4) {
          toRemove.push(m);
        }
      }
    }

    for (const m of toRemove) {
      const idx = this.missiles.indexOf(m);
      if (idx !== -1) this.missiles.splice(idx, 1);
      if (this.targetMissile === m) {
        this.targetMissile = null;
        this.typed = '';
      }
    }

    // Update explosions
    this.explosions = this.explosions.filter(e => {
      e.age += dt;
      return e.age < e.duration;
    });

    // Level up every 10 destroyed words
    if (this.wordsThisLevel >= 10) {
      this.wordsThisLevel = 0;
      this.level++;
      this.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, this.spawnInterval - 200);
      this._scheduleSpawn();
    }
  }

  _explode(x, y, color, radius) {
    this.explosions.push({
      x, y,
      color,
      radius,
      age: 0,
      duration: 0.55,
      particles: this._makeParticles(x, y, color, 18),
    });
  }

  _makeParticles(x, y, color, count) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 40 + Math.random() * 80;
      parts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
    return parts;
  }

  // Called from input handler
  handleInput(value) {
    this.typed = value.toLowerCase();

    // If we have a targeted missile, check it first
    if (this.targetMissile) {
      const word = this.targetMissile.word;
      if (word.startsWith(this.typed)) {
        this.targetMissile.typed = this.typed.length;
        if (this.typed === word) {
          this._destroyMissile(this.targetMissile);
        }
        return;
      } else {
        // No longer matches target
        this.targetMissile.typed = 0;
        this.targetMissile = null;
      }
    }

    // Find a missile whose word starts with typed
    if (this.typed.length > 0) {
      for (const m of this.missiles) {
        if (m.word.startsWith(this.typed)) {
          this.targetMissile = m;
          m.typed = this.typed.length;
          if (this.typed === m.word) {
            this._destroyMissile(m);
          }
          return;
        }
      }
      // No match found — reset
      this.targetMissile = null;
    } else {
      if (this.targetMissile) this.targetMissile.typed = 0;
      this.targetMissile = null;
    }
  }

  _destroyMissile(m) {
    this._explode(m.x, m.y, '#4af', 30);
    const idx = this.missiles.indexOf(m);
    if (idx !== -1) this.missiles.splice(idx, 1);
    if (this.targetMissile === m) {
      this.targetMissile = null;
    }
    this.score += m.word.length * 10 * this.level;
    this.wordsDestroyed++;
    this.wordsThisLevel++;
    this.typed = '';
  }

  _triggerGameOver() {
    this.running = false;
    this.gameOver = true;
    if (this._spawnTimeout) clearTimeout(this._spawnTimeout);
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this._draw();
    if (this.onGameOver) this.onGameOver(this.score);
  }

  // ───── Drawing ─────

  draw() {
    this._draw();
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Background
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, W, H);

    this._drawStars(ctx);
    this._drawGround(ctx, W, H);
    this._drawCities(ctx, H);
    this._drawMissiles(ctx);
    this._drawExplosions(ctx);
  }

  _drawStars(ctx) {
    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.fill();
    }
  }

  _drawGround(ctx, W, H) {
    // Ground bar
    ctx.fillStyle = '#152';
    ctx.fillRect(0, H - CITY_HEIGHT - 8, W, CITY_HEIGHT + 8);
    // Ground line glow
    ctx.shadowColor = '#2f4';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#3f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H - CITY_HEIGHT - 8);
    ctx.lineTo(W, H - CITY_HEIGHT - 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawCities(ctx, H) {
    for (const city of this.cities) {
      if (!city.alive) {
        // Draw rubble
        ctx.fillStyle = '#433';
        const rx = city.x - CITY_WIDTH / 2;
        const ry = H - 12;
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(rx + i * 9, ry - (i % 2) * 3, 7, 8);
        }
        continue;
      }
      const x = city.x - CITY_WIDTH / 2;
      const y = city.y;

      // City silhouette (blocky buildings)
      ctx.fillStyle = '#4f8';
      ctx.shadowColor = '#4f8';
      ctx.shadowBlur = 6;

      // Main base
      ctx.fillRect(x + 4, y + 10, CITY_WIDTH - 8, 18);
      // Central tower
      ctx.fillRect(x + 17, y + 2, 14, 10);
      // Side towers
      ctx.fillRect(x + 4, y + 5, 10, 8);
      ctx.fillRect(x + CITY_WIDTH - 14, y + 5, 10, 8);

      ctx.shadowBlur = 0;
    }
  }

  _drawMissiles(ctx) {
    const now = performance.now();
    for (const m of this.missiles) {
      const isTarget = m === this.targetMissile;

      // Trail
      if (m.trail.length > 1) {
        for (let i = 1; i < m.trail.length; i++) {
          const alpha = (i / m.trail.length) * 0.5;
          ctx.strokeStyle = isTarget
            ? `rgba(255, 80, 80, ${alpha})`
            : `rgba(255, 200, 80, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(m.trail[i - 1].x, m.trail[i - 1].y);
          ctx.lineTo(m.trail[i].x, m.trail[i].y);
          ctx.stroke();
        }
      }

      // Missile head (small dot)
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isTarget ? '#f55' : '#fc0';
      ctx.shadowColor = isTarget ? '#f55' : '#fc0';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Word label
      const word = m.word;
      const typed = m.typed;
      const untyped = word.slice(typed);

      ctx.font = 'bold 13px "Courier New", monospace';
      const totalWidth = ctx.measureText(word).width;
      const typedWidth = typed > 0 ? ctx.measureText(word.slice(0, typed)).width : 0;
      const labelX = m.x - totalWidth / 2;
      const labelY = m.y - 10;

      // Background for readability
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(labelX - 3, labelY - 13, totalWidth + 6, 17);

      // Already-typed portion (bright green)
      if (typed > 0) {
        ctx.fillStyle = '#4f4';
        ctx.shadowColor = '#4f4';
        ctx.shadowBlur = 4;
        ctx.fillText(word.slice(0, typed), labelX, labelY);
        ctx.shadowBlur = 0;
      }

      // Remaining portion
      ctx.fillStyle = isTarget ? '#f88' : '#ff0';
      ctx.shadowColor = isTarget ? '#f88' : '#ff0';
      ctx.shadowBlur = 3;
      ctx.fillText(untyped, labelX + typedWidth, labelY);
      ctx.shadowBlur = 0;
    }
  }

  _drawExplosions(ctx) {
    for (const e of this.explosions) {
      const progress = e.age / e.duration;
      const alpha = 1 - progress;
      const r = e.radius * progress;

      // Blast circle
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.stroke();

      // Inner fill
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.globalAlpha = alpha * 0.3;
      ctx.fill();

      // Particles
      for (const p of e.particles) {
        const px = p.x + p.vx * e.age;
        const py = p.y + p.vy * e.age;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }
}

// ───── UI wiring ─────

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const overlayScore = document.getElementById('overlay-score');
  const overlayBtn = document.getElementById('overlay-btn');
  const wordInput = document.getElementById('word-input');
  const scoreEl = document.getElementById('score-val');
  const levelEl = document.getElementById('level-val');
  const citiesEl = document.getElementById('cities-val');

  // Resize canvas to fit window
  function resizeCanvas() {
    const maxW = Math.min(window.innerWidth - 20, 900);
    const maxH = Math.min(window.innerHeight - 80, 600);
    canvas.width = Math.floor(maxW);
    canvas.height = Math.floor(maxH);
  }
  resizeCanvas();

  const game = new Game(canvas);

  // Draw initial state (title screen background)
  game.draw();

  function startGame() {
    game.stop();
    game.reset();
    overlay.classList.add('hidden');
    wordInput.value = '';
    wordInput.focus();
    game.onGameOver = (score) => {
      overlayTitle.textContent = 'GAME OVER';
      overlayMsg.textContent = `CITIES DESTROYED`;
      overlayScore.textContent = `SCORE: ${score}`;
      overlayBtn.textContent = 'PLAY AGAIN';
      overlay.classList.remove('hidden');
    };
    game.start();
  }

  function updateHUD() {
    scoreEl.textContent = game.score;
    levelEl.textContent = game.level;
    citiesEl.textContent = game.cities.filter(c => c.alive).length;
    requestAnimationFrame(updateHUD);
  }
  updateHUD();

  overlayBtn.addEventListener('click', startGame);

  wordInput.addEventListener('input', (e) => {
    if (game.running) {
      game.handleInput(e.target.value);
      if (game.typed === '') {
        // Word was destroyed or cleared, reset input
        e.target.value = '';
      }
    }
  });

  // Keep focus on input while game is running
  canvas.addEventListener('click', () => {
    if (game.running) wordInput.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (game.running) wordInput.focus();
  });
});

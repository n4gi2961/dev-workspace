const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
    running: false,
    paused: false,
    score: 0,
    level: 1,
    exp: 0,
    expNeeded: 100,
    time: 0,
    deathAnimating: false,
    enemySpawnReduction: false,
    firstBlueSpawned: false,
    lastBlueSpawnTime: 0
};

// プレイヤー
let player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    size: 20,
    lives: 5,
    maxLives: 5,
    invulnerable: 0,
    speed: 5,
    damage: 10,
    fireRate: 2.5,
    upgrades: {
        baseSpeed: 0,
        baseDamage: 0,
        baseFireRate: 0,
        healCount: 0
    },
    skills: {
        Q: null,
        W: null,
        E: null,
        R: null
    },
    basicSkillCount: 0
};

// スキル定義
const skills = {
    // 基本スキル
    spreadShot: {
        id: 'spreadShot',
        name: 'Spread Shot',
        description: 'Fire bullets in a fan pattern',
        icon: '⚡',
        type: 'basic',
        level: 0,
        maxLevel: 6,
        baseDuration: 15000,
        duration: 15000,
        baseCooldown: 20000,
        cooldown: 20000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        effect: () => {},
        levelBonus: {
            5: 'Bullets increased from 3 to 5'
        }
    },
    laserBeam: {
        id: 'laserBeam',
        name: 'Giant Shot',
        description: 'Triple bullet size & double damage',
        icon: '⬤',
        type: 'basic',
        level: 0,
        maxLevel: 6,
        baseDuration: 12000,
        duration: 12000,
        baseCooldown: 18000,
        cooldown: 18000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        effect: () => {},
        levelBonus: {
            5: 'Bullet size x4 & damage x3'
        }
    },
    rapidFire: {
        id: 'rapidFire',
        name: 'Rapid Fire',
        description: 'Double fire rate',
        icon: '🔥',
        type: 'basic',
        level: 0,
        maxLevel: 6,
        baseDuration: 8000,
        duration: 8000,
        baseCooldown: 20000,
        cooldown: 20000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        fireRateMultiplier: 2,
        effect: () => {},
        levelBonus: {
            5: 'Fire rate x3 instead of x2'
        }
    },
    dash: {
        id: 'dash',
        name: 'Dash',
        description: 'Quick dash movement',
        icon: '→',
        type: 'basic',
        level: 0,
        maxLevel: 6,
        baseCooldown: 10000,
        cooldown: 10000,
        charges: 1,
        maxCharges: 1,
        lastUsed: 0,
        effect: () => {
            performDash();
        },
        levelBonus: {
            5: '2 charge stacks'
        }
    },
    barrier: {
        id: 'barrier',
        name: 'EM Barrier',
        description: 'Generate protective barrier',
        icon: '◯',
        type: 'basic',
        level: 0,
        maxLevel: 6,
        baseDuration: 5000,
        duration: 5000,
        baseCooldown: 20000,
        cooldown: 20000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        radius: 50,
        effect: () => {},
        levelBonus: {
            5: 'Range x1.5'
        }
    },
    // アルティメットスキル
    invincible: {
        id: 'invincible',
        name: 'Invincibility',
        description: 'Become invulnerable',
        icon: '🛡️',
        type: 'ultimate',
        level: 10,
        baseDuration: 10000,
        duration: 10000,
        baseCooldown: 60000,
        cooldown: 60000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        effect: () => {}
    },
    ricochet: {
        id: 'ricochet',
        name: 'Ricochet',
        description: 'Bullets bounce 3 times',
        icon: '↗',
        type: 'ultimate',
        level: 10,
        baseDuration: 15000,
        duration: 15000,
        baseCooldown: 60000,
        cooldown: 60000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        effect: () => {}
    },
    homing: {
        id: 'homing',
        name: 'Homing',
        description: 'All bullets home in on enemies',
        icon: '🎯',
        type: 'ultimate',
        level: 10,
        baseDuration: 12000,
        duration: 12000,
        baseCooldown: 60000,
        cooldown: 60000,
        active: false,
        lastUsed: 0,
        activatedAt: 0,
        effect: () => {}
    }
};

// 配列
let bullets = [];
let enemies = [];
let particles = [];
let expOrbs = [];
let stars = [];
let blueEnemyCount = 0;

// 入力状態
const keys = {};
let mouseX = player.x;
let mouseY = player.y;

// アニメーション用
let animationId = null;
let dashChargeInterval = null;

// ダミーランキングデータ（15個）
const dummyRankings = [
    { rank: 1, name: "ACE", score: 999999, time: "45:32", skills: ['⚡', '🔥', '◯', '🛡️'] },
    { rank: 2, name: "NOVA", score: 750000, time: "38:15", skills: ['⬤', '→', '⚡', '🎯'] },
    { rank: 3, name: "STAR", score: 500000, time: "32:44", skills: ['🔥', '◯', '→', '↗'] },
    { rank: 4, name: "HAWK", score: 250000, time: "25:18", skills: ['⚡', '⬤', '→', '↗'] },
    { rank: 5, name: "FALCON", score: 100000, time: "18:52", skills: ['◯', '🔥', '⚡', '🛡️'] },
    { rank: 6, name: "PHOENIX", score: 95000, time: "17:30", skills: ['⬤', '🔥', '◯', '🎯'] },
    { rank: 7, name: "EAGLE", score: 87500, time: "16:45", skills: ['⚡', '→', '⬤', '🎯'] },
    { rank: 8, name: "RAPTOR", score: 75000, time: "15:20", skills: ['🔥', '⚡', '→', '↗'] },
    { rank: 9, name: "VIPER", score: 65000, time: "14:15", skills: ['◯', '⬤', '🔥', '🛡️'] },
    { rank: 10, name: "COBRA", score: 55000, time: "13:00", skills: ['→', '⚡', '◯', '↗'] },
    { rank: 11, name: "WOLF", score: 47500, time: "11:45", skills: ['⬤', '◯', '→', '🎯'] },
    { rank: 12, name: "TIGER", score: 40000, time: "10:30", skills: ['🔥', '→', '⚡', '↗'] },
    { rank: 13, name: "LYNX", score: 32500, time: "9:15", skills: ['⚡', '🔥', '⬤', '🛡️'] },
    { rank: 14, name: "PANTHER", score: 25000, time: "8:00", skills: ['◯', '→', '🔥', '🎯'] },
    { rank: 15, name: "ROOKIE", score: 15000, time: "6:30", skills: ['⚡', '⬤', '◯', '🎯'] }
];

// タイトル画面関数
function showRanking() {
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('rankingScreen').style.display = 'block';
    
    const rankingList = document.getElementById('rankingList');
    rankingList.innerHTML = '';
    
    dummyRankings.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'rankingEntry';
        if (entry.rank <= 3) div.className += ' top3';
        
        div.innerHTML = `
            <div class="rank">#${entry.rank}</div>
            <div class="name">${entry.name}</div>
            <div class="stats">
                <div>Score: ${entry.score.toLocaleString()}</div>
                <div>Time: ${entry.time}</div>
            </div>
            <div class="skills">
                ${entry.skills.map(s => `<span style="font-size: 24px;">${s}</span>`).join('')}
            </div>
        `;
        rankingList.appendChild(div);
    });
}

function backFromRanking() {
    document.getElementById('rankingScreen').style.display = 'none';
    document.getElementById('titleScreen').style.display = 'flex';
}

function showSettings() {
    alert('SETTINGS (Coming Soon)\\n\\n- Sound: ON\\n- Music: ON\\n- Effects: HIGH');
}

function startGame() {
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    gameState.running = true;
    init();
}

function retryGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    resetGame();
    gameState.running = true;
    gameLoop();
    spawnEnemies();
}

function backToTitle() {
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('titleScreen').style.display = 'flex';
    resetGame();
}

// 星の初期化
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1,
            brightness: Math.random() * 0.5 + 0.5
        });
    }
}

// 星の更新
function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = -10;
            star.x = Math.random() * canvas.width;
        }
    });
}

// スキル関連関数
function updateSkillLevels(skill) {
    skill.level++;
    
    // レベルに応じた効果
    const levelEffects = {
        2: () => {
            skill.duration = skill.baseDuration * 1.2;
        },
        3: () => {
            skill.cooldown = skill.baseCooldown * 0.8;
        },
        4: () => {
            skill.duration = skill.baseDuration * 1.44; // 1.2 * 1.2
        },
        6: () => {
            skill.cooldown = skill.baseCooldown * 0.64; // 0.8 * 0.8
        }
    };
    
    if (levelEffects[skill.level]) {
        levelEffects[skill.level]();
    }
    
    // レベル5の特殊効果
    if (skill.level === 5) {
        switch (skill.id) {
            case 'rapidFire':
                skill.fireRateMultiplier = 3;
                break;
            case 'dash':
                skill.maxCharges = 2;
                skill.charges = 2;
                break;
            case 'barrier':
                skill.radius = 75;
                break;
        }
    }
    
    // アルティメットスキルのレベル20、30強化
    if (skill.type === 'ultimate') {
        if (skill.level === 20) {
            switch (skill.id) {
                case 'invincible':
                    skill.duration = 15000;
                    break;
                case 'ricochet':
                    skill.duration = 18000;
                    break;
                case 'homing':
                    skill.duration = 20000;
                    break;
            }
        } else if (skill.level === 30) {
            switch (skill.id) {
                case 'invincible':
                    skill.cooldown = 40000;
                    break;
                case 'ricochet':
                    skill.cooldown = 45000;
                    break;
                case 'homing':
                    skill.cooldown = 40000;
                    break;
            }
        }
    }
}

function activateSkill(key) {
    const skill = player.skills[key];
    if (!skill || skill === 'empty') return;
    
    const now = Date.now();
    
    // ダッシュの特殊処理（チャージシステム）
    if (skill.id === 'dash') {
        if (skill.charges > 0) {
            skill.effect();
            skill.charges--;
            if (skill.charges === 0) {
                skill.lastUsed = now;
            }
        }
        return;
    }
    
    // 通常スキルのクールダウンチェック
    if (now - skill.lastUsed < skill.cooldown) return;
    
    skill.active = true;
    skill.lastUsed = now;
    skill.activatedAt = now;
    skill.effect();
    
    // 継続時間後に無効化
    if (skill.duration) {
        setTimeout(() => {
            skill.active = false;
        }, skill.duration);
    }
}

function updateSkillBar() {
    const skillBar = document.getElementById('skillBar');
    skillBar.innerHTML = '';
    
    ['Q', 'W', 'E', 'R'].forEach(key => {
        const skill = player.skills[key];
        const slot = document.createElement('div');
        slot.className = 'skillSlot';
        
        if (skill && skill !== 'empty') {
            const now = Date.now();
            const timeSinceUse = now - skill.lastUsed;
            const cooldownProgress = Math.min(timeSinceUse / skill.cooldown, 1);
            
            if (skill.active) {
                slot.classList.add('active');
                
                // アクティブ時間の進行状況を計算
                const activeTime = now - skill.activatedAt;
                const activeProgress = Math.max(0, 1 - (activeTime / skill.duration));
                
                // アクティブ時間のオーバーレイ
                const overlay = document.createElement('div');
                overlay.className = 'cooldownOverlay';
                overlay.style.height = `${activeProgress * 100}%`;
                overlay.style.background = 'rgba(0, 255, 0, 0.3)';
                slot.appendChild(overlay);
            } else if (cooldownProgress < 1 && skill.id !== 'dash') {
                slot.classList.add('cooldown');
                
                // クールダウンオーバーレイ
                const overlay = document.createElement('div');
                overlay.className = 'cooldownOverlay';
                overlay.style.height = `${(1 - cooldownProgress) * 100}%`;
                slot.appendChild(overlay);
            }
            
            // ダッシュのクールダウン表示
            if (skill.id === 'dash') {
                if (skill.charges === 0) {
                    slot.classList.add('cooldown');
                    const timeSinceEmpty = now - skill.lastUsed;
                    const rechargeProgress = Math.min(timeSinceEmpty / skill.cooldown, 1);
                    
                    const overlay = document.createElement('div');
                    overlay.className = 'cooldownOverlay';
                    overlay.style.height = `${(1 - rechargeProgress) * 100}%`;
                    slot.appendChild(overlay);
                } else {
                    // チャージがある場合は使用可能として表示
                    slot.classList.remove('cooldown');
                }
            }
            
            // アイコン
            const icon = document.createElement('div');
            icon.className = 'skillIcon';
            icon.textContent = skill.icon;
            slot.appendChild(icon);
            
            // レベル表示
            if (skill.level > 1) {
                const levelIndicator = document.createElement('div');
                levelIndicator.className = 'skillLevelIndicator';
                levelIndicator.textContent = skill.level;
                slot.appendChild(levelIndicator);
            }
            
            // ダッシュのチャージ数表示
            if (skill.id === 'dash' && skill.charges > 0) {
                const charges = document.createElement('div');
                charges.style.cssText = 'position: absolute; bottom: 2px; right: 2px; font-size: 18px; color: #ffff00;';
                charges.textContent = skill.charges;
                slot.appendChild(charges);
            }
        } else {
            slot.textContent = key === 'R' ? '🔒' : '?';
            slot.style.opacity = '0.5';
        }
        
        const keyLabel = document.createElement('div');
        keyLabel.className = 'keyLabel';
        keyLabel.textContent = key;
        slot.appendChild(keyLabel);
        
        skillBar.appendChild(slot);
    });
}

// ハート表示更新
function updateHearts() {
    const heartsDiv = document.getElementById('hearts');
    heartsDiv.innerHTML = '';
    
    for (let i = 0; i < player.maxLives; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.textContent = i < player.lives ? '❤️' : '🖤';
        heartsDiv.appendChild(heart);
    }
}

// 初期化
function init() {
    // 前のゲームループとインターバルをクリア
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (dashChargeInterval) {
        clearInterval(dashChargeInterval);
        dashChargeInterval = null;
    }
    
    // イベントリスナー（重複防止のため一度削除）
    canvas.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // イベントリスナー追加
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // 星の初期化
    initStars();
    
    // 初期表示
    updateHearts();
    updateSkillBar();
    
    // ゲームループ開始
    gameLoop();
    spawnEnemies();
    dashChargeInterval = setInterval(updateDashCharges, 100);
}

// イベントハンドラー
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}

function handleKeyDown(e) {
    keys[e.key.toUpperCase()] = true;
    
    // スキル発動
    if (['Q', 'W', 'E', 'R'].includes(e.key.toUpperCase())) {
        activateSkill(e.key.toUpperCase());
    }
}

function handleKeyUp(e) {
    keys[e.key.toUpperCase()] = false;
}

// ダッシュチャージ回復
function updateDashCharges() {
    Object.values(player.skills).forEach(skill => {
        if (skill && skill.id === 'dash' && skill.charges < skill.maxCharges) {
            const now = Date.now();
            if (now - skill.lastUsed >= skill.cooldown) {
                skill.charges++;
                // maxChargesに達してもlastUsedは更新しない（次のチャージのため）
                if (skill.charges < skill.maxCharges) {
                    skill.lastUsed = now;
                }
            }
        }
    });
    updateSkillBar();  // UIを更新
}

// ダッシュ実行
function performDash() {
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const dashDistance = 100;
        const ratio = Math.min(dashDistance / distance, 1);
        player.x += dx * ratio;
        player.y += dy * ratio;
        
        // ダッシュ中は一時的に無敵
        player.invulnerable = Math.max(player.invulnerable, 10);
        
        // ダッシュエフェクト
        createDashEffect();
    }
}

// ダッシュエフェクト
function createDashEffect() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: player.x,
            y: player.y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 8 + 4,
            life: 25,
            color: `hsl(${180 + Math.random() * 60}, 100%, 50%)`,
            type: 'dash'
        });
    }
}

// プレイヤー更新
function updatePlayer() {
    // マウス追従移動
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
        const baseSpeed = player.speed * (1 + player.upgrades.baseSpeed * 0.1);
        const moveX = (dx / distance) * baseSpeed;
        const moveY = (dy / distance) * baseSpeed;
        
        player.x += moveX;
        player.y += moveY;
    }
    
    // 画面境界
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
    
    // 無敵時間
    if (player.invulnerable > 0) player.invulnerable--;
    
    // 自動射撃
    let currentFireRate = player.fireRate * (1 + player.upgrades.baseFireRate * 0.1);
    
    // Rapid Fireスキルチェック
    const rapidFire = Object.values(player.skills).find(s => s && s.id === 'rapidFire');
    if (rapidFire && rapidFire.active) {
        currentFireRate *= rapidFire.fireRateMultiplier;
    }
    
    if (gameState.time % Math.floor(60 / currentFireRate) === 0) {
        shoot();
    }
}

// 射撃
function shoot() {
    const baseDamage = player.damage * (1 + player.upgrades.baseDamage * 0.1);
    
    // Spread Shotチェック
    const spreadShot = Object.values(player.skills).find(s => s && s.id === 'spreadShot');
    if (spreadShot && spreadShot.active) {
        const bulletCount = spreadShot.level >= 5 ? 5 : 3;
        const angleSpread = Math.PI / 3;
        const spreadDamage = baseDamage * 1.25; // 125%の威力
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = -Math.PI / 2 + (angleSpread * (i - (bulletCount - 1) / 2) / (bulletCount - 1));
            createBullet(angle, spreadDamage);
        }
        return;
    }
    
    // 通常射撃
    createBullet(-Math.PI / 2, baseDamage);
}

function createBullet(angle, damage) {
    const ricochet = Object.values(player.skills).find(s => s && s.id === 'ricochet');
    const homing = Object.values(player.skills).find(s => s && s.id === 'homing');
    const giantShot = Object.values(player.skills).find(s => s && s.id === 'laserBeam');
    
    // Giant Shot（旧レーザービーム）の効果
    let sizeMultiplier = 1;
    let damageMultiplier = 1;
    if (giantShot && giantShot.active) {
        sizeMultiplier = giantShot.level >= 5 ? 4 : 3;
        damageMultiplier = giantShot.level >= 5 ? 3 : 2;
    }
    
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        damage: damage * damageMultiplier,
        pierce: false,
        homing: homing && homing.active,
        ricochet: ricochet && ricochet.active,
        bounces: ricochet && ricochet.active ? 3 : 0,
        size: 5 * sizeMultiplier,
        trail: [],
        isPlayerBullet: true
    });
}

// 弾丸更新
function updateBullets() {
    bullets = bullets.filter(bullet => {
        // トレイル更新
        bullet.trail.push({ x: bullet.x, y: bullet.y });
        if (bullet.trail.length > 10) bullet.trail.shift();
        
        // ホーミング
        if (bullet.homing && enemies.length > 0 && bullet.isPlayerBullet) {
            let nearestEnemy = null;
            let nearestDist = Infinity;
            
            enemies.forEach(enemy => {
                const dist = Math.sqrt((enemy.x - bullet.x) ** 2 + (enemy.y - bullet.y) ** 2);
                if (dist < nearestDist && dist < 200) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy) {
                const dx = nearestEnemy.x - bullet.x;
                const dy = nearestEnemy.y - bullet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                bullet.vx += (dx / dist) * 0.8;
                bullet.vy += (dy / dist) * 0.8;
                
                const speed = Math.sqrt(bullet.vx ** 2 + bullet.vy ** 2);
                bullet.vx = (bullet.vx / speed) * 12;
                bullet.vy = (bullet.vy / speed) * 12;
            }
        }
        
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // リコシェット
        if (bullet.ricochet && bullet.bounces > 0 && bullet.isPlayerBullet) {
            if (bullet.x <= 0 || bullet.x >= canvas.width) {
                bullet.vx *= -1;
                bullet.bounces--;
                createRicochetEffect(bullet.x, bullet.y);
            }
            if (bullet.y <= 0 || bullet.y >= canvas.height) {
                bullet.vy *= -1;
                bullet.bounces--;
                createRicochetEffect(bullet.x, bullet.y);
            }
        }
        
        // 画面外チェック
        return bullet.x > -50 && bullet.x < canvas.width + 50 && 
               bullet.y > -50 && bullet.y < canvas.height + 50 &&
               bullet.bounces >= 0;
    });
}

// リコシェットエフェクト
function createRicochetEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            life: 15,
            color: '#ffff00',
            type: 'spark'
        });
    }
}

// 敵スポーン
function spawnEnemies() {
    if (!gameState.running || gameState.deathAnimating) return;
    
    // 敵の出現数（増加率50%、最大2.5倍）
    let baseEnemyCount = 3;
    let enemyCount = Math.min(baseEnemyCount + Math.floor((gameState.level - 1) * 0.5), baseEnemyCount * 2.5);
    enemyCount = Math.floor(enemyCount);
    
    // レベルアップ時は敵の出現量を50%に
    if (gameState.enemySpawnReduction) {
        enemyCount = Math.floor(enemyCount * 0.5);
    }
    
    // 青い敵の特別なスポーン処理
    if (gameState.level === 10 && blueEnemyCount === 0 && !gameState.firstBlueSpawned) {
        gameState.firstBlueSpawned = true;
        gameState.lastBlueSpawnTime = Date.now();
        spawnBlueEnemy();
    } else if (gameState.level >= 10 && blueEnemyCount < 3) {
        const now = Date.now();
        if (now - gameState.lastBlueSpawnTime >= 30000) { // 30秒
            gameState.lastBlueSpawnTime = now;
            spawnBlueEnemy();
        }
    }
    
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (!gameState.running || gameState.deathAnimating) return;
            
            const enemyType = Math.random();
            // 体力の増加率を15%に、最大300%（3倍）
            const levelBonus = Math.min((gameState.level - 1) * 0.15, 2.0);
            
            const isZigzag = gameState.level >= 10 && Math.random() < 0.3;
            const isRed = Math.random() < 0.5;
            
            const baseHp = isRed ? 15 : 40;
            const hp = Math.floor(baseHp * (1 + levelBonus));
            
            enemies.push({
                x: Math.random() * (canvas.width - 60) + 30,
                y: -30,
                vx: (Math.random() - 0.5) * (isRed ? 3 : 1.5),
                vy: (Math.random() * 2 + 1) * (isRed ? 1.5 : 0.7),
                hp: hp,
                maxHp: hp,
                size: 15,
                color: isZigzag ? '#ffff33' : (isRed ? '#ff3333' : '#ff9933'),
                value: 10 + gameState.level * 5,
                type: isZigzag ? 'zigzag' : 'normal',
                zigzagTime: 0
            });
        }, i * 200);
    }
    
    setTimeout(() => spawnEnemies(), 2000 - Math.min(gameState.level * 50, 1000));
}

// 青い敵専用のスポーン関数
function spawnBlueEnemy() {
    if (blueEnemyCount >= 3) return;
    
    const levelBonus = Math.min((gameState.level - 1) * 0.15, 2.0);
    const hp = Math.floor(120 * (1 + levelBonus)); // 基本HP 120（黄色の3倍）
    
    // 画面端の4つの位置からランダムに選択
    const positions = [
        { x: 50, y: 50, vx: 1, vy: 0, direction: 'right' },
        { x: canvas.width - 50, y: 50, vx: 0, vy: 1, direction: 'down' },
        { x: canvas.width - 50, y: canvas.height - 100, vx: -1, vy: 0, direction: 'left' },
        { x: 50, y: canvas.height - 100, vx: 0, vy: -1, direction: 'up' }
    ];
    
    const startPos = positions[Math.floor(Math.random() * positions.length)];
    
    enemies.push({
        x: startPos.x,
        y: startPos.y,
        vx: startPos.vx,
        vy: startPos.vy,
        direction: startPos.direction,
        hp: hp,
        maxHp: hp,
        size: 15 * 1.5,
        color: '#3333ff',
        value: 50 + gameState.level * 10,
        type: 'blue',
        shootCooldown: 0
    });
    blueEnemyCount++;
}

// 敵更新
function updateEnemies() {
    enemies = enemies.filter(enemy => {
        // HPが0以下の敵は即座に削除
        if (enemy.hp <= 0) {
            if (enemy.type === 'blue') blueEnemyCount--;
            return false;
        }
        
        if (enemy.type === 'blue') {
            // 青い敵の動き（画面端を周回）
            const speed = 1; // 速度を50%に
            const margin = 50;
            
            enemy.x += enemy.vx * speed;
            enemy.y += enemy.vy * speed;
            
            // コーナーに到達したら方向転換
            if (enemy.direction === 'right' && enemy.x >= canvas.width - margin) {
                enemy.x = canvas.width - margin;
                enemy.vx = 0;
                enemy.vy = 1;
                enemy.direction = 'down';
            } else if (enemy.direction === 'down' && enemy.y >= canvas.height - 100) {
                enemy.y = canvas.height - 100;
                enemy.vx = -1;
                enemy.vy = 0;
                enemy.direction = 'left';
            } else if (enemy.direction === 'left' && enemy.x <= margin) {
                enemy.x = margin;
                enemy.vx = 0;
                enemy.vy = -1;
                enemy.direction = 'up';
            } else if (enemy.direction === 'up' && enemy.y <= margin) {
                enemy.y = margin;
                enemy.vx = 1;
                enemy.vy = 0;
                enemy.direction = 'right';
            }
            
            // 1秒ごとに弾を撃つ
            enemy.shootCooldown++;
            if (enemy.shootCooldown >= 60) {
                enemy.shootCooldown = 0;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                bullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    damage: 1,
                    size: 8,
                    color: '#3333ff',
                    isEnemyBullet: true,
                    trail: []
                });
            }
        } else if (enemy.type === 'zigzag') {
            // ジグザグ移動
            enemy.zigzagTime += 0.1;
            enemy.x += Math.sin(enemy.zigzagTime) * 3;
            enemy.y += enemy.vy;
        } else {
            // 通常の敵
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // 画面端で反射
            if (enemy.x < enemy.size || enemy.x > canvas.width - enemy.size) {
                enemy.vx *= -1;
            }
        }
        
        // 画面外チェック（青い敵は画面外に出ない）
        if (enemy.type !== 'blue' && enemy.y > canvas.height + 30) {
            return false;
        }
        
        return true;
    });
}

// 衝突判定
function checkCollisions() {
    // バリアチェック
    const barrier = Object.values(player.skills).find(s => s && s.id === 'barrier');
    const hasBarrier = barrier && barrier.active;
    
    // 削除する敵のインデックスを保存
    const enemiesToRemove = new Set();
    
    // 弾丸と敵/プレイヤー
    bullets = bullets.filter(bullet => {
        // プレイヤーの弾と敵の衝突
        if (bullet.isPlayerBullet) {
            for (let i = 0; i < enemies.length; i++) {
                if (enemiesToRemove.has(i)) continue;
                
                const enemy = enemies[i];
                const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
                
                if (dist < bullet.size + enemy.size) {
                    enemy.hp -= bullet.damage;
                    
                    // ヒットエフェクト
                    createHitEffect(enemy.x, enemy.y);
                    
                    if (enemy.hp <= 0) {
                        // 敵撃破
                        gameState.score += enemy.value;
                        createExplosion(enemy.x, enemy.y);
                        dropExp(enemy.x, enemy.y, enemy.value);
                        if (enemy.type === 'blue') blueEnemyCount--;
                        enemiesToRemove.add(i);
                    }
                    
                    if (!bullet.pierce && !bullet.isLaser) {
                        return false;
                    }
                }
            }
        } 
        // 敵の弾
        else if (bullet.isEnemyBullet) {
            // プレイヤーの弾で破壊可能
            for (let playerBullet of bullets) {
                if (playerBullet.isPlayerBullet) {
                    const dist = Math.sqrt((bullet.x - playerBullet.x) ** 2 + (bullet.y - playerBullet.y) ** 2);
                    if (dist < bullet.size + playerBullet.size) {
                        createHitEffect(bullet.x, bullet.y);
                        return false;
                    }
                }
            }
            
            // プレイヤーとの衝突
            const invincible = Object.values(player.skills).find(s => s && s.id === 'invincible');
            const isInvincible = (invincible && invincible.active) || player.invulnerable > 0;
            
            if (!isInvincible) {
                const dist = Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2);
                if (dist < bullet.size + player.size) {
                    takeDamage();
                    createHitEffect(player.x, player.y);
                    return false;
                }
            }
        }
        
        return true;
    });
    
    // マークされた敵を削除
    enemies = enemies.filter((enemy, index) => !enemiesToRemove.has(index));
    
    // プレイヤーと敵
    const invincible = Object.values(player.skills).find(s => s && s.id === 'invincible');
    const isInvincible = (invincible && invincible.active) || player.invulnerable > 0;
    
    if (!isInvincible) {
        enemies = enemies.filter(enemy => {
            const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
            
            // バリアチェック
            if (hasBarrier && dist < barrier.radius) {
                // バリアが敵を押し返す
                const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.x += Math.cos(angle) * 5;
                enemy.y += Math.sin(angle) * 5;
                createHitEffect(enemy.x, enemy.y);
                enemy.hp -= player.damage * 0.5;
                
                if (enemy.hp <= 0) {
                    gameState.score += enemy.value;
                    createExplosion(enemy.x, enemy.y);
                    dropExp(enemy.x, enemy.y, enemy.value);
                    if (enemy.type === 'blue') blueEnemyCount--;
                    return false;
                }
            } else if (dist < player.size + enemy.size) {
                takeDamage();
                createHitEffect(player.x, player.y);
            }
            
            return true;
        });
    }
    
    // 経験値オーブ回収
    expOrbs = expOrbs.filter(orb => {
        const dist = Math.sqrt((player.x - orb.x) ** 2 + (player.y - orb.y) ** 2);
        const magnetRange = 50;
        
        if (dist < magnetRange) {
            // 引き寄せ
            const dx = player.x - orb.x;
            const dy = player.y - orb.y;
            orb.x += dx * 0.2;
            orb.y += dy * 0.2;
            
            if (dist < player.size + orb.size) {
                gameState.exp += orb.value;
                checkLevelUp();
                return false;
            }
        }
        
        orb.life--;
        return orb.life > 0;
    });
}

// ダメージ処理
function takeDamage() {
    player.lives--;
    player.invulnerable = 60; // 60フレーム = 1秒（60FPS想定）
    updateHearts();
    
    if (player.lives <= 0) {
        gameOver();
    }
}

// 死亡演出
function createDeathAnimation() {
    gameState.deathAnimating = true;
    
    // プレイヤー爆発
    for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 * i) / 50;
        const speed = Math.random() * 15 + 5;
        
        particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 10 + 5,
            life: 60,
            color: '#00ff00',
            type: 'death'
        });
    }
    
    // 1秒後にゲームオーバー画面
    setTimeout(() => {
        document.getElementById('finalScore').textContent = gameState.score.toLocaleString();
        document.getElementById('finalLevel').textContent = gameState.level;
        
        const minutes = Math.floor(gameState.time / 3600);
        const seconds = Math.floor((gameState.time % 3600) / 60);
        document.getElementById('finalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('gameOverModal').style.display = 'block';
    }, 1000);
}

// 経験値ドロップ
function dropExp(x, y, value) {
    const orbCount = Math.min(Math.ceil(value / 20), 5);
    
    for (let i = 0; i < orbCount; i++) {
        expOrbs.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            size: 6,
            value: Math.floor(value / orbCount),
            life: 400,
            color: '#00ff00',
            glow: 0
        });
    }
}

// レベルアップチェック
function checkLevelUp() {
    while (gameState.exp >= gameState.expNeeded) {
        gameState.exp -= gameState.expNeeded;
        gameState.level++;
        gameState.expNeeded = Math.floor(100 * Math.pow(1.2, gameState.level - 1));
        
        // レベルアップ時に敵の出現を一時的に減らす
        gameState.enemySpawnReduction = true;
        setTimeout(() => {
            gameState.enemySpawnReduction = false;
        }, 3000);
        
        // レベル20、30でアルティメット自動強化
        if ((gameState.level === 20 || gameState.level === 30) && player.skills.R) {
            player.skills.R.level = gameState.level;
            updateSkillLevels(player.skills.R);
        }
        
        showLevelUpModal();
    }
    
    updateUI();
}

// レベルアップモーダル表示
function showLevelUpModal() {
    gameState.paused = true;
    
    // スキルタイマーを一時停止
    const pausedAt = Date.now();
    Object.values(player.skills).forEach(skill => {
        if (skill && skill.active && skill.duration) {
            skill.pausedTime = pausedAt - skill.activatedAt;
        }
    });
    
    const modal = document.getElementById('levelUpModal');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';
    
    let options = [];
    
    // レベル10でアルティメットスキル選択
    if (gameState.level === 10) {
        document.getElementById('levelUpMessage').textContent = 'ULTIMATE SKILL UNLOCKED! Choose your ultimate:';
        options = [
            {...skills.invincible},
            {...skills.ricochet},
            {...skills.homing}
        ];
    } else {
        document.getElementById('levelUpMessage').textContent = 'Choose your upgrade:';
        
        // 基本スキル（3つまで）
        if (player.basicSkillCount < 3) {
            const availableBasicSkills = Object.values(skills).filter(s => 
                s.type === 'basic' && 
                !Object.values(player.skills).find(ps => ps && ps.id === s.id)
            );
            
            if (availableBasicSkills.length > 0) {
                const selected = availableBasicSkills[Math.floor(Math.random() * availableBasicSkills.length)];
                options.push({...selected});
            }
        }
        
        // 既存スキルのレベルアップ
        Object.entries(player.skills).forEach(([key, skill]) => {
            if (skill && skill !== 'empty' && skill.level < skill.maxLevel) {
                options.push({...skill, isLevelUp: true, key: key});
            }
        });
        
        // 基礎ステータス
        if (player.upgrades.baseSpeed < 5) {
            options.push({
                name: 'Speed Boost',
                description: `Increase base speed by 10% (Lv ${player.upgrades.baseSpeed + 1}/5)`,
                icon: '👟',
                type: 'stat',
                stat: 'baseSpeed'
            });
        }
        
        if (player.upgrades.baseDamage < 5) {
            options.push({
                name: 'Damage Boost',
                description: `Increase base damage by 10% (Lv ${player.upgrades.baseDamage + 1}/5)`,
                icon: '⚔️',
                type: 'stat',
                stat: 'baseDamage'
            });
        }
        
        if (player.upgrades.baseFireRate < 5) {
            options.push({
                name: 'Fire Rate Boost',
                description: `Increase base fire rate by 10% (Lv ${player.upgrades.baseFireRate + 1}/5)`,
                icon: '🔫',
                type: 'stat',
                stat: 'baseFireRate'
            });
        }
        
        // ヒール（ダメージを受けている場合のみ、最大5回）
        if (player.lives < player.maxLives && player.upgrades.healCount < 5) {
            options.push({
                name: 'Heal',
                description: 'Restore 1 life',
                icon: '❤️',
                type: 'heal'
            });
        }
        
        // ランダムに3つ選択
        options = options.sort(() => Math.random() - 0.5).slice(0, 3);
    }
    
    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'upgradeOption';
        if (option.type === 'ultimate') {
            optionDiv.className += ' ultimate';
        }
        
        let description = option.description;
        if (option.isLevelUp) {
            description = `Level ${option.level + 1}: ${option.description}`;
            if (option.level === 1 || option.level === 3) {
                description += ' (Duration +20%)';
            } else if (option.level === 2 || option.level === 5) {
                description += ' (Cooldown -20%)';
            } else if (option.level === 4 && option.levelBonus && option.levelBonus[5]) {
                description += ` (Next: ${option.levelBonus[5]})`;
            }
        }
        
        optionDiv.innerHTML = `
            <h3>${option.icon} ${option.name}</h3>
            <p>${description}</p>
        `;
        
        optionDiv.onclick = () => {
            if (option.type === 'stat') {
                player.upgrades[option.stat]++;
            } else if (option.type === 'heal') {
                player.lives = Math.min(player.lives + 1, player.maxLives);
                player.upgrades.healCount++;
                updateHearts();
            } else if (option.isLevelUp) {
                const playerSkill = Object.values(player.skills).find(s => s && s.id === option.id);
                if (playerSkill) {
                    updateSkillLevels(playerSkill);
                }
            } else {
                // 新しいスキル獲得
                const newSkill = {
                    ...option,
                    level: 1,
                    lastUsed: 0,
                    active: false,
                    activatedAt: 0
                };
                
                if (option.type === 'ultimate') {
                    player.skills.R = newSkill;
                } else {
                    // 基本スキルを空いているスロットに配置
                    for (let key of ['Q', 'W', 'E']) {
                        if (!player.skills[key] || player.skills[key] === 'empty') {
                            player.skills[key] = newSkill;
                            player.basicSkillCount++;
                            break;
                        }
                    }
                }
            }
            
            modal.style.display = 'none';
            gameState.paused = false;
            
            // スキルタイマー再開
            const resumedAt = Date.now();
            Object.values(player.skills).forEach(skill => {
                if (skill && skill.active && skill.pausedTime !== undefined) {
                    skill.activatedAt = resumedAt - skill.pausedTime;
                    delete skill.pausedTime;
                }
            });
            
            updateSkillBar();
        };
        
        optionsDiv.appendChild(optionDiv);
    });
    
    modal.style.display = 'block';
}

// エフェクト作成
function createHitEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            size: Math.random() * 3 + 1,
            life: 10,
            color: '#ffff00',
            type: 'hit'
        });
    }
}

function createExplosion(x, y) {
    // 通常の爆発エフェクト（視覚的のみ）
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 5 + 2;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 5 + 3,
            life: 30,
            color: `hsl(${Math.random() * 60}, 100%, 50%)`,
            type: 'explosion'
        });
    }
}

// パーティクル更新
function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.type === 'explosion' || particle.type === 'death') {
            particle.size *= 0.95;
            particle.vy += 0.1;
        } else if (particle.type === 'dash') {
            particle.size *= 0.9;
        }
        
        return particle.life > 0;
    });
}

// 描画
function draw() {
    // 背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 星の描画
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.globalAlpha = star.brightness;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // 経験値オーブ
    expOrbs.forEach(orb => {
        orb.glow = (orb.glow + 0.1) % (Math.PI * 2);
        const glowSize = orb.size + Math.sin(orb.glow) * 2;
        
        ctx.fillStyle = orb.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = orb.color;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 内部の光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, glowSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // パーティクル
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 40;
        
        if (particle.type === 'spark') {
            // 火花エフェクト
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x - particle.vx, particle.y - particle.vy);
            ctx.stroke();
        } else {
            ctx.fillRect(
                particle.x - particle.size / 2,
                particle.y - particle.size / 2,
                particle.size,
                particle.size
            );
        }
    });
    ctx.globalAlpha = 1;
    
    // 弾丸
    bullets.forEach(bullet => {
        if (bullet.isEnemyBullet) {
            ctx.fillStyle = bullet.color || '#ff00ff';
        } else {
            ctx.fillStyle = bullet.homing ? '#ff00ff' : 
                           bullet.pierce ? '#00ffff' : '#00ffff';
        }
        ctx.shadowBlur = 20;
        ctx.shadowColor = ctx.fillStyle;
        
        // トレイル
        if (bullet.trail && bullet.trail.length > 1) {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = bullet.size * 0.5;
            ctx.beginPath();
            bullet.trail.forEach((point, index) => {
                ctx.globalAlpha = index / bullet.trail.length * 0.5;
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 敵
    enemies.forEach(enemy => {
        // HPが0以下の敵は描画しない
        if (enemy.hp <= 0) return;
        
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = enemy.color;
        
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        if (enemy.type === 'blue') {
            // ひし形
            ctx.beginPath();
            ctx.moveTo(0, -enemy.size);
            ctx.lineTo(enemy.size, 0);
            ctx.lineTo(0, enemy.size);
            ctx.lineTo(-enemy.size, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            // 円形
            ctx.beginPath();
            ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // HPバー
        if (enemy.hp < enemy.maxHp && enemy.hp > 0) {
            const barWidth = enemy.size * 3;
            const barHeight = 4;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.size - 10, barWidth, barHeight);
            
            ctx.fillStyle = '#ff0000';
            const hpRatio = Math.max(0, enemy.hp / enemy.maxHp); // 負の値を防ぐ
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.size - 10, barWidth * hpRatio, barHeight);
        }
    });
    
    // プレイヤー（死亡演出中は描画しない）
    if (!gameState.deathAnimating) {
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // 無敵時の点滅
        if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
        
        // バリア表示
        const barrier = Object.values(player.skills).find(s => s && s.id === 'barrier');
        if (barrier && barrier.active) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, barrier.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // バリアパーティクル
            if (gameState.time % 5 === 0) {
                const angle = Math.random() * Math.PI * 2;
                particles.push({
                    x: player.x + Math.cos(angle) * barrier.radius,
                    y: player.y + Math.sin(angle) * barrier.radius,
                    vx: Math.cos(angle) * 0.5,
                    vy: Math.sin(angle) * 0.5,
                    size: 3,
                    life: 20,
                    color: '#00ffff',
                    type: 'barrier'
                });
            }
        }
        
        // Invincibleエフェクト
        const invincible = Object.values(player.skills).find(s => s && s.id === 'invincible');
        if (invincible && invincible.active) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = gameState.time * 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, player.size + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 本体
        ctx.fillStyle = '#00ff00';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00ff00';
        
        ctx.beginPath();
        ctx.moveTo(0, -player.size);
        ctx.lineTo(-player.size * 0.7, player.size * 0.7);
        ctx.lineTo(0, player.size * 0.4);
        ctx.lineTo(player.size * 0.7, player.size * 0.7);
        ctx.closePath();
        ctx.fill();
        
        // コックピット
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, player.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // ネオン風の枠を描画
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    
    // 外側の枠
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    
    // 内側の枠（より明るく）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'white';
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // 角の装飾
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    
    // 左上
    ctx.beginPath();
    ctx.moveTo(5, 25);
    ctx.lineTo(5, 5);
    ctx.lineTo(25, 5);
    ctx.stroke();
    
    // 右上
    ctx.beginPath();
    ctx.moveTo(canvas.width - 25, 5);
    ctx.lineTo(canvas.width - 5, 5);
    ctx.lineTo(canvas.width - 5, 25);
    ctx.stroke();
    
    // 左下
    ctx.beginPath();
    ctx.moveTo(5, canvas.height - 25);
    ctx.lineTo(5, canvas.height - 5);
    ctx.lineTo(25, canvas.height - 5);
    ctx.stroke();
    
    // 右下
    ctx.beginPath();
    ctx.moveTo(canvas.width - 25, canvas.height - 5);
    ctx.lineTo(canvas.width - 5, canvas.height - 5);
    ctx.lineTo(canvas.width - 5, canvas.height - 25);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score.toLocaleString();
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('exp').textContent = gameState.exp;
    document.getElementById('expNeeded').textContent = gameState.expNeeded;
    
    const minutes = Math.floor(gameState.time / 3600);
    const seconds = Math.floor((gameState.time % 3600) / 60);
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ゲームオーバー
function gameOver() {
    gameState.running = false;
    createDeathAnimation();
}

// リセット
function resetGame() {
    // アニメーションとインターバルをクリア
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (dashChargeInterval) {
        clearInterval(dashChargeInterval);
        dashChargeInterval = null;
    }
    
    gameState = {
        running: false,
        paused: false,
        score: 0,
        level: 1,
        exp: 0,
        expNeeded: 100,
        time: 0,
        deathAnimating: false,
        enemySpawnReduction: false,
        firstBlueSpawned: false,
        lastBlueSpawnTime: 0
    };
    
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        size: 20,
        lives: 5,
        maxLives: 5,
        invulnerable: 0,
        speed: 5,
        damage: 10,
        fireRate: 2.5,
        upgrades: {
            baseSpeed: 0,
            baseDamage: 0,
            baseFireRate: 0,
            healCount: 0
        },
        skills: {
            Q: null,
            W: null,
            E: null,
            R: null
        },
        basicSkillCount: 0
    };
    
    // スキルリセット
    Object.values(skills).forEach(skill => {
        skill.level = skill.type === 'ultimate' ? 10 : 0;
        skill.active = false;
        skill.lastUsed = 0;
        skill.activatedAt = 0;
        if (skill.id === 'dash') {
            skill.charges = 1;
            skill.maxCharges = 1;
        }
        if (skill.id === 'rapidFire') {
            skill.fireRateMultiplier = 2;
        }
        if (skill.id === 'barrier') {
            skill.radius = 50;
        }
        // 各スキルの duration と cooldown をリセット
        if (skill.baseDuration) {
            skill.duration = skill.baseDuration;
        }
        if (skill.baseCooldown) {
            skill.cooldown = skill.baseCooldown;
        }
    });
    
    bullets = [];
    enemies = [];
    particles = [];
    expOrbs = [];
    blueEnemyCount = 0;
    
    updateUI();
    updateHearts();
    updateSkillBar();
}

// ゲームループ
function gameLoop() {
    if (gameState.running && !gameState.paused) {
        gameState.time++;
        
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateParticles();
        updateStars();
        checkCollisions();
        updateUI();
        updateSkillBar();
    }
    
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// 初期画面表示
updateHearts();
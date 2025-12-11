// logic.js
// Version: v19.13.2
// Description: Core Game Logic (Shop Purchase with Custom Modal)

// ==========================================
// 1. Firebase Configuration & Utils
// ==========================================
window.firebaseConfig = {
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

window.db = null;
window.FieldValue = null;
window.isGameRunning = false; 

function updateStatus(m, t = 'wait') {
    const e = document.getElementById('dbStatus');
    if (e) {
        e.innerText = m;
        e.classList.remove('on', 'error');
        if (t === 'ok') e.classList.add('on');
        if (t === 'error') {
            e.classList.add('error');
            e.onclick = () => location.reload();
            e.style.cursor = 'pointer';
        }
    }
    console.log(`[Sys] ${m}`);
}

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        window.db = firebase.firestore();
        window.FieldValue = firebase.firestore.FieldValue;
        return true;
    }
    return false;
}

window.toggleDevMenu = function() {
    const el = document.getElementById('devMenuExpanded');
    if (el) el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
}

// ==========================================
// 2. Global Data & Constants
// ==========================================
window.ACHIEVEMENTS_MASTER_DATA = [
    { id: 'ach_01', icon: '👶', title: '응애 나 아기 유저', desc: '가입을 환영합니다!', type: 'System', condition_key: 'login_count', condition_value: 1, reward: 10 },
    { id: 'ach_03', icon: '🗳️', title: '소중한 한 표', desc: '첫 투표 참여.', type: 'Vote', condition_key: 'vote_count', condition_value: 1, reward: 10 },
    { id: 'ach_04', icon: '🔥', title: '불타는 투표권', desc: '티켓 소진.', type: 'System', condition_key: 'tickets', condition_value: 0, reward: 20 },
    { id: 'ach_05', icon: '💎', title: '육각형 인간', desc: '모든 스탯이 평균 50점 이상입니다.', type: 'Stat', condition_key: 'stats_average', condition_value: 50, reward: 100 },
    { id: 'ach_07', icon: '🤪', title: '이 구역의 미친X', desc: '[광기] 스탯이 압도적으로 높습니다.', type: 'Stat', condition_key: 'stats_mania_ratio', condition_value: 2, reward: 50 },
    { id: 'ach_10', icon: '💰', title: '자본주의의 맛', desc: '상점에서 아이템을 1회 구매했습니다.', type: 'Shop', condition_key: 'purchase_count', condition_value: 1, reward: 10 }
];

window.questions = [];
window.candidates = [];
window.tournamentRound = [];
window.nextRound = [];
window.currentQ = null;
window.currentFilter = -1;
window.isVoting = false;
window.currentRoundMax = 0;

window.myInfo = {
    tickets: 5,
    lastTicketDate: "",
    msg: "",
    tokens: 0,
    avatar: "👤",
    nickname: "",
    achievedIds: [],
    inventory: [],
    stats: [50, 50, 50, 50, 50, 50]
};

window.achievementsList = [];
window.achievedDateMap = {};
const STAT_MAP = ['지성', '센스', '멘탈', '인성', '텐션', '광기'];

function getUserId() {
    let u = localStorage.getItem('my_uid');
    if (!u) {
        u = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('my_uid', u);
    }
    return u;
}

// ==========================================
// 3. Initialization Logic
// ==========================================
window.initGame = async function() {
    updateStatus("● SDK 확인...");
    if (!initFirebase()) {
        updateStatus("● SDK 오류", 'error');
        return;
    }
    updateStatus("● DB 연결...");
    try {
        const db = window.db;

        // Achievements Load
        try {
            const as = await db.collection("achievements").get().catch(() => []);
            window.achievementsList = [];
            if(as.empty) throw new Error("No Data");
            as.forEach(d => window.achievementsList.push(d.data()));
        } catch (e) {
            window.achievementsList = window.ACHIEVEMENTS_MASTER_DATA;
        }

        updateStatus("● 데이터 로드..");

        const [qSnap, uSnap] = await Promise.all([
            db.collection("questions").get(),
            db.collection("users").get()
        ]).catch(e => { console.error(e); return [[], []]; });

        window.questions = [];
        if(qSnap) qSnap.forEach(d => window.questions.push(d.data()));

        window.candidates = [];
        if(uSnap) uSnap.forEach(d => {
            let u = d.data();
            u.id = d.id;
            u.stats = u.stats || [50, 50, 50, 50, 50, 50];
            if (!u.avatar) u.avatar = '👤';
            if (u.id !== getUserId() && u.nickname) window.candidates.push(u);
        });

        // My Info
        await window.checkAndResetTickets();
        const myDoc = await db.collection("users").doc(getUserId()).get().catch(() => null);
        if (myDoc && myDoc.exists) {
            const d = myDoc.data();
            window.myInfo = { ...window.myInfo, ...d };
            if (!window.myInfo.inventory) window.myInfo.inventory = [];
            
            await loadAchievementDates(getUserId());
            checkAchievements(d, d.achievedIds);
        } else {
            await db.collection("users").doc(getUserId()).set(window.myInfo);
        }

        updateStatus("● 렌더링..");

        if (window.myInfo.mbti && document.getElementById('screen-login').classList.contains('active')) {
            if (window.setMyTypeUI) window.setMyTypeUI(window.myInfo.mbti);
        }
        if (window.updateProfileUI) window.updateProfileUI();
        if (window.renderRankList && window.candidates.length >= 2) window.renderRankList(-1);

        setTimeout(() => updateStatus("● DB OK", 'ok'), 500);

    } catch (e) {
        console.error("Init Error:", e);
        updateStatus("● 로딩 실패", 'error');
    }
};

window.loadDataFromServer = function() {
    window.initGame();
}

// ==========================================
// 4. Ticket & Economy Logic
// ==========================================
window.checkAndResetTickets = async function() {
    const uid = getUserId();
    if (!window.db) return;
    try {
        const doc = await window.db.collection("users").doc(uid).get();
        if (doc.exists) {
            const d = doc.data();
            const t = new Date().toLocaleDateString();
            if (d.lastTicketDate !== t) {
                window.myInfo.tickets = 5;
                window.myInfo.lastTicketDate = t;
                window.db.collection("users").doc(uid).update({
                    tickets: 5,
                    lastTicketDate: t
                });
            }
        }
    } catch (e) {}
    if (window.updateTicketUI) window.updateTicketUI();
}

window.refillTickets = function() {
    if (!window.myInfo) return;
    window.myInfo.tickets = 5;
    if (window.db) window.db.collection("users").doc(getUserId()).update({ tickets: 5 });
    if (window.updateTicketUI) window.updateTicketUI();
    
    const m = document.getElementById('noTicketMsg');
    if (m) {
        m.remove();
        if(window.prepareVoteScreen) window.prepareVoteScreen();
    }
    alert("관리자 권한: 티켓 충전 완료! 🎫");
}

window.addRichTokens = function() {
    if (!window.myInfo) return;
    window.myInfo.tokens += 10000;
    if (window.db) window.db.collection("users").doc(getUserId()).update({ tokens: window.FieldValue.increment(10000) });
    if (window.updateProfileUI) window.updateProfileUI();
    alert("관리자 권한: 10,000💎 지급!");
}

window.saveProfileMsgToDB = async function(msg) {
    if (!window.db) return false;
    try {
        await window.db.collection("users").doc(getUserId()).update({ msg: msg });
        window.myInfo.msg = msg;
        if (window.updateProfileUI) window.updateProfileUI();
        return true;
    } catch (e) { return false; }
}

// ==========================================
// 5. Achievement System
// ==========================================
async function checkAchievements(stats, dbIds = []) {
    if (!window.db) return;
    const uid = getUserId();
    const set = new Set([...(window.myInfo.achievedIds || []), ...dbIds]);
    window.myInfo.achievedIds = Array.from(set);
    const newIds = [];

    window.achievementsList.forEach(ach => {
        if (set.has(ach.id)) return;
        let ok = false;
        const k = ach.condition_key, v = ach.condition_value;
        
        if (stats[k] !== undefined && stats[k] >= v) ok = true;
        if (k === 'stats_average' && (stats.stats && stats.stats.reduce((a, b) => a + b, 0) / 6 >= v)) ok = true;
        if (k === 'tickets' && window.myInfo.tickets === 0) ok = true;

        if (ok) {
            newIds.push(ach.id);
            set.add(ach.id);
            const reward = ach.reward || 10;
            window.myInfo.tokens += reward;
            
            window.db.collection("logs").add({
                target_uid: uid, sender_uid: 'system', action_type: 'ACHIEVE',
                stat_type: -1, score_change: reward, message: `업적 [${ach.title}] 달성`, ach_id: ach.id,
                is_read: false, timestamp: window.FieldValue.serverTimestamp()
            });
        }
    });

    if (newIds.length > 0) {
        const t = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '').slice(0, 10);
        newIds.forEach(id => window.achievedDateMap[id] = t);
        window.myInfo.achievedIds.push(...newIds);
        
        await window.db.collection("users").doc(uid).update({
            achievedIds: window.FieldValue.arrayUnion(...newIds),
            tokens: window.myInfo.tokens
        });
        if (window.renderAchievementsList) window.renderAchievementsList(window.myInfo.achievedIds);
        if (window.showToast) window.showToast(`업적 ${newIds.length}개 달성! 🎉`);
    }
}

async function loadAchievementDates(uid) {
    if (!window.db) return;
    try {
        const s = await window.db.collection("logs").where("target_uid", "==", uid).where("action_type", "==", "ACHIEVE").get();
        window.achievedDateMap = {};
        s.forEach(d => {
            const l = d.data();
            if (l.ach_id && l.timestamp) window.achievedDateMap[l.ach_id] = l.timestamp.toDate().toLocaleDateString('ko-KR').slice(0, 10);
        });
    } catch (e) {}
}

window.sendCommentToDB = function(uid, txt) {
    if (!window.db) return;
    const name = window.myInfo.nickname || '익명';
    window.db.collection("logs").add({
        target_uid: uid, sender_uid: getUserId(), action_type: 'COMMENT',
        stat_type: -1, score_change: 0, message: `${name}: ${txt}`,
        is_read: false, timestamp: window.FieldValue.serverTimestamp()
    });
    window.db.collection("users").doc(uid).update({ comment_count: window.FieldValue.increment(1) });
    if(window.showToast) window.showToast("전송 완료! 💌");
}

// ==========================================
// 6. Shop System
// ==========================================
// [v19.11.6 Updated] purchaseItem with Custom Modal
window.purchaseItem = function(cost, type, val, name) {
    if (!window.db) return;
    
    // Check Tokens
    if (window.myInfo.tokens < cost) {
        if(window.openSheet) window.openSheet('❌', '토큰 부족', `보유: ${window.myInfo.tokens}💎 / 필요: ${cost}💎`, '충전이 필요해요.');
        return;
    }
    
    // Check duplicate
    // [v19.13.2] Alert -> OpenSheet
    if (window.myInfo.inventory.some(i => i.value === val)) {
        if(window.openSheet) {
            window.openSheet('🎒', '이미 보유 중', '이미 가지고 있는 아이템이에요.', '보관함을 확인해보세요.');
        }
        return;
    }

    // [New] Use Custom Modal instead of confirm()
    window.showConfirmModal(
        "💎 아이템 구매",
        `${name} 구매하시겠습니까? (${cost}💎)`,
        async () => {
            // Actual Purchase Logic (Callback)
            const item = {
                id: `i_${Date.now()}`, type, value: val, name,
                purchasedAt: new Date().toISOString(), isActive: false
            };
            if (type === 'effect') {
                const d = new Date(); d.setDate(d.getDate() + 7);
                item.expiresAt = d.toISOString();
            }

            try {
                const uid = getUserId();
                await window.db.collection("users").doc(uid).update({
                    tokens: window.FieldValue.increment(-cost),
                    inventory: window.FieldValue.arrayUnion(item),
                    purchase_count: window.FieldValue.increment(1)
                });
                
                window.db.collection("logs").add({
                    target_uid: uid, sender_uid: 'system', action_type: 'PURCHASE',
                    stat_type: -1, score_change: -cost, message: `${name} 구매`,
                    is_read: false, timestamp: window.FieldValue.serverTimestamp()
                });

                window.myInfo.tokens -= cost;
                window.myInfo.inventory.push(item);
                
                if (window.updateProfileUI) window.updateProfileUI();
                if (window.openSheet) window.openSheet('🎉', '구매 성공', `${name} 획득!`, '설정 > 보관함에서 확인하세요.');
            } catch (e) {
                console.error(e);
                alert("구매 중 오류가 발생했습니다.");
            }
        }
    );
}

window.equipAvatar = async function(val) {
    if (!window.db) return;
    try {
        await window.db.collection("users").doc(getUserId()).update({ avatar: val });
        window.myInfo.avatar = val;
        if (window.updateProfileUI) window.updateProfileUI();
        if (window.closePopup) window.closePopup('inventoryOverlay');
        if (window.showToast) window.showToast("아바타가 변경되었습니다. ✨");
    } catch (e) {}
}

window.toggleEffect = async function(id) {
    if (!window.db) return;
    const idx = window.myInfo.inventory.findIndex(i => i.id === id);
    if (idx === -1) return;
    
    const newState = !window.myInfo.inventory[idx].isActive;
    const newInv = window.myInfo.inventory.map(i => {
        if (i.type === 'effect') {
            if (i.id === id) return { ...i, isActive: newState };
            if (newState) return { ...i, isActive: false };
        }
        return i;
    });

    try {
        await window.db.collection("users").doc(getUserId()).update({ inventory: newInv });
        window.myInfo.inventory = newInv;
        if (window.applyActiveEffects) window.applyActiveEffects();
        if (window.updateInventoryList) window.updateInventoryList('all');
    } catch (e) {}
}

// ==========================================
// 7. Rendering & Game Logic
// ==========================================
window.drawChart = function() {
    const c = document.getElementById('myRadarChart');
    if (!c) return;
    if (window.myChart) window.myChart.destroy();

    const style = getComputedStyle(document.body);
    const gridC = style.getPropertyValue('--chart-grid').trim();
    const labelC = style.getPropertyValue('--chart-label').trim();
    const fillC = style.getPropertyValue('--chart-fill').trim();
    const strokeC = style.getPropertyValue('--chart-stroke').trim();

    window.myChart = new Chart(c, {
        type: 'radar',
        data: {
            labels: STAT_MAP,
            datasets: [{
                label: '나', data: window.myInfo.stats,
                fill: true, backgroundColor: fillC, borderColor: strokeC,
                pointBackgroundColor: strokeC, pointBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: gridC },
                    grid: { color: gridC },
                    pointLabels: { color: labelC, font: { size: 14, weight: 'bold' } },
                    suggestedMin: 0, suggestedMax: 100,
                    ticks: { display: false, stepSize: 25 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
};

// [Game Logic]
window.realStartGame = async function() {
    if (window.isGameRunning) return;
    if (!window.myInfo || window.myInfo.tickets < 1) {
        alert("티켓이 부족합니다! (내일 충전됩니다)");
        return;
    }

    window.myInfo.tickets--;
    if (window.updateTicketUI) window.updateTicketUI();
    if (window.showToast) window.showToast("티켓이 한 장 사용되었습니다 🎫");

    if (window.db) window.db.collection("users").doc(getUserId()).update({ tickets: window.myInfo.tickets });

    if(window.questions.length === 0) { alert("질문 데이터가 없습니다."); return; }
    const q = window.questions[Math.floor(Math.random() * window.questions.length)];
    window.currentQ = q;

    const titleEl = document.getElementById('voteTitle');
    if(titleEl) {
        titleEl.innerText = q.text; 
        titleEl.style.display = 'block';
    }

    window.isGameRunning = true;
    document.getElementById('voteIntro').style.display = 'none';
    document.getElementById('voteWrapper').style.display = 'flex';
    document.getElementById('passBtn').style.display = 'block';
    document.getElementById('roundBadge').style.display = 'inline-block';

    const count = window.candidates.length;
    let targetSize = 2;
    if (count >= 32) targetSize = 32;
    else if (count >= 16) targetSize = 16;
    else if (count >= 8) targetSize = 8;
    else if (count >= 4) targetSize = 4;
    
    window.tournamentRound = [...window.candidates].sort(() => Math.random() - 0.5).slice(0, targetSize);
    window.nextRound = [];
    window.currentRoundMax = window.tournamentRound.length;
    
    updateRoundTitle();
    showMatch();
}

window.startTournament = function() { window.prepareVoteScreen(); }

function updateRoundTitle() {
    const b = document.getElementById('roundBadge');
    if (b && window.currentRoundMax) {
        const t = window.currentRoundMax / 2;
        const c = (window.currentRoundMax - window.tournamentRound.length) / 2 + 1;
        b.innerText = window.currentRoundMax === 2 ? "👑 결승전" : `🏆 ${window.currentRoundMax}강전 (${c}/${t})`;
    }
}

function showMatch() {
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('vsContainer').style.display = 'flex';
    if (window.tournamentRound.length < 2) {
        if (window.nextRound.length === 1) {
            showWinner(window.nextRound[0], true);
            return;
        }
        window.tournamentRound = window.nextRound;
        window.nextRound = [];
        window.tournamentRound.sort(() => Math.random() - 0.5);
        window.currentRoundMax = window.tournamentRound.length;
        updateRoundTitle();
        fireRoundEffect(window.currentRoundMax);
    }
    if (window.tournamentRound.length < 2) return;
    
    updateRoundTitle();
    updateCard('A', window.tournamentRound[0]);
    updateCard('B', window.tournamentRound[1]);
}

function fireRoundEffect(r) {
    const b = document.getElementById('roundBadge');
    if (b) {
        b.classList.remove('pulse-anim');
        void b.offsetWidth; b.classList.add('pulse-anim');
    }
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100, spread: 80, origin: { y: 0.2 },
            colors: r === 2 ? ['#ffd700', '#ffa500'] : ['#6c5ce7', '#00b894'],
            disableForReducedMotion: true
        });
    }
}

function updateCard(p, u) {
    if (!u) return;
    document.getElementById('name' + p).innerText = u.nickname;
    document.getElementById('desc' + p).innerText = u.desc || '';
    document.getElementById('avatar' + p).innerText = u.avatar;
}

window.vote = function(idx) {
    if (window.isVoting) return;
    window.isVoting = true;

    const winner = (idx === 0) ? window.tournamentRound[0] : window.tournamentRound[1];
    window.tournamentRound.splice(0, 2);
    window.nextRound.push(winner);

    window.myInfo.tokens += 10;
    if (window.db) window.db.collection("users").doc(getUserId()).update({
        vote_count: window.FieldValue.increment(1),
        tokens: window.FieldValue.increment(10)
    });

    if (window.updateProfileUI) window.updateProfileUI();
    saveScore(winner, 10);
    showMatch();
    setTimeout(() => window.isVoting = false, 300);
}

function showWinner(w, isFinal) {
    if(isFinal) window.isGameRunning = false;
    saveScore(w, 50);

    const uid = getUserId();
    if (window.db) {
        const s = window.myInfo.nickname || '익명';
        const st = STAT_MAP[window.currentQ ?.type || 0];
        window.db.collection("logs").add({
            target_uid: w.id, sender_uid: uid, action_type: 'VOTE',
            stat_type: window.currentQ ?.type || 0, score_change: 50,
            message: `[${st}] ${s}님의 최종 선택!`, is_read: false,
            timestamp: window.FieldValue.serverTimestamp()
        });
    }

    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('roundBadge').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'flex';
    
    document.getElementById('winnerName').innerText = w.nickname;
    document.getElementById('winnerAvatar').innerText = w.avatar;
    document.getElementById('winnerTitle').innerText = "🏆 최종 우승!";
    document.getElementById('winnerText').innerText = "이 친구에게 점수가 전달되었습니다.";

    // Action Buttons
    const wb = document.querySelector('.winner-box');
    wb.querySelectorAll('.btn-action').forEach(b => b.remove());
    const bc = document.createElement('div');
    bc.className = 'btn-action';
    bc.style.marginTop = '20px'; bc.style.width = '100%';

    const cb = document.createElement('button');
    cb.className = 'btn btn-outline';
    cb.innerText = "💬 한줄평 남기기";
    cb.onclick = () => window.openCommentPopup(w.id, w.nickname);
    bc.appendChild(cb);

    const nb = document.createElement('button');
    nb.className = 'btn btn-primary';
    
    // [v19.11.2 Fix] If tickets <= 0, Direct to Main Screen
    if (window.myInfo.tickets <= 0) {
        nb.innerText = "티켓 소진 (메인으로)";
        nb.onclick = () => window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
    } else {
        nb.innerText = "다음 토너먼트 시작하기";
        nb.onclick = window.prepareVoteScreen;
    }
    bc.appendChild(nb);
    wb.appendChild(bc);

    if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#ffd700', '#ffa500'] });
}

async function saveScore(w, s) {
    const type = window.currentQ ?.type || 0;
    w.stats[type] = Math.min(100, w.stats[type] + s);
    
    const i = window.candidates.findIndex(c => c.id === w.id);
    if (i !== -1) window.candidates[i].stats = w.stats;
    if (window.renderRankList) window.renderRankList(window.currentFilter);

    if (window.db) {
        window.db.collection("users").doc(w.id).collection("received_votes").add({
            stat_type: type, score_change: s, timestamp: window.FieldValue.serverTimestamp()
        });
        window.db.collection("users").doc(w.id).update({ stats: w.stats });
    }
}
// logic.js
// Version: v19.14.2
// Description: Core Game Logic & Data Handling

// 1. Firebase Config
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
window.isVoting = false; // 중복 클릭 방지

// 2. Constants & Data
window.ACHIEVEMENTS_MASTER_DATA = [
    { id: 'ach_01', icon: '👶', title: '응애 나 아기 유저', desc: '가입을 환영합니다!', type: 'System', condition_key: 'login_count', condition_value: 1, reward: 10 },
    { id: 'ach_03', icon: '🗳️', title: '소중한 한 표', desc: '첫 투표 참여.', type: 'Vote', condition_key: 'vote_count', condition_value: 1, reward: 10 },
    { id: 'ach_04', icon: '🔥', title: '불타는 투표권', desc: '티켓 소진.', type: 'System', condition_key: 'tickets', condition_value: 0, reward: 20 },
    { id: 'ach_05', icon: '💎', title: '육각형 인간', desc: '모든 스탯이 평균 50점 이상입니다.', type: 'Stat', condition_key: 'stats_average', condition_value: 50, reward: 100 },
    { id: 'ach_07', icon: '🤪', title: '이 구역의 미친X', desc: '[광기] 스탯이 압도적으로 높습니다.', type: 'Stat', condition_key: 'stats_mania_ratio', condition_value: 2, reward: 50 },
    { id: 'ach_10', icon: '💰', title: '자본주의의 맛', desc: '상점에서 아이템을 1회 구매했습니다.', type: 'Shop', condition_key: 'purchase_count', condition_value: 1, reward: 10 }
];
const STAT_MAP = ['지성', '센스', '멘탈', '인성', '텐션', '광기'];

window.questions = [];
window.candidates = [];
window.tournamentRound = [];
window.nextRound = [];
window.currentQ = null;
window.currentFilter = -1;
window.currentRoundMax = 0;

window.myInfo = {
    tickets: 5, lastTicketDate: "", msg: "", tokens: 0,
    avatar: "👤", nickname: "", achievedIds: [], inventory: [],
    stats: [50, 50, 50, 50, 50, 50], excluded_uids: [] 
};
window.achievementsList = [];
window.achievedDateMap = {};

// 3. Init
function initFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        window.db = firebase.firestore();
        window.FieldValue = firebase.firestore.FieldValue;
        return true;
    }
    return false;
}

function getUserId() {
    let u = localStorage.getItem('my_uid');
    if (!u) {
        u = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('my_uid', u);
    }
    return u;
}

window.initGame = async function() {
    if(window.updateStatus) window.updateStatus("● SDK 확인...");
    if (!initFirebase()) { if(window.updateStatus) window.updateStatus("● SDK 오류", 'error'); return; }
    
    if(window.updateStatus) window.updateStatus("● DB 연결...");
    try {
        const db = window.db;
        // Achievement Load
        try {
            const as = await db.collection("achievements").get().catch(() => []);
            window.achievementsList = [];
            if(as.empty) throw new Error("No Data");
            as.forEach(d => window.achievementsList.push(d.data()));
        } catch (e) { window.achievementsList = window.ACHIEVEMENTS_MASTER_DATA; }

        if(window.updateStatus) window.updateStatus("● 데이터 로드..");
        await window.checkAndResetTickets();
        
        // User Info Load
        const myDoc = await db.collection("users").doc(getUserId()).get().catch(() => null);
        if (myDoc && myDoc.exists) {
            const d = myDoc.data();
            window.myInfo = { ...window.myInfo, ...d };
            if (!window.myInfo.inventory) window.myInfo.inventory = [];
            if (!window.myInfo.excluded_uids) window.myInfo.excluded_uids = [];
            await loadAchievementDates(getUserId());
            checkAchievements(d, d.achievedIds);
        } else {
            await db.collection("users").doc(getUserId()).set(window.myInfo);
        }

        // Questions & Candidates
        const [qSnap, uSnap] = await Promise.all([db.collection("questions").get(), db.collection("users").get()]).catch(e => [[], []]);
        window.questions = [];
        if(qSnap) qSnap.forEach(d => window.questions.push(d.data()));

        window.candidates = [];
        if(uSnap) uSnap.forEach(d => {
            let u = d.data(); u.id = d.id;
            u.stats = u.stats || [50, 50, 50, 50, 50, 50];
            if (!u.avatar) u.avatar = '👤';
            if (u.id !== getUserId() && u.nickname && !window.myInfo.excluded_uids.includes(u.id)) {
                window.candidates.push(u);
            }
        });

        if(window.updateStatus) window.updateStatus("● 렌더링..");
        if (window.myInfo.mbti && document.getElementById('screen-login').classList.contains('active')) {
            if (window.setMyTypeUI) window.setMyTypeUI(window.myInfo.mbti);
        }
        if (window.updateProfileUI) window.updateProfileUI();
        if (window.renderRankList && window.candidates.length >= 2) window.renderRankList(-1);

        setTimeout(() => { if(window.updateStatus) window.updateStatus("● DB OK", 'ok'); }, 500);

    } catch (e) {
        console.error("Init Error:", e);
        if(window.updateStatus) window.updateStatus("● 로딩 실패", 'error');
    }
};

window.loadDataFromServer = function() { window.initGame(); }

// 4. Ticket & Economy
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
                window.db.collection("users").doc(uid).update({ tickets: 5, lastTicketDate: t });
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
    if(window.resetVoteScreenUI) window.resetVoteScreenUI(); // UI reset
    alert("관리자 권한: 티켓 충전 완료! 🎫");
}

window.addRichTokens = function() {
    if (!window.myInfo) return;
    window.myInfo.tokens += 10000;
    if (window.db) window.db.collection("users").doc(getUserId()).update({ tokens: window.FieldValue.increment(10000) });
    if (window.updateProfileUI) window.updateProfileUI();
    alert("관리자 권한: 10,000💎 지급!");
}

// logic.js - window.realStartGame 함수 전체 교체

window.realStartGame = async function() {
    if (window.isGameRunning) return;
    
    // 1. 티켓 확인 (없으면 바로 종료)
    if (!window.myInfo || window.myInfo.tickets < 1) {
        alert("티켓이 부족합니다! (내일 충전됩니다)");
        return;
    }

    // 2. [중요 수정] 후보자 수 검사 (티켓 차감 전에 수행!)
    // 4명 미만이면 경고를 띄우고 함수를 끝냅니다. (티켓 보호)
    if (!window.candidates || window.candidates.length < 4) { 
        alert("후보가 부족합니다. (최소 4명 이상 필요)\n친구를 더 초대하거나 테스트 데이터를 만들어주세요."); 
        return; 
    }

    // 3. 티켓 차감 (위 검사를 통과했으니 안전하게 차감)
    window.myInfo.tickets--;
    if (window.updateTicketUI) window.updateTicketUI();
    if (window.showToast) window.showToast("티켓이 한 장 사용되었습니다 🎫");
    if (window.db) window.db.collection("users").doc(getUserId()).update({ tickets: window.myInfo.tickets });

    // 4. 질문 데이터 확인
    if(window.questions.length === 0) { alert("질문 데이터가 없습니다."); return; }
    const q = window.questions[Math.floor(Math.random() * window.questions.length)];
    window.currentQ = q;

    // 5. 게임 상태 변경 및 UI 초기화
    window.isGameRunning = true;
    if(window.initVoteScreenUI) window.initVoteScreenUI(q.text);

    // 6. 대진표 생성 (안전한 로직)
    const count = window.candidates.length;
    let targetSize = 4; // 기본 4강으로 시작
    
    // 인원수에 맞춰서 가장 가까운 2의 제곱수(강) 선택
    if (count >= 32) targetSize = 32;
    else if (count >= 16) targetSize = 16;
    else if (count >= 8) targetSize = 8;
    else targetSize = 4; // 4~7명은 무조건 4강전
    
    // 랜덤 셔플 후 대진표 자르기
    window.tournamentRound = [...window.candidates].sort(() => Math.random() - 0.5).slice(0, targetSize);
    window.nextRound = [];
    window.currentRoundMax = window.tournamentRound.length;
    
    updateRoundTitle();
    showMatch();
}

function updateRoundTitle() {
    if(window.updateRoundBadgeUI) window.updateRoundBadgeUI(window.currentRoundMax, window.tournamentRound.length);
}

function showMatch() {
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
        if(window.fireRoundEffect) window.fireRoundEffect(window.currentRoundMax);
    }
    if (window.tournamentRound.length < 2) return;
    
    updateRoundTitle();
    if(window.updateVsCardUI) {
        window.updateVsCardUI(window.tournamentRound[0], window.tournamentRound[1]);
    }
}

// [Refactored] Integrated Animation Logic
window.vote = async function(idx) {
    if (window.isVoting) return;
    window.isVoting = true;

    // 1. Trigger Animation in UI
    if (window.animateVoteSelection) {
        await window.animateVoteSelection(idx); // Wait for animation
    }

    // 2. Logic Execution
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
    
    // 3. Next Match
    showMatch();
    window.isVoting = false;
}

function showWinner(w, isFinal) {
    if(isFinal) window.isGameRunning = false;
    saveScore(w, 50);

    const uid = getUserId();
    if (window.db) {
        const s = window.myInfo.nickname || '익명';
        const st = STAT_MAP[window.currentQ?.type || 0];
        window.db.collection("logs").add({
            target_uid: w.id, sender_uid: uid, action_type: 'VOTE',
            stat_type: window.currentQ?.type || 0, score_change: 50,
            message: `[${st}] ${s}님의 최종 선택!`, is_read: false,
            timestamp: window.FieldValue.serverTimestamp()
        });
    }

    // UI Delegation
    if(window.showWinnerScreen) window.showWinnerScreen(w);
}

async function saveScore(w, s) {
    const type = window.currentQ?.type || 0;
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

// 6. Exclude & Utils
window.openExcludeOption = function() {
    if (!window.tournamentRound || window.tournamentRound.length < 2) return;
    if (window.showExcludePopup) window.showExcludePopup(window.tournamentRound[0], window.tournamentRound[1]);
};

window.confirmExclude = function(targetId, targetName) {
    const msg = `'${targetName}'님을 목록에서<br>영구히 제외하시겠습니까?<br><span class="warn-text">(이 작업은 되돌릴 수 없습니다)</span>`;
    
    if(window.openCustomConfirm) {
        // 👇 [수정됨] 맨 앞에 제목("⚠️ 정말 제외할까요?")을 추가했습니다!
        window.openCustomConfirm("⚠️ 정말 제외할까요?", msg, async () => {
            if (!window.myInfo.excluded_uids) window.myInfo.excluded_uids = [];
            window.myInfo.excluded_uids.push(targetId);
            window.candidates = window.candidates.filter(u => u.id !== targetId);

            if (window.db) {
                try {
                    await window.db.collection("users").doc(getUserId()).update({ excluded_uids: window.FieldValue.arrayUnion(targetId) });
                    if(window.showToast) window.showToast("제외되었습니다. 👋");
                } catch(e) { console.error(e); }
            }
            if (window.closePopup) window.closePopup('excludeOverlay');
            window.isGameRunning = false;
            if(window.prepareVoteScreen) window.prepareVoteScreen(); 
        });
    }
};

window.saveProfileMsgToDB = async function(msg) {
    if (!window.db) return false;
    try {
        await window.db.collection("users").doc(getUserId()).update({ msg: msg });
        window.myInfo.msg = msg;
        if (window.updateProfileUI) window.updateProfileUI();
        return true;
    } catch (e) { return false; }
}

// Achievement Check & Load (Helper functions omitted for brevity, logic remains same)
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
            newIds.push(ach.id); set.add(ach.id);
            const reward = ach.reward || 10;
            window.myInfo.tokens += reward;
            window.db.collection("logs").add({ target_uid: uid, sender_uid: 'system', action_type: 'ACHIEVE', stat_type: -1, score_change: reward, message: `업적 [${ach.title}] 달성`, ach_id: ach.id, is_read: false, timestamp: window.FieldValue.serverTimestamp() });
        }
    });
    if (newIds.length > 0) {
        const t = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '').slice(0, 10);
        newIds.forEach(id => window.achievedDateMap[id] = t);
        window.myInfo.achievedIds.push(...newIds);
        await window.db.collection("users").doc(uid).update({ achievedIds: window.FieldValue.arrayUnion(...newIds), tokens: window.myInfo.tokens });
        if (window.renderAchievementsList) window.renderAchievementsList(window.myInfo.achievedIds);
        if (window.showToast) window.showToast(`업적 ${newIds.length}개 달성! 🎉`);
    }
}
async function loadAchievementDates(uid) {
    if (!window.db) return;
    try {
        const s = await window.db.collection("logs").where("target_uid", "==", uid).where("action_type", "==", "ACHIEVE").get();
        window.achievedDateMap = {};
        s.forEach(d => { const l = d.data(); if (l.ach_id && l.timestamp) window.achievedDateMap[l.ach_id] = l.timestamp.toDate().toLocaleDateString('ko-KR').slice(0, 10); });
    } catch (e) {}
}
window.sendCommentToDB = function(uid, txt) {
    if (!window.db) return;
    const name = window.myInfo.nickname || '익명';
    window.db.collection("logs").add({ target_uid: uid, sender_uid: getUserId(), action_type: 'COMMENT', stat_type: -1, score_change: 0, message: `${name}: ${txt}`, is_read: false, timestamp: window.FieldValue.serverTimestamp() });
    window.db.collection("users").doc(uid).update({ comment_count: window.FieldValue.increment(1) });
    if(window.showToast) window.showToast("전송 완료! 💌");
}
// logic.js - window.purchaseItem 수정

window.purchaseItem = function(cost, type, val, name) {
    if (!window.db) return;
    
    // 1. 토큰 부족 체크
    if (window.myInfo.tokens < cost) { 
        if(window.openSheet) window.openSheet('❌', '토큰 부족', `보유: ${window.myInfo.tokens}💎 / 필요: ${cost}💎`, '충전이 필요해요.'); 
        return; 
    }
    
    // 2. 이미 보유 중 체크
    if (window.myInfo.inventory.some(i => i.value === val)) { 
        if(window.openSheet) window.openSheet('🎒', '이미 보유 중', '이미 가지고 있는 아이템이에요.', '보관함을 확인해보세요.'); 
        return; 
    }

    // 3. 구매 확인 팝업 (여기 수정됨! ✨)
    if(window.openCustomConfirm) {
        // 첫 번째 인자로 "💎 아이템 구매" (제목)을 추가했습니다.
        window.openCustomConfirm("💎 아이템 구매", `${name} 구매하시겠습니까? (${cost}💎)`, async () => {
            const item = { id: `i_${Date.now()}`, type, value: val, name, purchasedAt: new Date().toISOString(), isActive: false };
            if (type === 'effect') { const d = new Date(); d.setDate(d.getDate() + 7); item.expiresAt = d.toISOString(); }
            try {
                const uid = getUserId();
                await window.db.collection("users").doc(uid).update({ tokens: window.FieldValue.increment(-cost), inventory: window.FieldValue.arrayUnion(item), purchase_count: window.FieldValue.increment(1) });
                window.db.collection("logs").add({ target_uid: uid, sender_uid: 'system', action_type: 'PURCHASE', stat_type: -1, score_change: -cost, message: `${name} 구매`, is_read: false, timestamp: window.FieldValue.serverTimestamp() });
                window.myInfo.tokens -= cost; window.myInfo.inventory.push(item);
                if (window.updateProfileUI) window.updateProfileUI();
                if (window.openSheet) window.openSheet('🎉', '구매 성공', `${name} 획득!`, '설정 > 보관함에서 확인하세요.');
            } catch (e) { alert("구매 중 오류가 발생했습니다."); }
        });
    }
}

window.equipAvatar = async function(val) {
    if (!window.db) return;
    try { await window.db.collection("users").doc(getUserId()).update({ avatar: val }); window.myInfo.avatar = val; if (window.updateProfileUI) window.updateProfileUI(); if (window.closePopup) window.closePopup('inventoryOverlay'); if (window.showToast) window.showToast("아바타가 변경되었습니다. ✨"); } catch (e) {}
}
window.toggleEffect = async function(id) {
    if (!window.db) return;
    const idx = window.myInfo.inventory.findIndex(i => i.id === id); if (idx === -1) return;
    const newState = !window.myInfo.inventory[idx].isActive;
    const newInv = window.myInfo.inventory.map(i => { if (i.type === 'effect') { if (i.id === id) return { ...i, isActive: newState }; if (newState) return { ...i, isActive: false }; } return i; });
    try { await window.db.collection("users").doc(getUserId()).update({ inventory: newInv }); window.myInfo.inventory = newInv; if (window.applyActiveEffects) window.applyActiveEffects(); if (window.updateInventoryList) window.updateInventoryList('all'); } catch (e) {}
}
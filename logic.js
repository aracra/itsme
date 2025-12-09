// logic.js (Full Code: Patch v6.1 - Stable)

// ========================================
// Firebase 초기화
// ========================================
window.firebaseConfig = { 
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
} else {
    console.error("Firebase SDK가 로드되지 않았습니다!");
}

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ========================================
// Firestore FieldValue 전역 참조
// ========================================
const FieldValue = typeof firebase !== 'undefined' 
    ? firebase.firestore.FieldValue 
    : { 
        increment: (val) => val, 
        serverTimestamp: () => new Date(),
    };

window.db = db;
window.FieldValue = FieldValue;

// ========================================
// 업적 마스터 데이터
// ========================================
window.ACHIEVEMENTS_MASTER_DATA = [
    { id: 'ach_01', icon: '👶', title: '응애 나 아기 유저', desc: '가입을 환영합니다! 시작이 반입니다.', type: 'System', condition_key: 'login_count', condition_value: 1, reward: 10 },
    { id: 'ach_02', icon: '👋', title: '똑똑, 누구 없소?', desc: '첫 번째 그룹 생성 및 초대 링크 공유.', type: 'Group', condition_key: 'group_count', condition_value: 1, reward: 30 },
    { id: 'ach_03', icon: '🗳️', title: '소중한 한 표', desc: '친구 평가에 처음으로 참여했습니다.', type: 'Vote', condition_key: 'vote_count', condition_value: 1, reward: 10 },
    { id: 'ach_04', icon: '🔥', title: '불타는 투표권', desc: '하루 티켓 5장을 모두 소진했습니다.', type: 'System', condition_key: 'tickets', condition_value: 0, reward: 20 },
    { id: 'ach_05', icon: '💎', title: '육각형 인간', desc: '모든 스탯이 평균 50점 이상입니다.', type: 'Stat', condition_key: 'stats_average', condition_value: 50, reward: 100 },
    { id: 'ach_06', icon: '🎤', title: '확신의 센터상', desc: '친구 랭킹에서 1위를 달성했습니다.', type: 'Stat', condition_key: 'rank', condition_value: 1, reward: 150 },
    { id: 'ach_07', icon: '🤪', title: '이 구역의 미친X', desc: '[광기] 스탯이 압도적으로 높습니다.', type: 'Stat', condition_key: 'stats_mania_ratio', condition_value: 2, reward: 50 },
    { id: 'ach_08', icon: '🧊', title: '시베리아 벌판', desc: '[멘탈] 점수가 높아 냉철해 보입니다.', type: 'Stat', condition_key: 'stats_mentality', condition_value: 80, reward: 40 },
    { id: 'ach_09', icon: '💬', title: '투머치 토커', desc: '한줄평(코멘트)을 10개 이상 받았습니다.', type: 'Comment', condition_key: 'comment_count', condition_value: 10, reward: 20 },
    { id: 'ach_10', icon: '💰', title: '자본주의의 맛', desc: '상점에서 아이템을 1회 구매했습니다.', type: 'Shop', condition_key: 'purchase_count', condition_value: 1, reward: 10 }
];

// ========================================
// 전역 변수 설정 
// ========================================
window.questions = [];
window.candidates = [];
window.tournamentRound = [];
window.nextRound = [];
window.currentQ = null;
window.currentFilter = -1;
window.isVoting = false; 
window.isGamePaid = false;
window.currentRoundMax = 0; 
window.myInfo = {
    tickets: 5,
    lastTicketDate: "",
    msg: "상태 메시지를 입력해주세요",
    tokens: 0,
    avatar: "🦊",
    nickname: "",
    achievedIds: [], 
    stats: [50, 50, 50, 50, 50, 50] 
};

window.achievementsList = []; 
window.achievedDateMap = {};
const STAT_MAP = ['지성', '센스', '멘탈', '인성', '텐션', '광기']; 


// ========================================
// 사용자 ID 관리 및 DB 저장
// ========================================
function getUserId() {
    let uid = localStorage.getItem('my_uid');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('my_uid', uid);
    }
    return uid;
}

function saveMyInfoToDB() {
    if(!db) return;
    const uid = getUserId();
    db.collection("users").doc(uid).set({
        tickets: window.myInfo.tickets,
        lastTicketDate: window.myInfo.lastTicketDate,
        tokens: window.myInfo.tokens,
        avatar: window.myInfo.avatar,
        nickname: window.myInfo.nickname,
        stats: window.myInfo.stats 
    }, { merge: true });
}

window.saveNicknameToDB = function(nickname) {
    if (!db || !nickname) return;
    const uid = getUserId();
    db.collection("users").doc(uid).set({
        nickname: nickname
    }, { merge: true });
}

window.saveProfileMsgToDB = async function(msg) {
    if (!db || !window.myInfo) return false;
    const uid = getUserId();
    const cleanMsg = (msg || "").trim().substring(0, 50);
    
    try {
        await db.collection("users").doc(uid).set({ msg: cleanMsg }, { merge: true });
        window.myInfo.msg = cleanMsg || "상태 메시지를 입력해주세요";
        
        if (typeof window.updateProfileUI === 'function') {
            window.updateProfileUI();
        }
        return true;
    } catch (e) {
        console.error("상태 메시지 저장 실패:", e);
        return false;
    }
}

// ========================================
// 🏆 업적 체크 함수
// ========================================
async function checkAchievements(userStats, dbAchievedIds = []) {
    if (!db || window.achievementsList.length === 0) return []; 
    const newlyAchieved = [];
    const uid = getUserId();

    if (!window.myInfo.achievedIds) window.myInfo.achievedIds = [];
    
    const currentAchievedSet = new Set([...window.myInfo.achievedIds, ...dbAchievedIds]);
    window.myInfo.achievedIds = Array.from(currentAchievedSet);

    window.achievementsList.forEach(achievement => {
        if (currentAchievedSet.has(achievement.id)) return;
        
        let isAchieved = false;
        const key = achievement.condition_key;
        const val = achievement.condition_value;
        
        if (userStats[key] !== undefined) {
            if (userStats[key] >= val) {
                isAchieved = true;
            }
        }
        
        if (key === 'stats_average') {
            const avg = userStats.stats.reduce((sum, v) => sum + v, 0) / userStats.stats.length;
            if (avg >= val) isAchieved = true;
        } 
        else if (key === 'stats_mentality') {
            if (userStats.stats[2] >= val) isAchieved = true;
        }
        else if (key === 'stats_mania_ratio') {
            const mania = userStats.stats[5];
            const otherAvg = (userStats.stats.reduce((sum, v, i) => sum + (i === 5 ? 0 : v), 0) / 5) || 1;
            if (mania >= otherAvg * val) isAchieved = true;
        }
        
        if (isAchieved) {
            newlyAchieved.push(achievement.id);
            window.myInfo.achievedIds.push(achievement.id);
            currentAchievedSet.add(achievement.id);

            console.log(`[업적 달성]: ${achievement.title}, 보상: ${achievement.reward}💎`);
            window.myInfo.tokens += achievement.reward; 
            
            db.collection("logs").add({
                target_uid: uid,
                sender_uid: 'system',
                action_type: 'ACHIEVE',
                stat_type: -1, 
                score_change: achievement.reward,
                message: `업적 [${achievement.title}]을(를) 달성했습니다. 토큰 ${achievement.reward}개 획득!`,
                ach_id: achievement.id,
                is_read: false, 
                timestamp: FieldValue.serverTimestamp() 
            });
        }
    });

    if (newlyAchieved.length > 0) {
        const finalAchievedIds = Array.from(currentAchievedSet);
        await db.collection("users").doc(uid).update({ 
            achievedIds: finalAchievedIds, 
            tokens: window.myInfo.tokens 
        });
        
        await loadAchievementDates(uid); 

        const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3').slice(0, 10);
        newlyAchieved.forEach(id => {
             window.achievedDateMap[id] = todayStr;
        });
        
        if (typeof window.renderAchievementsList === 'function') {
            window.renderAchievementsList(finalAchievedIds);
        }
        return newlyAchieved;
    }
    return [];
}

async function loadAchievementDates(uid) {
    if (!db) return;

    try {
        const logSnap = await db.collection("logs")
            .where("target_uid", "==", uid)
            .where("action_type", "==", "ACHIEVE")
            .orderBy("timestamp", "asc")
            .get();

        window.achievedDateMap = {};
        const tempAchievedIds = [];

        logSnap.forEach(doc => {
            const log = doc.data();
            if (log.ach_id && !tempAchievedIds.includes(log.ach_id)) {
                if (log.timestamp) {
                    const date = log.timestamp.toDate().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3').slice(0, 10);
                    window.achievedDateMap[log.ach_id] = date;
                    tempAchievedIds.push(log.ach_id);
                }
            }
        });
    } catch (e) {
        console.error("업적 날짜 로드 실패:", e);
    }
}


// ========================================
// 토너먼트 진행 함수
// ========================================
window.startTournament = function() {
    if (window.myInfo.tickets <= 0) {
        if (typeof window.disableVoteScreen === 'function') {
            window.disableVoteScreen();
        } else {
            alert("티켓 소진!");
        }
        return;
    }

    if (!window.candidates || window.candidates.length < 2) {
        console.warn("토너먼트 후보 부족. (최소 2명 필요)");
        const vsContainer = document.getElementById('vsContainer');
        if(vsContainer) {
            vsContainer.innerHTML = `<div style="padding:50px; text-align:center; color:#636e72;">
                <h3>👻 친구가 부족해요!</h3>
                <p>초대 링크를 보내 친구들을 모아보세요.</p>
                <button class="btn btn-primary" onclick="alert('초대 링크 복사 기능 준비중!')">친구 초대하기</button>
            </div>`;
        }
        document.getElementById('passBtn').style.display = 'none';
        return;
    }

    window.isGamePaid = false;
    
    const noTicketMsg = document.getElementById('noTicketMsg');
    if (noTicketMsg) noTicketMsg.remove();
    
    const vsContainer = document.getElementById('vsContainer');
    if(vsContainer) {
        vsContainer.style.display = 'flex';
        if (!vsContainer.querySelector('.vs-card')) {
             location.reload();
             return;
        }
    }
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'block';
    
    const badge = document.getElementById('roundBadge');
    if(badge) badge.style.display = 'inline-block';

    if(window.questions.length > 0) {
        window.currentQ = window.questions[Math.floor(Math.random() * window.questions.length)];
        const titleEl = document.getElementById('voteTitle');
        if(titleEl && window.currentQ) titleEl.innerText = window.currentQ.text;
    } else {
        document.getElementById('voteTitle').innerText = "질문 데이터 로딩 중...";
        return;
    }
    
    let players = [...window.candidates].sort(() => Math.random() - 0.5);
    // 최대 8명까지
    if(players.length >= 8) players = players.slice(0, 8);
    else if(players.length >= 4) players = players.slice(0, 4);
    else players = players.slice(0, 2);
    
    window.tournamentRound = players;
    window.nextRound = [];
    
    window.currentRoundMax = players.length;
    
    updateRoundTitle();
    showMatch();
}

function updateRoundTitle() {
    const badge = document.getElementById('roundBadge');
    if(badge && window.currentRoundMax > 0) {
        const totalMatches = window.currentRoundMax / 2;
        const currentMatch = (window.currentRoundMax - window.tournamentRound.length) / 2 + 1;
        
        if(window.currentRoundMax === 2) {
            badge.innerText = "👑 결승전";
        } else {
            badge.innerText = `🏆 ${window.currentRoundMax}강전 (${currentMatch}/${totalMatches})`;
        }
    }
}

function showMatch() {
    // 1. 현재 라운드 종료 체크
    if(window.tournamentRound.length < 2) {
        if(window.nextRound.length === 1) {
            showWinner(window.nextRound[0]);
            return;
        }
        if(window.nextRound.length > 0) {
            window.tournamentRound = window.nextRound;
            window.nextRound = [];
            window.tournamentRound.sort(() => Math.random() - 0.5); 
            
            window.currentRoundMax = window.tournamentRound.length;
            updateRoundTitle();
            
            fireRoundEffect(window.currentRoundMax);
        } else {
            console.error("토너먼트 오류: 다음 라운드 진출자가 없습니다.");
            return;
        }
    }
    
    if (window.tournamentRound.length < 2) {
        console.error("매치 생성 실패: 대진표 데이터 오류.");
        alert("일시적인 오류가 발생했습니다. 새로고침 해주세요.");
        return; 
    }
    
    updateRoundTitle();
    
    updateCard('A', window.tournamentRound[0]);
    updateCard('B', window.tournamentRound[1]);
}

function fireRoundEffect(round) {
    const badge = document.getElementById('roundBadge');
    if(badge) {
        badge.classList.remove('pulse-anim');
        void badge.offsetWidth; 
        badge.classList.add('pulse-anim');
    }

    const colors = round === 2 ? ['#ffd700', '#ffa500'] : ['#6c5ce7', '#00b894'];
    
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.2 }, 
            colors: colors,
            disableForReducedMotion: true
        });
    }
}

function updateCard(pos, user) {
    if(!user) return;
    document.getElementById('name'+pos).innerText = user.nickname;
    document.getElementById('desc'+pos).innerText = user.desc || ""; 
    document.getElementById('avatar'+pos).innerText = user.avatar;
}

window.vote = function(idx) {
    if (window.isVoting) return;
    if (!window.tournamentRound || window.tournamentRound.length < 2) return;

    // [🔥 v6.1 핵심 수정] 티켓 0개여도 이미 지불했으면(isGamePaid) 통과!
    if (!window.isGamePaid && window.myInfo.tickets <= 0) { 
        alert("티켓 소진!");
        return; 
    }

    window.isVoting = true;
    
    const uid = getUserId();
    const userUpdate = { 
        vote_count: FieldValue.increment(1), 
        tokens: FieldValue.increment(10)
    };
    
    if (!window.isGamePaid) {
        userUpdate.tickets = FieldValue.increment(-1);
        window.myInfo.tickets = Math.max(0, window.myInfo.tickets - 1);
        window.isGamePaid = true; 
        console.log("🎟️ 티켓 1장 차감됨 (게임 시작)");
    }

    db.collection("users").doc(uid).set(userUpdate, { merge: true });
    
    window.myInfo.tokens = (window.myInfo.tokens || 0) + 10;
    
    const p1 = window.tournamentRound.shift();
    const p2 = window.tournamentRound.shift();
    const winner = idx === 0 ? p1 : p2;
    window.nextRound.push(winner);
    
    if (typeof window.updateTicketUI === 'function') window.updateTicketUI();
    if (typeof window.updateProfileUI === 'function') window.updateProfileUI();

    showMatch();
    
    setTimeout(() => {
        window.isVoting = false;
    }, 500);
}

function showWinner(winner) {
    saveScore(winner, 20);
    
    (async () => {
        const uid = getUserId();
        const myStatsDoc = await db.collection("users").doc(uid).get();
        if (myStatsDoc.exists) {
            const statsData = myStatsDoc.data();
            statsData.uid = uid;
            await checkAchievements(statsData, statsData.achievedIds);
        }
        
        const senderName = window.myInfo.nickname || '익명';
        db.collection("logs").add({
            target_uid: winner.id,
            sender_uid: getUserId(),
            action_type: 'VOTE',
            stat_type: window.currentQ.type !== undefined ? window.currentQ.type : 0,
            score_change: 20,
            message: `${senderName}님이 투표하여 [${STAT_MAP[window.currentQ.type] || '스탯'}] 점수를 받았습니다.`,
            is_read: false,
            timestamp: FieldValue.serverTimestamp() 
        });
    })();
    
    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    
    // [🔥 v6.1 확인] 우승 화면에서 뱃지 확실하게 숨김
    const badge = document.getElementById('roundBadge');
    if(badge) badge.style.display = 'none';

    document.getElementById('winnerContainer').style.display = 'flex';
    document.getElementById('winnerName').innerText = winner.nickname;
    document.getElementById('winnerAvatar').innerText = winner.avatar;
    document.getElementById('winnerText').innerText = `이 친구에게 점수가 전달되었습니다.`;
    
    if (window.myInfo.tickets <= 0) {
        if (typeof window.disableVoteScreen === 'function') {
            setTimeout(window.disableVoteScreen, 1500); 
        }
    }

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

async function saveScore(winner, score) {
    if (!winner.stats) winner.stats = [50,50,50,50,50,50];
    const statIdx = window.currentQ.type !== undefined ? window.currentQ.type : 0;
    
    winner.stats[statIdx] = Math.min(100, winner.stats[statIdx] + score); 
    
    const candidateIndex = window.candidates.findIndex(c => c.id === winner.id);
    if(candidateIndex !== -1) {
        window.candidates[candidateIndex].stats = winner.stats;
    }
    
    if (typeof window.renderRankList === 'function') {
        window.renderRankList(window.currentFilter);
    }
    
    await db.collection("users").doc(winner.id).collection("received_votes").add({
        stat_type: statIdx,
        score_change: score,
        timestamp: FieldValue.serverTimestamp() 
    });

    try {
        await db.collection("users").doc(winner.id).set({ stats: winner.stats }, { merge: true });
    } catch(e) { console.error(e); }
}


// ========================================
// DB 초기화 및 게임 초기 로드
// ========================================
async function initializeAchievementsDB() {
    if (!db) return;
    try {
        const achSnap = await db.collection("achievements").doc(window.ACHIEVEMENTS_MASTER_DATA[0].id).get();
        if (!achSnap.exists) {
            const batch = db.batch();
            window.ACHIEVEMENTS_MASTER_DATA.forEach(ach => {
                const docRef = db.collection("achievements").doc(ach.id);
                batch.set(docRef, ach);
            });
            await batch.commit();
        }
        
        const masterSnap = await db.collection("achievements").get();
        window.achievementsList = [];
        masterSnap.forEach(doc => window.achievementsList.push(doc.data()));
        
    } catch (e) {
        console.error("DB 초기화 및 업적 로드 실패:", e);
    }
}


window.initGame = async function() {
    if (!db) return; 

    try {
        console.log("DB 연결 및 초기화 시도...");
        
        await initializeAchievementsDB();
        
        // 질문 데이터 로드
        const qSnap = await db.collection("questions").get();
        window.questions = [];
        qSnap.forEach(doc => window.questions.push(doc.data()));
        
        // 사용자 데이터 로드 및 후보 설정 
        const uSnap = await db.collection("users").get();
        window.candidates = [];
        uSnap.forEach(doc => {
            let d = doc.data();
            d.stats = d.stats || [50,50,50,50,50,50];
            d.id = doc.id;
            if (d.id !== getUserId() && d.nickname && d.avatar) {
                window.candidates.push(d);
            }
        });

        await window.checkAndResetTickets();
        
        const myStatsDoc = await db.collection("users").doc(getUserId()).get();
        if (myStatsDoc.exists) {
            const stats = myStatsDoc.data();
            stats.uid = getUserId();
            stats.stats = window.myInfo.stats; 
            stats.achievedIds = stats.achievedIds || [];
            stats.login_count = (stats.login_count || 0) + 1; 
            
            await db.collection("users").doc(getUserId()).set({ login_count: stats.login_count }, { merge: true });
            await loadAchievementDates(stats.uid);
            await checkAchievements(stats, stats.achievedIds);
        }

        // 로그인 처리 및 화면 전환 로직 안전화
        if (window.myInfo.mbti && document.getElementById('screen-login').classList.contains('active')) {
             if(typeof window.setMyTypeUI === 'function') {
                 window.setMyTypeUI(window.myInfo.mbti);
             }
        } 
        else if (window.candidates.length >= 2) {
            if (typeof window.renderRankList === 'function') { window.renderRankList(window.currentFilter); }
        }
        
        if (typeof window.updateProfileUI === 'function') {
            window.updateProfileUI(); 
        }

        const status = document.getElementById('dbStatus');
        if(status) {
            status.innerText = "● DB OK";
            status.style.color = "#00b894";
            status.classList.add('on');
        }
        
    } catch(e) {
        console.error("DB Load Error", e);
    }
}


// ========================================
// 티켓 및 정보 관리
// ========================================
window.checkAndResetTickets = async function() {
    const today = new Date().toLocaleDateString();
    const uid = getUserId();
    const docRef = db.collection("users").doc(uid);
    
    try {
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const data = docSnap.data();
            
            window.myInfo.stats = data.stats || [50, 50, 50, 50, 50, 50]; 
            if(data.msg) window.myInfo.msg = data.msg;
            if(data.tokens !== undefined) window.myInfo.tokens = data.tokens;
            if(data.avatar) window.myInfo.avatar = data.avatar;
            if(data.nickname) window.myInfo.nickname = data.nickname; 
            if(data.mbti) window.myInfo.mbti = data.mbti;
            
            // DB의 achievedIds를 로컬 myInfo에 동기화 (캐싱)
            if(data.achievedIds) window.myInfo.achievedIds = data.achievedIds;
            
            if (data.lastTicketDate !== today) {
                window.myInfo.tickets = 5;
                window.myInfo.lastTicketDate = today;
                saveMyInfoToDB();
            } else {
                window.myInfo.tickets = data.tickets !== undefined ? data.tickets : 5;
                window.myInfo.lastTicketDate = data.lastTicketDate;
            }
        } else {
            window.myInfo.tickets = 5;
            window.myInfo.lastTicketDate = today;
            saveMyInfoToDB();
        }
    } catch(e) {
        console.warn("내 정보 로드 실패 (오프라인?)");
    }
    
    if (typeof window.updateTicketUI === 'function') {
        window.updateTicketUI();
    }
}


// ========================================
// 랭킹 리스트 렌더링
// ========================================
window.filterRank = function(el, typeIndex) {
    document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    window.currentFilter = typeIndex;
    if (typeof window.renderRankList === 'function') {
        window.renderRankList(typeIndex);
    }
}

window.renderRankList = function(filterIndex = -1) {
    const container = document.getElementById('rankListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let rankData = window.candidates.map(c => {
        return {
            ...c,
            score: filterIndex === -1 ? c.stats.reduce((a, b) => a + b, 0) : (c.stats[filterIndex] || 0)
        };
    });

    rankData.sort((a, b) => b.score - a.score);

    rankData.forEach((user, index) => {
        const rankEl = document.createElement('li');
        rankEl.classList.add('list-item');
        
        let scoreText = filterIndex === -1 
            ? `${user.score}점` 
            : `${user.stats[filterIndex] || 0}점`;

        let rankText = index < 3 ? `🥇🥈🥉`.charAt(index) : index + 1;
        let rankColor = index === 0 ? '#ffc107' : (index === 1 ? '#adb5bd' : (index === 2 ? '#cd7f32' : '#636e72'));

        rankEl.addEventListener('click', () => {
            const statDetails = user.stats.map((s, i) => 
                `<li style="margin-left: 20px; font-size: 14px; color: #636e72;">${STAT_MAP[i]}: <span style="font-weight: bold; color:#2d3436;">${s}점</span></li>`
            ).join('');

            window.openSheet(
                user.avatar || '❓', 
                user.nickname || '익명 친구', 
                `<p style="text-align:center; font-style: italic; margin-top: 0; margin-bottom: 20px;">"${user.desc || '상태 메시지가 없습니다.'}"</p>` +
                `<h3 style="text-align:left; margin-bottom: 5px; font-size: 16px;">📊 스탯 상세</h3>` +
                `<ul style="list-style-type: none; padding: 0; margin-top: 0; margin-bottom: 30px;">${statDetails}</ul>`, 
                `MBTI: #${user.mbti || '???'}`
            );
        });

        rankEl.innerHTML = `
            <div style="font-size: 18px; color: ${rankColor}; width: 25px; text-align: center;">${rankText}</div>
            <div class="rank-avatar">${user.avatar || '❓'}</div>
            <div class="rank-info" style="flex: 1; margin-left: 10px;">
                <div class="rank-nickname" style="font-weight: 700;">${user.nickname}</div>
                <div class="rank-mbti" style="font-size: 12px; color: #b2bec3;">#${user.mbti || 'MBTI'}</div>
            </div>
            <div class="rank-score" style="font-weight: bold; color: ${index < 3 ? '#2d3436' : '#636e72'};">${scoreText}</div>
        `;
        container.appendChild(rankEl);
    });
}

// ========================================
// 🏆 업적 목록 렌더링
// ========================================
window.renderAchievementsList = async function(achievedIds) {
    const container = document.getElementById('tab-trophy');
    if (!container) return;
    
    let achieveGrid = container.querySelector('.achieve-grid');
    if (!achieveGrid) {
        achieveGrid = document.createElement('div');
        achieveGrid.classList.add('achieve-grid');
        container.innerHTML = '';
        container.appendChild(achieveGrid);
    }
    achieveGrid.innerHTML = '';
    
    const myAchievedIds = achievedIds || (window.myInfo.achievedIds || []);
    const masterData = window.achievementsList; 

    masterData.forEach(ach => {
        const isUnlocked = myAchievedIds.includes(ach.id);
        const achEl = document.createElement('div');
        
        achEl.classList.add('achieve-item');
        
        let subText = `🔓 ${ach.type} 타입 업적`;
        if (!isUnlocked) {
            achEl.classList.add('locked');
            subText = '🔒 아직 달성하지 못했습니다.';
        } else if (window.achievedDateMap[ach.id]) {
            subText = `🎉 ${window.achievedDateMap[ach.id]} 달성!`;
        } else {
             subText = '🎉 달성 완료 (날짜 정보 없음)';
        }
        
        achEl.onclick = () => window.openSheet(
            ach.icon, 
            ach.title, 
            `💰 보상: ${ach.reward}💎<br> ${ach.desc}`, 
            subText
        );
        
        achEl.innerHTML = `
            <div class="achieve-icon">${ach.icon}</div>
            <div class="achieve-title">${ach.title}</div>
        `;
        achieveGrid.appendChild(achEl);
    });
}


// ========================================
// 📜 히스토리 목록 렌더링
// ========================================
window.renderHistoryList = async function() {
    const container = document.getElementById('tab-history');
    const ulList = container.querySelector('.list-wrap');
    if (!ulList) return;
    ulList.innerHTML = '';

    try {
        const uid = getUserId();
        const logSnap = await db.collection("logs")
            .where("target_uid", "==", uid)
            .orderBy("timestamp", "desc")
            .limit(20)
            .get();

        if (logSnap.empty) {
            ulList.innerHTML = `<li style="text-align:center; padding: 30px 0; color: #b2bec3;">아직 받은 발자취가 없어요.</li>`;
            return;
        }

        logSnap.forEach(doc => {
            const log = doc.data();
            const li = document.createElement('li');
            li.classList.add('list-item');
            
            let icon, title, scoreText = '';
            let dateText = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleDateString('ko-KR') : '방금 전';
            let scoreColor = '#636e72';

            if (log.action_type === 'VOTE') {
                icon = '📈';
                title = `[${STAT_MAP[log.stat_type] || '스탯'}] 점수 상승!`;
                scoreText = `+${log.score_change}`;
                scoreColor = '#e74c3c';
            } else if (log.action_type === 'COMMENT') {
                icon = '💬';
                title = `[한마디]를 받았습니다!`;
            } else if (log.action_type === 'ACHIEVE') {
                icon = '🎁';
                title = log.message.split(']을')[0] + '] 달성!';
                scoreText = `+${log.score_change}💎`;
                scoreColor = '#f39c12';
            } else if (log.action_type === 'PURCHASE') {
                icon = '🛍️';
                title = '아이템 구매';
                scoreText = `${log.score_change}💎`;
                scoreColor = '#6c5ce7';
            } else {
                icon = '📋';
                title = '새로운 활동';
            }
            
            li.innerHTML = `
                <div style="font-size: 24px; margin-right: 15px; background: #f0f3ff; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; border-radius: 50%;">
                    ${icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight:bold;">${title}</div>
                    <div style="font-size: 12px; color: #b2bec3; margin-top: 4px;">${dateText}</div>
                </div>
                <div style="color:${scoreColor}; font-weight:bold;">${scoreText}</div>
            `;
            ulList.appendChild(li);
        });

    } catch (e) {
        console.error("히스토리 로드 실패:", e);
        ulList.innerHTML = `<li style="text-align:center; padding: 30px 0; color: #b2bec3;">데이터 로드 중 오류 발생.</li>`;
    }
}


window.saveMbtiToServer = async function(mbti) {
    const uid = getUserId();
    const saveData = { mbti: mbti, lastLogin: new Date().toISOString() };
    if(window.myInfo.nickname) saveData.nickname = window.myInfo.nickname;

    try {
        await db.collection("users").doc(uid).set(saveData, { merge: true });
        
        if (typeof window.setMyTypeUI === 'function') {
            window.myInfo.mbti = mbti; 
            window.setMyTypeUI(mbti);
        }
        
    } catch (e) { /* ... */ }
}

window.loadDataFromServer = async function() {
    try {
        window.initGame();
    } catch (e) { console.error("DB Load Fail", e); window.initGame(); }
}

// ========================================
// 🛍️ 상점 아이템 구매 로직
// ========================================
window.purchaseItem = async function(cost, itemType, itemValue) {
    if (!db) {
        alert("DB 연결 오류: 잠시 후 다시 시도해주세요.");
        return;
    }
    
    if (!window.myInfo || window.myInfo.tokens < cost) {
        window.openSheet('❌', '토큰 부족', `현재 보유 토큰: ${window.myInfo.tokens}💎<br>구매 비용: ${cost}💎`, `토큰을 충전하거나 다른 아이템을 선택해주세요.`);
        return;
    }

    if (!confirm(`${cost}💎를 사용하여 ${itemValue}를 구매하시겠습니까?`)) {
        return;
    }

    const uid = getUserId();
    const batch = db.batch();
    const userRef = db.collection("users").doc(uid);
    const logRef = db.collection("logs").doc();
    
    try {
        // 1. 토큰 차감
        batch.update(userRef, {
            tokens: FieldValue.increment(-cost),
            purchase_count: FieldValue.increment(1) 
        });

        // 2. 아이템 적용
        let message = '';
        if (itemType === 'Avatar') {
            batch.update(userRef, { avatar: itemValue });
            window.myInfo.avatar = itemValue;
            message = `새 아바타(${itemValue})를 구매하고 적용했습니다!`;
        } else {
            message = `${itemValue} 아이템을 구매했습니다! 인벤토리에 추가되었습니다.`;
        }
        
        // 3. 로그 기록
        batch.set(logRef, {
            target_uid: uid,
            sender_uid: 'system_shop',
            action_type: 'PURCHASE',
            score_change: -cost,
            message: `${itemValue} 구매 완료 (토큰 ${cost} 사용)`,
            is_read: false,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();

        // 4. UI 업데이트 및 업적 체크
        window.myInfo.tokens -= cost;
        if (typeof window.updateProfileUI === 'function') window.updateProfileUI();
        
        const myStatsDoc = await userRef.get();
        if (myStatsDoc.exists) {
            const statsData = myStatsDoc.data();
            statsData.uid = uid;
            statsData.purchase_count = (statsData.purchase_count || 0) + 1;
            await checkAchievements(statsData, statsData.achievedIds);
        }

        window.openSheet('🎉', '구매 성공', message, `남은 토큰: ${window.myInfo.tokens}💎`);

    } catch(e) {
        console.error("구매 실패:", e);
        window.openSheet('🚨', '구매 실패', '알 수 없는 오류로 구매에 실패했습니다.', '콘솔을 확인해주세요.');
    }
}


// ========================================
// 육각 차트 구현
// ========================================
window.drawChart = async function() {
    const ctx = document.getElementById('myRadarChart');
    if (!ctx) return;
    
    if (window.myChart) {
        window.myChart.destroy();
    }

    const data = {
        labels: STAT_MAP,
        datasets: [{
            label: '나의 스탯',
            data: window.myInfo.stats,
            fill: true,
            backgroundColor: 'rgba(108, 92, 231, 0.2)',
            borderColor: 'rgb(108, 92, 231)',
            pointBackgroundColor: 'rgb(108, 92, 231)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(108, 92, 231)'
        }]
    };

    window.myChart = new Chart(ctx, {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                r: {
                    angleLines: { color: '#dfe6e9' },
                    grid: { color: '#dfe6e9' },
                    pointLabels: { color: '#636e72', font: { size: 14, weight: 'bold' } },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { display: false, stepSize: 25 } 
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
};
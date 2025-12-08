// logic.js 파일 (Patch v2.20)

// ========================================
// Firebase 초기화 (고전 방식 - Compat)
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
    firebase.initializeApp(window.firebaseConfig);
} else {
    console.error("Firebase SDK가 로드되지 않았습니다!");
}

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ========================================
// Firestore FieldValue 전역 참조 및 안전장치
// ========================================
const FieldValue = typeof firebase !== 'undefined' 
    ? firebase.firestore.FieldValue 
    : { 
        increment: (val) => val, 
        serverTimestamp: () => new Date(),
    };

// ========================================
// 업적 마스터 데이터 (DB 초기화용)
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
window.myInfo = {
    tickets: 5,
    lastTicketDate: "",
    msg: "상태 메시지를 입력해주세요",
    tokens: 0,
    avatar: "🦊",
    nickname: "",
    stats: [50, 50, 50, 50, 50, 50] 
};

window.achievementsList = []; 
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

// [핵심 추가] 닉네임만 DB에 저장하는 함수 (ui.js에서 사용)
window.saveNicknameToDB = function(nickname) {
    if (!db || !nickname) return;
    const uid = getUserId();
    db.collection("users").doc(uid).set({
        nickname: nickname
    }, { merge: true });
}

// ========================================
// 🏆 업적 체크 함수 (유지)
// ========================================
async function checkAchievements(userStats, achievedIds = []) {
    if (!db || window.achievementsList.length === 0) return []; 
    const newlyAchieved = [];
    
    window.achievementsList.forEach(achievement => {
        // ... (조건 체크 로직 유지) ...
        let isAchieved = false;
        // ... (조건 체크) ...
        if (isAchieved) {
            newlyAchieved.push(achievement.id);
            window.myInfo.tokens += achievement.reward; 
        }
    });

    if (newlyAchieved.length > 0) {
        const updatedAchievements = [...achievedIds, ...newlyAchieved];
        await db.collection("users").doc(userStats.uid).update({ achievedIds: updatedAchievements, tokens: window.myInfo.tokens });
        
        if (typeof window.renderAchievementsList === 'function') {
            window.renderAchievementsList(updatedAchievements);
        }
        return newlyAchieved;
    }
    return [];
}


// ========================================
// 토너먼트 진행 함수 (유지)
// ========================================
window.startTournament = function() { /* ... */ }
function updateRoundTitle() { /* ... */ }
function showMatch() { /* ... */ }
function updateCard(pos, user) { /* ... */ }

window.vote = function(idx) {
    if (window.myInfo.tickets <= 0) { /* ... */ return; }
    const p1 = window.tournamentRound.shift();
    const p2 = window.tournamentRound.shift();
    const winner = idx === 0 ? p1 : p2;
    window.nextRound.push(winner);
    db.collection("users").doc(getUserId()).set({ vote_count: FieldValue.increment(1) }, { merge: true });
    showMatch();
}

function showWinner(winner) {
    window.myInfo.tickets--;
    window.myInfo.tokens += 10;
    
    if (typeof window.updateTicketUI === 'function') window.updateTicketUI();
    if (typeof window.updateProfileUI === 'function') window.updateProfileUI();
    saveMyInfoToDB(); 
    
    saveScore(winner, 20);
    
    // ... (로그 기록 로직 유지) ...
    // ... (UI 전환 로직 유지) ...
}

async function saveScore(winner, score) {
    // ... (스탯 업데이트 로직 유지) ...
    if (typeof window.renderRankList === 'function') {
        window.renderRankList(window.currentFilter);
    }
    // ... (received_votes 기록 및 DB 저장 로직 유지) ...
}


// ========================================
// DB 초기화 및 게임 초기 로드
// ========================================
async function initializeAchievementsDB() {
    // ... (기존 initializeAchievementsDB 로직 유지) ...
    if (!db) return;
    try { /* ... */ } catch (e) { throw e; }
}


window.initGame = async function() {
    if (!db) return; 

    try {
        await initializeAchievementsDB();
        // ... (질문, 사용자 데이터 로드 유지) ...
        await window.checkAndResetTickets();
        
        // [핵심 수정]: MBTI가 있을 경우에만 setMyTypeUI를 호출하여 화면 전환을 시도합니다.
        if (window.myInfo.mbti && typeof window.setMyTypeUI === 'function') {
             window.setMyTypeUI(window.myInfo.mbti);
        } else if (document.getElementById('screen-login').classList.contains('active')) {
             // 로그인 화면이면 토너먼트 시작 안 함
        } else if (window.questions.length > 0 && window.candidates.length >= 2) {
             if (typeof window.renderRankList === 'function') { window.renderRankList(window.currentFilter); }
             window.startTournament();
        }
        
        // [핵심 수정]: 모든 데이터 로드 완료 후, UI 요소만 업데이트합니다.
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
        const status = document.getElementById('dbStatus');
        if(status) {
            status.innerText = "● Load Fail";
            status.style.color = "red";
            status.classList.add('on');
        }
    }
}


// ========================================
// 티켓 및 정보 관리 (초기화 충돌 방지)
// ========================================
window.checkAndResetTickets = async function() {
    const today = new Date().toLocaleDateString();
    const uid = getUserId();
    const docRef = db.collection("users").doc(uid);
    
    try {
        // ... (DB 로드 및 티켓 리셋 로직 유지) ...
    } catch(e) {
        console.warn("내 정보 로드 실패 (오프라인?)");
    }
    
    // [핵심 수정]: updateProfileUI 호출을 제거합니다. 
    if (typeof window.updateTicketUI === 'function') {
        window.updateTicketUI();
    }
}


// ... (renderAchievementsList, renderHistoryList, saveMbtiToServer, loadDataFromServer 등 나머지 로직 유지) ...

window.renderAchievementsList = async function(achievedIds) { /* ... */ }
window.renderHistoryList = async function() { /* ... */ }

window.saveMbtiToServer = async function(mbti) {
    const uid = getUserId();
    const saveData = { mbti: mbti, lastLogin: new Date().toISOString() };
    if(window.myInfo.nickname) saveData.nickname = window.myInfo.nickname;

    try {
        await db.collection("users").doc(uid).set(saveData, { merge: true });
        
        if (typeof window.setMyTypeUI === 'function') {
            window.setMyTypeUI(mbti);
        }
        
    } catch (e) { /* ... */ }
}

window.loadDataFromServer = async function() {
    const uid = getUserId();
    try {
        const docSnap = await db.collection("users").doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            // [핵심 수정]: MBTI 데이터 로드는 initGame으로 이동
        }
        window.initGame();
    } catch (e) { console.error("DB Load Fail", e); window.initGame(); }
}

window.purchaseItem = function(cost, itemType, itemValue) { /* ... */ }
window.drawChart = async function() { /* ... */ }

// 앱 시작
window.loadDataFromServer();
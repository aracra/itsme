// logic.js 파일 (Patch v3.4)

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

// [🔥 v3.1 수정: 전역 변수 노출 시작]
window.db = db;
window.FieldValue = FieldValue;
// [🔥 v3.1 수정: 전역 변수 노출 끝]

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
// 🏆 업적 체크 함수 
// ========================================
async function checkAchievements(userStats, achievedIds = []) {
    if (!db || window.achievementsList.length === 0) return []; 
    const newlyAchieved = [];
    
    window.achievementsList.forEach(achievement => {
        if (achievedIds.includes(achievement.id)) return;
        
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
            console.log(`[업적 달성]: ${achievement.title}, 보상: ${achievement.reward}💎`);
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
window.startTournament = function() {
    if (window.myInfo.tickets <= 0) {
        alert("티켓 소진!");
        return;
    }
    
    const vsContainer = document.getElementById('vsContainer');
    if(vsContainer) vsContainer.style.display = 'flex';
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'block';
    
    if(window.questions.length > 0) {
        window.currentQ = window.questions[Math.floor(Math.random() * window.questions.length)];
        const titleEl = document.getElementById('voteTitle');
        if(titleEl && window.currentQ) titleEl.innerText = window.currentQ.text;
    } else {
        document.getElementById('voteTitle').innerText = "질문 데이터 로딩 중...";
        return;
    }
    
    let players = [...window.candidates].sort(() => Math.random() - 0.5);
    if(players.length >= 4) players = players.slice(0, 4);
    else players = players.slice(0, 2);
    
    window.tournamentRound = players;
    window.nextRound = [];
    updateRoundTitle();
    showMatch();
}

function updateRoundTitle() {
    let count = window.tournamentRound.length + window.nextRound.length;
    const badge = document.getElementById('roundBadge');
    if(badge) {
        let total = window.tournamentRound.length > 0 ? window.tournamentRound.length * 2 : (window.nextRound.length > 0 ? window.nextRound.length * 2 : 4);
        if(total === 4) badge.innerText = "🏆 4강전";
        else if(total === 2) badge.innerText = "👑 결승전";
        else badge.innerText = `🏆 ${total}강전`;
    }
}

function showMatch() {
    if(window.tournamentRound.length < 2) {
        if(window.nextRound.length === 1) {
            showWinner(window.nextRound[0]);
            return;
        }
        if(window.nextRound.length === 0) {
            console.error("토너먼트 오류: 승자가 결정되지 않았습니다.");
            return;
        }
        
        window.tournamentRound = window.nextRound;
        window.nextRound = [];
        window.tournamentRound.sort(() => Math.random() - 0.5); 
        updateRoundTitle();
    }
    
    // [🔥 v3.4 수정: 토너먼트 매치에 유효한 데이터가 있는지 확인]
    if (window.tournamentRound.length < 2) {
        // 후보가 부족하면 다시 처음부터 로드하거나, 패스 버튼을 누른 효과를 냄
        console.warn("토너먼트 후보 부족! 다시 시작합니다.");
        window.startTournament(); 
        return;
    }
    
    updateCard('A', window.tournamentRound[0]);
    updateCard('B', window.tournamentRound[1]);
}

function updateCard(pos, user) {
    if(!user) return;
    // [🔥 v3.4 수정: desc가 없을 경우 기본값으로 빈 문자열 사용]
    document.getElementById('name'+pos).innerText = user.nickname;
    document.getElementById('desc'+pos).innerText = user.desc || ""; 
    document.getElementById('avatar'+pos).innerText = user.avatar;
}

window.vote = function(idx) {
    if (window.myInfo.tickets <= 0) { /* ... */ return; }
    
    const p1 = window.tournamentRound.shift();
    const p2 = window.tournamentRound.shift();
    const winner = idx === 0 ? p1 : p2;
    window.nextRound.push(winner);
    
    const uid = getUserId();
    db.collection("users").doc(uid).set({ vote_count: FieldValue.increment(1) }, { merge: true });

    showMatch();
}

function showWinner(winner) {
    window.myInfo.tickets--;
    window.myInfo.tokens += 10;
    
    if (typeof window.updateTicketUI === 'function') window.updateTicketUI();
    if (typeof window.updateProfileUI === 'function') window.updateProfileUI();
    saveMyInfoToDB(); 
    
    saveScore(winner, 20);
    
    (async () => {
        const myStatsDoc = await db.collection("users").doc(getUserId()).get();
        if (myStatsDoc.exists) {
            await checkAchievements(myStatsDoc.data(), myStatsDoc.data().achievedIds);
        }
        
        db.collection("logs").add({
            target_uid: winner.id,
            sender_uid: getUserId(),
            action_type: 'VOTE',
            stat_type: window.currentQ.type !== undefined ? window.currentQ.type : 0,
            score_change: 20,
            message: `${window.myInfo.nickname}님이 투표하여 [${STAT_MAP[window.currentQ.type] || '스탯'}] 점수를 받았습니다.`,
            is_read: false,
            timestamp: FieldValue.serverTimestamp() 
        });
    })();
    
    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'flex';
    document.getElementById('winnerName').innerText = winner.nickname;
    document.getElementById('winnerAvatar').innerText = winner.avatar;
    document.getElementById('winnerText').innerText = `이 친구에게 점수가 전달되었습니다.`;
}

async function saveScore(winner, score) {
    if (!winner.stats) winner.stats = [50,50,50,50,50,50];
    const statIdx = window.currentQ.type !== undefined ? window.currentQ.type : 0;
    
    winner.stats[statIdx] = Math.min(100, winner.stats[statIdx] + score); 
    
    const candidateIndex = window.candidates.findIndex(c => c.id === winner.id);
    if(candidateIndex !== -1) {
        window.candidates[candidateIndex].stats = winner.stats;
    }
    
    // [🔥 v3.4 수정: 랭킹 리스트 렌더링을 위한 UI 업데이트 확인]
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
        
        if (achSnap.exists) {
            console.log("업적 마스터 데이터가 이미 존재합니다. 스킵합니다.");
        } else {
            console.log("업적 마스터 데이터를 Firestore에 삽입합니다.");
            const batch = db.batch();
            window.ACHIEVEMENTS_MASTER_DATA.forEach(ach => {
                const docRef = db.collection("achievements").doc(ach.id);
                batch.set(docRef, ach);
            });
            await batch.commit();
            console.log("업적 마스터 데이터 삽입 완료.");
        }
        
        const masterSnap = await db.collection("achievements").get();
        window.achievementsList = [];
        masterSnap.forEach(doc => window.achievementsList.push(doc.data()));
        
    } catch (e) {
        console.error("DB 초기화 및 업적 로드 실패 (권한 문제 확인 필요):", e);
        throw e;
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
            
            await checkAchievements(stats, stats.achievedIds);
            
            await db.collection("users").doc(getUserId()).set({ login_count: stats.login_count }, { merge: true });
        }

        // [핵심 수정]: MBTI가 있을 경우에만 setMyTypeUI를 호출하여 화면 전환을 시도합니다.
        if (window.myInfo.mbti && typeof window.setMyTypeUI === 'function') {
             window.setMyTypeUI(window.myInfo.mbti);
        } else if (document.getElementById('screen-login').classList.contains('active')) {
             // 로그인 화면이면 토너먼트 시작 안 함
        } else if (window.questions.length > 0 && window.candidates.length >= 2) {
             if (typeof window.renderRankList === 'function') { window.renderRankList(window.currentFilter); }
             window.startTournament(); // [🔥 v3.4 수정: startTournament()는 데이터 로드 후 한번 더 실행되어야 합니다.]
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
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const data = docSnap.data();
            
            window.myInfo.stats = data.stats || [50, 50, 50, 50, 50, 50]; 
            if(data.msg) window.myInfo.msg = data.msg;
            if(data.tokens !== undefined) window.myInfo.tokens = data.tokens;
            if(data.avatar) window.myInfo.avatar = data.avatar;
            if(data.nickname) window.myInfo.nickname = data.nickname; 
            if(data.mbti) window.myInfo.mbti = data.mbti; // MBTI 로드 추가
            
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
    
    // [핵심 수정]: updateProfileUI 호출을 제거합니다. (initGame의 최종 업데이트가 담당)
    if (typeof window.updateTicketUI === 'function') {
        window.updateTicketUI();
    }
}


// ========================================
// 랭킹 리스트 렌더링 (유지)
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
    
    // 1. 데이터 준비: window.candidates와 window.myInfo.stats
    let rankData = window.candidates.map(c => {
        return {
            ...c,
            score: filterIndex === -1 ? c.stats.reduce((a, b) => a + b, 0) : (c.stats[filterIndex] || 0)
        };
    });

    // 2. 정렬
    rankData.sort((a, b) => b.score - a.score);

    // [🔥 v3.3 수정: 랭킹 목록 HTML 렌더링 추가]
    // 3. 렌더링
    rankData.forEach((user, index) => {
        const rankEl = document.createElement('li'); // list-item을 사용하므로 <li>로 변경
        rankEl.classList.add('list-item'); // style.css에 정의된 list-item 클래스 사용
        
        let scoreText = filterIndex === -1 
            ? `${user.score}점` // 종합은 점수만 표시
            : `${user.stats[filterIndex] || 0}점`; // 개별 스탯 점수 표시

        // 순위 아이콘/색상 결정
        let rankText = index < 3 ? `🥇🥈🥉`.charAt(index) : index + 1;
        let rankColor = index === 0 ? '#ffc107' : (index === 1 ? '#adb5bd' : (index === 2 ? '#cd7f32' : '#636e72'));

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
    // [🔥 v3.3 수정 끝]
}

// ... (renderAchievementsList, renderHistoryList 유지) ...

window.renderAchievementsList = async function(achievedIds) { /* ... */ }
window.renderHistoryList = async function() { /* ... */ }

window.saveMbtiToServer = async function(mbti) {
    const uid = getUserId();
    const saveData = { mbti: mbti, lastLogin: new Date().toISOString() };
    if(window.myInfo.nickname) saveData.nickname = window.myInfo.nickname;

    try {
        await db.collection("users").doc(uid).set(saveData, { merge: true });
        
        if (typeof window.setMyTypeUI === 'function') {
            window.myInfo.mbti = mbti; // 전역 변수에 MBTI 저장 후
            window.setMyTypeUI(mbti);
        }
        
    } catch (e) { /* ... */ }
}

window.loadDataFromServer = async function() {
    const uid = getUserId();
    try {
        // DocSnap 로직은 checkAndResetTickets에서 처리되므로 단순화
        window.initGame();
    } catch (e) { console.error("DB Load Fail", e); window.initGame(); }
}

window.purchaseItem = function(cost, itemType, itemValue) { /* ... */ }

// ========================================
// 🚨 v3.4 핵심 수정: 육각 차트 구현
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
            maintainAspectRatio: false, // 컨테이너 크기에 맞춰 조절
            scales: {
                r: {
                    angleLines: { color: '#dfe6e9' },
                    grid: { color: '#dfe6e9' },
                    pointLabels: { color: '#636e72', font: { size: 14, weight: 'bold' } },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { display: false, stepSize: 25 } // 틱 숨김
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
};


// 앱 시작
// window.loadDataFromServer(); // [v3.0 수정: 이 줄을 삭제하여 무한 루프를 방지합니다]
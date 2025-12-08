// ========================================
// Firebase 초기화 (고전 방식 - Compat)
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

// 전역 firebase 객체 사용 (index.html에서 로드됨)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
} else {
    console.error("Firebase SDK가 로드되지 않았습니다!");
}

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

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
    nickname: "" 
};


// --------------------------------------------------------------------------
// 🏆 업적 (Achievements) 및 로그 관련 상수
// --------------------------------------------------------------------------
const STAT_MAP = ['지성', '센스', '멘탈', '인성', '텐션', '광기']; // 스탯 인덱스 매핑

const ACHIEVEMENTS_LIST = [
    { id: 'ach_01', icon: '👶', title: '응애 나 아기 유저', desc: '가입을 환영합니다! 시작이 반입니다.', condition: (stats) => (stats.login_count || 0) >= 1 },
    { id: 'ach_03', icon: '🗳️', title: '소중한 한 표', desc: '친구 평가에 처음으로 참여했습니다.', condition: (stats) => (stats.vote_count || 0) >= 1 },
    { id: 'ach_05', icon: '💎', title: '육각형 인간', desc: '모든 스탯이 평균 50점 이상입니다.', condition: (stats) => {
        const scores = Object.values(stats.stats || [0,0,0,0,0,0]);
        if (scores.length < 6) return false;
        return scores.every(score => score >= 50);
    }},
    { id: 'ach_08', icon: '🧊', title: '시베리아 벌판', desc: '[멘탈] 점수가 높아 냉철해 보입니다.', condition: (stats) => (stats.stats[2] || 0) >= 80 }, 
];
// --------------------------------------------------------------------------


// ========================================
// 사용자 ID 관리
// ========================================
function getUserId() {
    let uid = localStorage.getItem('my_uid');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('my_uid', uid);
    }
    return uid;
}

// ========================================
// 게임 초기화 (DB 연결 및 데이터 로드)
// ========================================
window.initGame = async function() {
    if (!db) return; // DB 없으면 중단

    try {
        console.log("DB 연결 시도...");
        
        // 질문 데이터 로드
        const qSnap = await db.collection("questions").get();
        window.questions = [];
        qSnap.forEach(doc => window.questions.push(doc.data()));
        
        // 사용자 데이터 로드 및 후보 설정 (기존과 동일)
        const uSnap = await db.collection("users").get();
        window.candidates = [];
        uSnap.forEach(doc => {
            let d = doc.data();
            if(!d.stats) d.stats = [50,50,50,50,50,50];
            d.id = doc.id;
            // 내 정보 로드 시 닉네임, 아바타 없어도 후보 목록에는 포함
            if (d.id !== getUserId() && d.nickname && d.avatar) {
                 window.candidates.push(d);
            }
        });

        // 내 정보(티켓 등) 확인
        if (window.checkAndResetTickets) await window.checkAndResetTickets();
        
        // [핵심 추가] 1. 앱 시작 시 유저의 업적을 체크합니다.
        const myStatsDoc = await db.collection("users").doc(getUserId()).get();
        if (myStatsDoc.exists) {
            const stats = myStatsDoc.data();
            stats.uid = getUserId();
            stats.stats = stats.stats || [50,50,50,50,50,50];
            stats.achievements = stats.achievements || [];
            stats.login_count = (stats.login_count || 0) + 1; // 로그인 카운트 증가
            
            // 2. 업적 체크를 실행합니다.
            await checkAchievements(stats, stats.achievements);
            
            // 업데이트된 로그인 카운트 저장
            await db.collection("users").doc(getUserId()).set({ login_count: stats.login_count }, { merge: true });
        }

        // 데이터가 있으면 토너먼트 준비 완료
        if(window.questions.length > 0 && window.candidates.length >= 2) {
            if(window.renderRankList) window.renderRankList(window.currentFilter);
            window.startTournament();
        }
        
        // [중요] 초록불 켜기! 🟢
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
            status.innerText = "● Offline";
            status.style.color = "orange";
            status.classList.add('on');
        }
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
            if(data.msg) window.myInfo.msg = data.msg;
            if(data.tokens !== undefined) window.myInfo.tokens = data.tokens;
            if(data.avatar) window.myInfo.avatar = data.avatar;
            if(data.nickname) window.myInfo.nickname = data.nickname; 

            if (data.lastTicketDate !== today) {
                window.myInfo.tickets = 5;
                window.myInfo.lastTicketDate = today;
                saveMyInfoToDB();
            } else {
                window.myInfo.tickets = data.tickets !== undefined ? data.tickets : 5;
                window.myInfo.lastTicketDate = data.lastTicketDate;
            }
        } else {
            // 신규 유저
            window.myInfo.tickets = 5;
            window.myInfo.lastTicketDate = today;
            saveMyInfoToDB();
        }
    } catch(e) {
        console.warn("내 정보 로드 실패 (오프라인?)");
    }
    
    updateTicketUI();
    updateProfileUI();
}

window.editProfileMsg = async function() {
    let newMsg = prompt("나의 한 마디를 입력하세요:", window.myInfo.msg);
    if(newMsg) {
        window.myInfo.msg = newMsg;
        updateProfileUI();
        
        const uid = getUserId();
        try {
            await db.collection("users").doc(uid).set({ msg: newMsg }, { merge: true });
        } catch(e) { console.error(e); }
    }
}

// [핵심] 내 정보 DB 저장 (닉네임 포함)
function saveMyInfoToDB() {
    if(!db) return;
    const uid = getUserId();
    db.collection("users").doc(uid).set({
        tickets: window.myInfo.tickets,
        lastTicketDate: window.myInfo.lastTicketDate,
        tokens: window.myInfo.tokens,
        avatar: window.myInfo.avatar,
        nickname: window.myInfo.nickname 
    }, { merge: true });
}


// --------------------------------------------------------------------------
// 🏆 업적 체크 함수 (수정)
// --------------------------------------------------------------------------
async function checkAchievements(userStats, achievedIds = []) {
    if (!db) return []; 
    const newlyAchieved = [];
    
    ACHIEVEMENTS_LIST.forEach(achievement => {
        // 이미 달성한 업적은 건너뜁니다.
        if (achievedIds.includes(achievement.id)) return;
        
        // 달성 조건을 확인합니다.
        if (achievement.condition(userStats)) {
            newlyAchieved.push(achievement.id);
            console.log(`[업적 달성]: ${achievement.title}`);
        }
    });

    if (newlyAchieved.length > 0) {
        const updatedAchievements = [...achievedIds, ...newlyAchieved];
        await db.collection("users").doc(userStats.uid).update({ achievements: updatedAchievements });
        
        // [핵심 수정]: 업적 달성 시 즉시 UI 갱신!
        if (window.renderAchievementsList) {
            window.renderAchievementsList(updatedAchievements);
        }
        return newlyAchieved;
    }
    return [];
}


function updateTicketUI() {
    const el = document.getElementById('ticketDisplay');
    if(el) el.innerText = `🎫 남은 티켓: ${window.myInfo.tickets}/5`;
}

// [핵심 수정] 함수를 만들면서 동시에 window에 등록! (Patch v3.0)
window.updateProfileUI = function() {
    const mainMsg = document.getElementById('mainMsg');
    const settingMsg = document.getElementById('settingMsg');
    const tokenDisplay = document.getElementById('shopTokenDisplay');
    
    // 닉네임/아바타 연결 대상
    const myAvatar = document.getElementById('myAvatar');
    const myNicknameDisplay = document.getElementById('myNicknameDisplay');
    const settingsAvatar = document.getElementById('settingsAvatar');
    const settingsNickname = document.getElementById('settingsNickname');

    // 텍스트 업데이트
    if(mainMsg) mainMsg.innerText = `"${window.myInfo.msg}"`;
    if(settingMsg) settingMsg.innerText = `"${window.myInfo.msg}"`;
    if(tokenDisplay) tokenDisplay.innerText = window.myInfo.tokens;
    
    // 아바타 업데이트
    if(window.myInfo.avatar) {
        if(myAvatar) myAvatar.innerText = window.myInfo.avatar;
        if(settingsAvatar) settingsAvatar.innerText = window.myInfo.avatar;
    }

    // 닉네임 업데이트
    if(window.myInfo.nickname) {
        if(myNicknameDisplay) myNicknameDisplay.innerText = window.myInfo.nickname;
        if(settingsNickname) settingsNickname.innerText = window.myInfo.nickname;
    }
}; 


// --------------------------------------------------------------------------
// 🏆 업적 리스트 렌더링 (신규)
// --------------------------------------------------------------------------
window.renderAchievementsList = async function(achievedIds) {
    const container = document.querySelector('.achieve-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 유저 정보에서 달성된 업적 목록을 가져옵니다.
    let myAchievements = achievedIds;
    if (!myAchievements) {
        try {
            const docSnap = await db.collection("users").doc(getUserId()).get();
            myAchievements = docSnap.data().achievements || [];
        } catch(e) {
            console.error("업적 로드 실패:", e);
            myAchievements = [];
        }
    }

    ACHIEVEMENTS_LIST.forEach(achievement => {
        const isUnlocked = myAchievements.includes(achievement.id);
        const item = document.createElement('div');
        
        // HTML 구조와 동일하게 클래스명을 사용합니다.
        item.className = 'achieve-item' + (isUnlocked ? ' unlocked' : ''); 
        
        item.onclick = function() {
             if(window.openSheet) {
                 window.openSheet(
                    achievement.icon, 
                    achievement.title, 
                    achievement.desc, 
                    isUnlocked ? `달성일: ${new Date().toLocaleDateString()}` : "아직 달성하지 못했습니다."
                );
             }
        };
        
        item.innerHTML = `
            <div class="achieve-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
            <div class="achieve-title">${achievement.title}</div>
        `;
        
        // 달성하지 못한 업적은 흐리게 표시 (CSS 처리 대신 JS로 임시 처리)
        if (!isUnlocked) {
            item.style.opacity = '0.5'; 
            item.classList.add('locked');
        }
        
        container.appendChild(item);
    });
}


// --------------------------------------------------------------------------
// 📜 발자취 리스트 렌더링 (신규)
// --------------------------------------------------------------------------
window.renderHistoryList = async function() {
    const container = document.querySelector('#tab-history .list-wrap');
    if (!container) return;
    
    // [임시 처리] 실제 로그 데이터가 없으므로 임시 메시지를 표시합니다.
    container.innerHTML = `
        <li class="list-item" style="border-bottom: none;">
             <div style="font-size: 24px; margin-right: 15px; background: #f0f3ff; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; border-radius: 50%;">📜</div>
             <div style="flex: 1;">
                 <div style="font-weight:bold;">평가 기록 로딩 중...</div>
                 <div style="font-size: 12px; color: #b2bec3; margin-top: 4px;">이곳에 친구들의 나에 대한 평가 기록이 쌓입니다.</div>
             </div>
             <div>+0</div>
        </li>
    `;
    
    // [주석] 실제 DB 연동 로직이 들어갈 부분입니다.
}


// ========================================
// 토너먼트 진행
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
        // 수정: 다음 라운드까지 포함하여 전체 규모를 계산합니다.
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
            // 경기가 끝났는데도 승자가 없으면 오류 (예외 처리)
            console.error("토너먼트 오류: 승자가 결정되지 않았습니다.");
            return;
        }
        
        window.tournamentRound = window.nextRound;
        window.nextRound = [];
        // [수정] 라운드 전환 시 shuffle 추가 (4강 > 결승)
        window.tournamentRound.sort(() => Math.random() - 0.5); 
        updateRoundTitle();
    }
    updateCard('A', window.tournamentRound[0]);
    updateCard('B', window.tournamentRound[1]);
}

function updateCard(pos, user) {
    if(!user) return;
    document.getElementById('name'+pos).innerText = user.nickname;
    document.getElementById('desc'+pos).innerText = user.desc || "매력적인 참가자";
    document.getElementById('avatar'+pos).innerText = user.avatar;
}

window.vote = function(idx) {
    if (window.myInfo.tickets <= 0) {
        if(window.openSheet) {
             window.openSheet('❌', '티켓 소진', '평가 티켓이 모두 소진되었습니다. 내일 다시 도전하세요.', '토큰으로 구매 가능');
        } else {
            alert("티켓이 모두 소진되었습니다! 내일 다시 도전하세요.");
        }
        return;
    }
    
    const p1 = window.tournamentRound.shift();
    const p2 = window.tournamentRound.shift();
    const winner = idx === 0 ? p1 : p2;
    window.nextRound.push(winner);
    
    // 투표 횟수 증가 (업적 체크용)
    const uid = getUserId();
    db.collection("users").doc(uid).set({ vote_count: firebase.firestore.FieldValue.increment(1) }, { merge: true });

    showMatch();
}

function showWinner(winner) {
    window.myInfo.tickets--;
    window.myInfo.tokens += 10;
    updateTicketUI();
    updateProfileUI();
    saveMyInfoToDB(); // 티켓 사용 및 토큰 획득 저장

    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'flex';
    document.getElementById('winnerName').innerText = winner.nickname;
    document.getElementById('winnerAvatar').innerText = winner.avatar;
    document.getElementById('winnerText').innerText = `${winner.nickname}님에게 점수가 전달되었습니다.`;
    document.getElementById('roundBadge').innerText = "🎉 우승 🎉";
    
    if(typeof confetti !== 'undefined') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    saveScore(winner, 20);
    
    // 우승 후 다시 업적 체크를 실행합니다.
    (async () => {
        const myStatsDoc = await db.collection("users").doc(getUserId()).get();
        if (myStatsDoc.exists) {
            await checkAchievements(myStatsDoc.data(), myStatsDoc.data().achievements);
        }
    })();
}

async function saveScore(winner, score) {
    if (!winner.stats) winner.stats = [50,50,50,50,50,50];
    const statIdx = window.currentQ.type !== undefined ? window.currentQ.type : 0;
    
    // 점수 업데이트 (최대 100점 제한)
    winner.stats[statIdx] = Math.min(100, winner.stats[statIdx] + score); 
    
    // candidates 배열에서도 업데이트
    const candidateIndex = window.candidates.findIndex(c => c.id === winner.id);
    if(candidateIndex !== -1) {
        window.candidates[candidateIndex].stats = winner.stats;
    }
    
    window.renderRankList(window.currentFilter);
    
    try {
        await db.collection("users").doc(winner.id).set({ stats: winner.stats }, { merge: true });
    } catch(e) { console.error(e); }
}

// ========================================
// 랭킹 시스템 (Patch v3.1 - 클릭 팝업 복구)
// ========================================
window.renderRankList = function(filterIndex = -1) {
    const container = document.getElementById('rankListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    // 점수 높은 순으로 정렬
    const sortedList = [...window.candidates].sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (!a.stats) a.stats = [50,50,50,50,50,50];
        if (!b.stats) b.stats = [50,50,50,50,50,50];
        
        if (filterIndex === -1) {
            scoreA = a.stats.reduce((sum, v) => sum + v, 0); // 종합 점수
            scoreB = b.stats.reduce((sum, v) => sum + v, 0);
        } else {
            scoreA = a.stats[filterIndex]; // 개별 스탯 점수
            scoreB = b.stats[filterIndex];
        }
        return scoreB - scoreA;
    });
    
    sortedList.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        
        // 내 랭킹이면 배경색 다르게 표시
        if(item.id === getUserId()) {
            li.style.backgroundColor = '#f0f3ff';
            li.style.borderRadius = '8px'; // 살짝 둥글게
        }
        
        // 점수 계산
        let displayScore = 0;
        if (filterIndex === -1) displayScore = item.stats.reduce((sum, v) => sum + v, 0);
        else displayScore = item.stats[filterIndex];
        
        // [핵심 패치] 클릭 이벤트 추가! 
        li.onclick = function() {
            if(window.openSheet) {
                window.openSheet(
                    item.avatar || "👤",      // 아이콘
                    item.nickname,          // 제목 (이름)
                    item.desc || "자기소개가 없습니다.", // 설명
                    `현재 점수: ${displayScore}점` // 부가정보
                );
            }
        };
        
        // 리스트 내용 구성
        li.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; width: 35px; color: var(--primary); text-align: center;">${index + 1}</div>
            <div style="font-size: 24px; margin-right: 12px; width: 36px; height: 36px; background: #eee; border-radius: 50%; display: flex; justify-content: center; align-items: center;">${item.avatar || "👤"}</div>
            <div style="flex: 1;">
                <div style="font-weight:bold; font-size:15px;">${item.nickname}</div>
                <div style="font-size: 12px; color: #999; margin-top: 2px;">${item.desc || item.nickname}</div>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: 800; font-size: 16px; color: #2d3436;">${displayScore}점</span>
            </div>
        `;
        container.appendChild(li);
    });
}

window.filterRank = function(el, typeIndex) {
    document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    window.currentFilter = typeIndex;
    window.renderRankList(typeIndex);
}

// ========================================
// 데이터 연동 (MBTI 및 로드)
// ========================================
window.saveMbtiToServer = async function(mbti) {
    if(window.setMyTypeUI) window.setMyTypeUI(mbti);
    const uid = getUserId();
    
    // [중요] 닉네임과 MBTI를 한번에 저장
    const saveData = {
        mbti: mbti,
        lastLogin: new Date().toISOString()
    };
    if(window.myInfo.nickname) saveData.nickname = window.myInfo.nickname;

    try {
        await db.collection("users").doc(uid).set(saveData, { merge: true });
    } catch (e) { console.error(e); }
}

window.loadDataFromServer = async function() {
    const uid = getUserId();
    try {
        const docSnap = await db.collection("users").doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if(data.mbti && window.setMyTypeUI) window.setMyTypeUI(data.mbti);
        }
        window.initGame();
    } catch (e) { console.error("DB Load Fail", e); }
}

// ========================================
// 상점 기능
// ========================================
window.purchaseItem = function(cost, itemType, itemValue) {
    if (window.myInfo.tokens < cost) {
        if(window.openSheet) {
            window.openSheet('❌', '토큰 부족', 
                `현재 보유 토큰: ${window.myInfo.tokens}개입니다.<br>상점에서 충전해주세요.`, 
                '구매 실패');
        } else {
            alert('토큰이 부족합니다.');
        }
        return;
    }

    if(!confirm(`정말로 ${cost}💎를 사용해 [${itemType}]을 구매하시겠습니까?`)) return;

    window.myInfo.tokens -= cost;
    
    if (itemType === 'Avatar') {
        const avatarEl = document.getElementById('myAvatar');
        if(avatarEl) avatarEl.innerText = itemValue;
        window.myInfo.avatar = itemValue;
    }
    
    updateProfileUI();
    saveMyInfoToDB(); // [중요] 구매 후 즉시 저장
    
    if(window.openSheet) {
        window.openSheet('✅', '구매 완료!', 
            `남은 토큰: ${window.myInfo.tokens}💎<br>[${itemType}]이 적용되었습니다!`, 
            '토큰 소모');
    }
}

// 앱 시작
window.loadDataFromServer();
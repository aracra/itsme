// Firebase SDK import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// [선배님 Key]
const firebaseConfig = {
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 전역 변수 설정 (window에 연결하여 HTML에서 접근 가능하도록 함)
window.questions = [];
window.candidates = [];
window.tournamentRound = [];
window.nextRound = [];
window.currentQ = null;
window.currentFilter = -1;
window.myInfo = { tickets: 5, lastTicketDate: "", msg: "상태 메시지를 입력해주세요", tokens: 0 };
window.myMbti = "";
window.tempTestResult = [];
let myChart = null; // Chart.js 인스턴스

// --- DB/데이터 로드 함수 ---

window.initGame = async function() {
    try {
        const qSnap = await getDocs(collection(db, "questions"));
        qSnap.forEach(doc => window.questions.push(doc.data()));
        
        const uSnap = await getDocs(collection(db, "users"));
        window.candidates = []; // 초기화
        uSnap.forEach(doc => {
            let d = doc.data();
            if(!d.stats) d.stats = [50,50,50,50,50,50];
            d.id = doc.id;
            
            // [수정됨] 닉네임과 아바타가 있는 '정상 유저'만 후보로 등록! (undefined 방지)
            if (d.nickname && d.avatar) {
                window.candidates.push(d);
            }
        });

        // 티켓 체크 및 게임 시작
        await window.checkAndResetTickets();
        
        if(window.questions.length > 0 && window.candidates.length >= 2) {
            window.renderRankList(window.currentFilter); 
            window.startTournament(); 
        }
        
        const statusEl = document.getElementById('dbStatus');
        if(statusEl) statusEl.classList.add('on');
        
    } catch(e) { console.error("DB Load Error", e); }
}

window.checkAndResetTickets = async function() {
    const today = new Date().toLocaleDateString();
    const uid = getUserId();
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        // [New] 메시지와 토큰 불러오기
        if(data.msg) window.myInfo.msg = data.msg;
        if(data.tokens) window.myInfo.tokens = data.tokens;

        if (data.lastTicketDate !== today) {
            window.myInfo.tickets = 5; window.myInfo.lastTicketDate = today;
            saveMyInfoToDB();
        } else {
            window.myInfo.tickets = data.tickets !== undefined ? data.tickets : 5;
            window.myInfo.lastTicketDate = data.lastTicketDate;
        }
    } else {
        window.myInfo.tickets = 5; window.myInfo.lastTicketDate = today;
        saveMyInfoToDB();
    }
    updateTicketUI();
    updateProfileUI(); // 화면 갱신
}

// [New] 프로필 수정 (DB 저장 포함)
window.editProfileMsg = async function() {
    let newMsg = prompt("나의 한 마디를 입력하세요:", window.myInfo.msg);
    if(newMsg) {
        window.myInfo.msg = newMsg;
        updateProfileUI();
        
        const uid = getUserId();
        try {
            await setDoc(doc(db, "users", uid), { msg: newMsg }, { merge: true });
            console.log("한마디 저장 완료");
        } catch(e) { console.error(e); }
    }
}

function saveMyInfoToDB() {
    const uid = getUserId();
    setDoc(doc(db, "users", uid), { 
        tickets: window.myInfo.tickets, 
        lastTicketDate: window.myInfo.lastTicketDate,
        tokens: window.myInfo.tokens // 토큰 저장
    }, { merge: true });
}

function updateTicketUI() { 
    const el = document.getElementById('ticketDisplay'); 
    if(el) el.innerText = `🎫 남은 티켓: ${window.myInfo.tickets}/5`; 
}

// [New] 프로필 UI 갱신
function updateProfileUI() {
    document.getElementById('mainMsg').innerText = `"${window.myInfo.msg}"`;
    document.getElementById('settingMsg').innerText = `"${window.myInfo.msg}"`;
    document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens;
}

// [New] 우승자 토큰 지급 함수
window.updateWinnerTokens = async function(userId, tokens) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentTokens = userSnap.data().tokens || 0;
            await updateDoc(userRef, { tokens: currentTokens + tokens });
            console.log(`[${userId}]에게 ${tokens} 토큰 지급 완료`);
        }
    } catch (e) {
        console.error("우승자 토큰 지급 실패:", e);
    }
}


// --- 토너먼트 로직 함수 ---

window.startTournament = function() {
    if (window.myInfo.tickets <= 0) { 
        window.openSheet('❌', '티켓 소진', '오늘의 평가 티켓을 모두 사용했습니다. 내일 다시 도전하세요.', '티켓 없음');
        return; 
    }
    document.getElementById('vsContainer').style.display = 'flex';
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'block';
    window.currentQ = window.questions[Math.floor(Math.random() * window.questions.length)];
    document.getElementById('voteTitle').innerText = window.currentQ.text;
    
    // 최소 2명이 되도록 필터링 후 랜덤 섞기
    let players = [...window.candidates].sort(() => Math.random() - 0.5);
    if(players.length >= 4) players = players.slice(0, 4); else players = players.slice(0, 2);
    
    window.tournamentRound = players; window.nextRound = [];
    updateRoundTitle(); showMatch();
}

function updateRoundTitle() { 
    let count = window.tournamentRound.length + window.nextRound.length; 
    document.getElementById('roundBadge').innerText = count === 4 ? "🏆 4강전" : (count === 2 ? "👑 결승전" : `🏆 ${count}강전`); 
}

function showMatch() {
    if(window.tournamentRound.length < 2) {
        if(window.nextRound.length === 1) { showWinner(window.nextRound[0]); return; }
        window.tournamentRound = window.nextRound; window.nextRound = []; updateRoundTitle();
    }
    // 토너먼트 라운드에 최소 2명이 있어야 함.
    if(window.tournamentRound.length >= 2) {
        updateCard('A', window.tournamentRound[0]); 
        updateCard('B', window.tournamentRound[1]);
    } else {
        // 후보가 부족하면 다시 토너먼트 시작 (새로운 후보 불러오기 시도)
        window.startTournament();
    }
}

function updateCard(pos, user) { 
    document.getElementById('name'+pos).innerText = user.nickname; 
    document.getElementById('desc'+pos).innerText = user.desc; 
    document.getElementById('avatar'+pos).innerText = user.avatar; 
}

window.vote = async function(idx) {
    // [수정됨] 티켓이 없으면 투표 금지! (마이너스 방지)
    if (window.myInfo.tickets <= 0) {
        window.openSheet('❌', '티켓 소진', '티켓이 모두 소진되었습니다! 내일 다시 도전하세요.', '투표 실패');
        return; // 여기서 함수를 강제 종료
    }
    
    const p1 = window.tournamentRound.shift(); 
    const p2 = window.tournamentRound.shift();
    
    const winner = idx === 0 ? p1 : p2; 
    window.nextRound.push(winner); 
    
    // 다음 매치 보여주기
    showMatch();
}

function showWinner(winner) {
    window.myInfo.tickets--; 
    window.myInfo.tokens += 10; // (평가자: 나) 토큰 10개 획득 (참여 보상)
    updateTicketUI(); 
    updateProfileUI(); 
    saveMyInfoToDB();

    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'flex';
    document.getElementById('winnerName').innerText = winner.nickname;
    document.getElementById('winnerAvatar').innerText = winner.avatar;
    document.getElementById('roundBadge').innerText = "🎉 우승 🎉";
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    // [V9.0 핵심] 우승자에게 토큰 50개 지급!
    window.updateWinnerTokens(winner.id, 50); 
    
    saveScore(winner, 20); // 점수 반영
}

async function saveScore(winner, score) {
    if (!winner.stats) winner.stats = [50,50,50,50,50,50];
    const statIdx = window.currentQ.type !== undefined ? window.currentQ.type : 0;
    winner.stats[statIdx] += score; 
    window.renderRankList(window.currentFilter);
    try { 
        const userRef = doc(db, "users", winner.id); 
        await setDoc(userRef, { stats: winner.stats }, { merge: true }); 
    } catch(e) {}
}


// --- 랭킹 및 유틸리티 함수 ---

window.renderRankList = function(filterIndex = -1) {
    const container = document.getElementById('rankListContainer'); 
    if (!container) return; 
    container.innerHTML = '';

    // 후보가 없으면 Empty State 표시
    if (window.candidates.length === 0) {
        document.getElementById('emptyRankState').classList.add('show');
        return;
    } else {
        document.getElementById('emptyRankState').classList.remove('show');
    }
    
    const sortedList = [...window.candidates].sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (filterIndex === -1) { 
            // 종합 점수 계산
            scoreA = a.stats ? a.stats.reduce((sum, v) => sum + v, 0) : 0; 
            scoreB = b.stats ? b.stats.reduce((sum, v) => sum + v, 0) : 0; 
        } 
        else { 
            // 특정 필터 점수 계산
            scoreA = a.stats && a.stats[filterIndex] !== undefined ? a.stats[filterIndex] : 0; 
            scoreB = b.stats && b.stats[filterIndex] !== undefined ? b.stats[filterIndex] : 0; 
        }
        return scoreB - scoreA;
    });

    sortedList.forEach((item, index) => {
        const li = document.createElement('li'); 
        li.className = 'rank-item'; // list-item에서 rank-item으로 변경 (CSS에 맞게)
        li.onclick = () => window.openProfile(item); // window.openProfile로 변경
        
        // 현재 로그인 사용자 하이라이트
        if(item.id === getUserId()) li.style.backgroundColor = '#f0f3ff';
        
        let displayScore = 0;
        if (filterIndex === -1) displayScore = item.stats ? item.stats.reduce((sum, v) => sum + v, 0) : 0; 
        else displayScore = item.stats && item.stats[filterIndex] !== undefined ? item.stats[filterIndex] : 0;

        li.innerHTML = `<div class="rank-num">${index + 1}</div><div class="rank-avatar">${item.avatar || "👤"}</div><div class="rank-info"><div class="rank-name">${item.nickname}</div><div class="rank-desc">${item.desc || item.nickname}</div></div><div class="rank-score"><span class="score-val">${displayScore}점</span></div>`;
        container.appendChild(li);
    });
}

window.filterRank = function(el, typeIndex) { 
    document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active')); 
    el.classList.add('active'); 
    window.currentFilter = typeIndex; 
    window.renderRankList(typeIndex); 
}

function getUserId() { 
    let uid = localStorage.getItem('my_uid'); 
    if (!uid) { 
        uid = 'user_' + Math.random().toString(36).substr(2, 9); 
        localStorage.setItem('my_uid', uid); 
    } 
    return uid; 
}

window.saveMbtiToServer = async function(mbti) { 
    window.setMyTypeUI(mbti); // window.setMyTypeUI로 변경
    const uid = getUserId(); 
    try { 
        await setDoc(doc(db, "users", uid), { mbti: mbti, lastLogin: new Date().toISOString() }, { merge: true }); 
    } catch (e) {} 
}

window.loadDataFromServer = async function() {
    const uid = getUserId();
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.mbti) window.setMyTypeUI(data.mbti); // window.setMyTypeUI로 변경
        }
        await window.initGame(); // window.initGame으로 변경
        document.getElementById('dbStatus').classList.add('on'); 
    } catch (e) {
        console.error("DB 로드 실패:", e);
    }
}


// --- 화면 전환 및 UI 함수 ---

window.setMyTypeUI = function(mbti) {
    window.myMbti = mbti; 
    const badge = document.getElementById('myMbtiBadge'); 
    if(badge) badge.innerText = "#" + mbti;
    
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-mbti').classList.remove('active');
    document.getElementById('mainContainer').classList.add('logged-in');
    window.goTab('screen-main', document.querySelector('.nav-item:first-child')); // window.goTab으로 변경
}

window.logout = function() { localStorage.clear(); location.reload(); }

window.loginWithServer = function() { window.goScreen('screen-mbti'); } // window.goScreen으로 변경

// [New] 테스트 로직 (경로 명시적 지정)
window.nextTest = function(val, nextScreenId) {
    window.tempTestResult.push(val); 
    window.goScreen(nextScreenId); // window.goScreen으로 변경
}

window.finishTest = function(lastVal) {
    window.tempTestResult.push(lastVal);
    // 약식 알고리즘 (실제론 4개 조합)
    let finalMbti = "ENFP"; // 임시
    alert("분석 완료! 당신은 " + finalMbti + " 유형입니다.");
    window.saveMbtiToServer(finalMbti); // window.saveMbtiToServer로 변경
}

window.openSheet = function(icon, title, desc, sub="") {
    document.getElementById('sheetIcon').innerText = icon;
    document.getElementById('sheetTitle').innerText = title;
    document.getElementById('sheetDesc').innerHTML = desc;
    document.getElementById('sheetSub').innerText = sub;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}

window.closeSheet = function() { document.querySelectorAll('.sheet-overlay').forEach(el => el.classList.remove('open')); }


// [NEW] 토큰 소모 및 아이템 적용 로직
window.purchaseItem = async function(cost, itemType, itemValue) {
    // 1. 돈 없으면 쫓아냄
    if (window.myInfo.tokens < cost) {
        window.openSheet('❌', '토큰 부족', `현재 보유 토큰: ${window.myInfo.tokens}개입니다.<br>상점에서 충전해주세요.`, '구매 실패');
        return;
    }

    // 2. 진짜 살 건지 물어봄
    if (!confirm(`정말로 ${cost}💎를 사용해 [${itemValue || itemType}]을 구매하시겠습니까?`)) return;

    // 3. 결제 진행 (차감)
    window.myInfo.tokens -= cost;
    
    // 4. 아바타/아이템 적용 (임시)
    if (itemType === 'Avatar') {
        document.getElementById('myAvatar').innerText = itemValue; // UI 적용
        
        // **[추가]** 아바타 변경 사항을 DB에 저장
        const uid = getUserId();
        try {
            await setDoc(doc(db, "users", uid), { avatar: itemValue }, { merge: true });
            console.log("아바타 저장 완료");
        } catch(e) { console.error(e); }
    }
    
    // 5. DB 저장 & 화면 갱신
    updateProfileUI(); // 화면의 토큰 수치 갱신
    saveMyInfoToDB(); // DB에 토큰 차감 반영
    
    window.openSheet('✅', '구매 완료!', `남은 토큰: ${window.myInfo.tokens}💎<br>[${itemValue || itemType}]이 적용되었습니다!`, '토큰 소모');
}

window.toggleEmptyState = function() { const el = document.getElementById('emptyRankState'); el.classList.toggle('show'); }

window.goTab = function(screenId, navEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navEl) navEl.classList.add('active');
    
    if(screenId === 'screen-main') { 
        window.goSubTab('tab-prism', document.querySelector('.sub-tab:first-child')); // window.goSubTab으로 변경
    }
    if(screenId === 'screen-rank') { 
        // 랭킹 화면 진입 시 빈 상태 체크 (초기 로드 후 바로 실행 안 되도록 수정)
        // setTimeout(() => { document.getElementById('emptyRankState').classList.add('show'); }, 100); 
    }
}

window.goSubTab = function(contentId, tabEl) {
    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
    document.getElementById(contentId).classList.add('active');
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    if(tabEl) tabEl.classList.add('active');
    
    if(contentId === 'tab-prism') setTimeout(window.drawChart, 50); // window.drawChart로 변경
}

window.goScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

window.openProfile = function(data) { 
    document.getElementById('pfName').innerText = data.nickname; 
    document.getElementById('pfAvatar').innerText = data.avatar; 
    document.getElementById('pfMsg').innerText = data.desc; 
    
    // 시그널 리스트 갱신 (간단화)
    const signalList = document.querySelector('#profileSheetOverlay .signal-list');
    signalList.innerHTML = '';
    const statsLabels = ['일머리', '유머', '의리', '센스', '매력', '광기'];
    if(data.stats) {
        data.stats.forEach((score, index) => {
            const li = document.createElement('li');
            li.className = 'signal-item';
            li.innerHTML = `<span class="signal-label">${statsLabels[index]} 평가</span><span class="signal-val">${score}점</span>`; // 예시: 'A (상위 1%)' 대신 점수 표시
            signalList.appendChild(li);
        });
    }

    document.getElementById('profileSheetOverlay').classList.add('open'); 
}

window.drawChart = function() { 
    const ctx = document.getElementById('myRadarChart'); 
    if(!ctx) return; 
    if(myChart) myChart.destroy(); 
    
    // 임시 점수 (DB 연동 시 window.myInfo.stats 등으로 교체 필요)
    const myScore = [85, 70, 90, 75, 80, 40]; 
    
    myChart = new Chart(ctx, { 
        type: 'radar', 
        data: { 
            labels: ['일머리', '유머', '의리', '센스', '매력', '광기'], 
            datasets: [{ 
                label: '내 점수', 
                data: myScore, 
                backgroundColor: 'rgba(108, 92, 231, 0.2)', 
                borderColor: '#6c5ce7', 
                borderWidth: 2 
            }] 
        }, 
        options: { 
            scales: { 
                r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } 
            }, 
            plugins: { legend: { display: false } } 
        } 
    }); 
}

// ... (기존 script.js 내용)

// ===============================================
// [V9.0 Fix] HTML에서 직접 호출하는 함수들을 전역(window) 객체에 연결
// ===============================================
window.goScreen = goScreen;
window.loginWithServer = loginWithServer;
window.saveMbtiToServer = saveMbtiToServer;
window.nextTest = nextTest;
window.finishTest = finishTest;
window.goTab = goTab;
window.goSubTab = goSubTab;
window.filterRank = filterRank;
window.toggleEmptyState = toggleEmptyState;
window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.startTournament = startTournament;
window.vote = vote;
window.purchaseItem = purchaseItem;
window.editProfileMsg = editProfileMsg;
window.logout = logout;

// 초기 데이터 로드 시작
window.loadDataFromServer();
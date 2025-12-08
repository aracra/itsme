// ui.js 파일 (Patch v2.20) - 함수 정의와 window 등록 분리

// ========================================
// 전역 변수 초기화 (UI용)
// ========================================
let myMbti = "";
let tempTestResult = [];
let myChart = null;

// ========================================
// UI 업데이트 함수들 (logic.js에서 호출됨)
// ========================================
function updateTicketUI() {
    const el = document.getElementById('ticketDisplay');
    // [핵심 복구]: index.html의 ID와 형식에 맞춰 복구
    if(el && window.myInfo) {
        el.innerText = `🎫 남은 티켓: ${window.myInfo.tickets || 0}/5`; 
    }
}

function updateProfileUI() {
    const mainMsg = document.getElementById('mainMsg');
    const settingMsg = document.getElementById('settingMsg');
    const tokenDisplay = document.getElementById('shopTokenDisplay');
    const myAvatar = document.getElementById('myAvatar');
    const myNicknameDisplay = document.getElementById('myNicknameDisplay');
    const settingsAvatar = document.getElementById('settingsAvatar');
    const settingsNickname = document.getElementById('settingsNickname');
    const myMbtiBadge = document.getElementById('myMbtiBadge');

    if(!window.myInfo) return;

    if(mainMsg) mainMsg.innerText = `"${window.myInfo.msg}"`;
    if(settingMsg) settingMsg.innerText = `"${window.myInfo.msg}"`;
    if(tokenDisplay) tokenDisplay.innerText = window.myInfo.tokens;
    
    if(window.myInfo.avatar) {
        if(myAvatar) myAvatar.innerText = window.myInfo.avatar;
        if(settingsAvatar) settingsAvatar.innerText = window.myInfo.avatar;
    }

    if(window.myInfo.nickname) {
        if(myNicknameDisplay) myNicknameDisplay.innerText = window.myInfo.nickname;
        if(settingsNickname) settingsNickname.innerText = window.myInfo.nickname;
    }
    
    if (myMbtiBadge && window.myInfo.mbti) {
         myMbtiBadge.innerText = `#${window.myInfo.mbti}`;
    }

    if (document.getElementById('tab-prism') && document.getElementById('tab-prism').classList.contains('active')) {
        if (typeof window.drawChart === 'function') window.drawChart();
    }
}


// ========================================
// MBTI UI 설정 (화면 전환 핵심 로직)
// ========================================
function setMyTypeUI(mbti) {
    console.log("UI 전환 시작: ", mbti);
    myMbti = mbti;
    const badge = document.getElementById('myMbtiBadge');
    if(badge) badge.innerText = `#${mbti}`;
    
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-mbti').classList.remove('active');
    
    document.getElementById('mainContainer').classList.add('logged-in');
    
    const firstNavItem = document.querySelector('.nav-item:first-child');
    if (typeof goTab === 'function') { 
        goTab('screen-main', firstNavItem);
    }
}


// ========================================
// 화면 전환 (Tab & Screen) 
// ========================================
function goTab(screenId, navEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navEl) navEl.classList.add('active');

    if(screenId === 'screen-main') {
        if (typeof goSubTab === 'function') {
             goSubTab('tab-prism', document.querySelector('.sub-tab:first-child'));
        }
    } else if (screenId === 'screen-rank' && typeof window.renderRankList === 'function') {
        window.renderRankList(window.currentFilter);
    }
    
    if (typeof updateProfileUI === 'function') {
        updateProfileUI();
    }
}

function goSubTab(contentId, tabEl) {
    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
    document.getElementById(contentId).classList.add('active');
    
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    if(tabEl) tabEl.classList.add('active');
    
    if(contentId === 'tab-prism' && typeof window.drawChart === 'function') {
        setTimeout(window.drawChart, 50);
    } 
    else if (contentId === 'tab-history' && typeof window.renderHistoryList === 'function') {
        window.renderHistoryList();
    } 
    else if (contentId === 'tab-trophy' && typeof window.renderAchievementsList === 'function') {
        window.renderAchievementsList();
    }
}

function goScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}


// ========================================
// 기타 UI/로직 함수 (index.html에서 호출됨)
// ========================================
function logout() {
    localStorage.clear();
    location.reload();
}

function loginWithServer() {
    goScreen('screen-nickname');
}

function nextTest(val, nextScreenId) {
    tempTestResult.push(val);
    goScreen(nextScreenId);
}

function finishTest(lastVal) {
    tempTestResult.push(lastVal);
    let finalMbti = "ENFP"; 
    // ... (MBTI 계산 로직 생략) ...
    
    if(typeof window.saveMbtiToServer === 'function') {
        window.saveMbtiToServer(finalMbti);
    } else {
        setMyTypeUI(finalMbti);
    }
    tempTestResult = [];
}

function saveNicknameAndNext() {
    const input = document.getElementById('inputNickname');
    const nickname = input.value.trim();
    
    if (!nickname) {
        alert("닉네임을 입력해주세요!");
        return;
    }
    
    if (!window.myInfo) {
        window.myInfo = { nickname: "" };
    }
    
    window.myInfo.nickname = nickname;
    
    // [핵심 수정]: logic.js의 닉네임 전용 저장 함수를 호출합니다.
    if(typeof window.saveNicknameToDB === 'function') {
        window.saveNicknameToDB(nickname);
    }
    
    goScreen('screen-mbti');
}

function openSheet(icon, title, desc, sub="") {
    document.getElementById('sheetIcon').innerText = icon;
    document.getElementById('sheetTitle').innerText = title;
    document.getElementById('sheetDesc').innerHTML = desc;
    document.getElementById('sheetSub').innerText = sub;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}

function closeSheet() {
    document.querySelectorAll('.sheet-overlay').forEach(el => el.classList.remove('open'));
}


// ========================================
// 앱 시작: 모든 함수를 window 객체에 연결
// ========================================
window.updateTicketUI = updateTicketUI;
window.updateProfileUI = updateProfileUI;
window.setMyTypeUI = setMyTypeUI;
window.goTab = goTab;
window.goSubTab = goSubTab;
window.goScreen = goScreen;
window.logout = logout;
window.loginWithServer = loginWithServer;
window.nextTest = nextTest;
window.finishTest = finishTest;
window.saveNicknameAndNext = saveNicknameAndNext;
window.openSheet = openSheet;
window.closeSheet = closeSheet;

function init() {
    if (typeof window.loadDataFromServer === 'function') {
         window.loadDataFromServer();
    } else {
        console.warn("⚠️ logic.js 로드 실패! 핵심 기능 작동 불가.");
    }
}

init();
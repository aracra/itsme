// ui.js (Full Code: Patch v5.2)

// ========================================
// 전역 변수 초기화
// ========================================
let myMbti = "";
let tempTestResult = [];
let myChart = null;

// ========================================
// UI 업데이트 함수들
// ========================================
function updateTicketUI() {
    const el = document.getElementById('ticketDisplay');
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

    const displayMsg = window.myInfo.msg || "상태 메시지를 입력해주세요";
    if(mainMsg) mainMsg.innerText = `"${displayMsg}"`;
    if(settingMsg) settingMsg.innerText = `"${displayMsg}"`;
    
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
// MBTI UI 설정
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
    } else if (screenId === 'screen-vote' && typeof window.startTournament === 'function') {
        window.startTournament(); 
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
// 기타 UI/로직 함수
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
    
    const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    tempTestResult.forEach(val => {
        counts[val]++;
    });

    let finalMbti = "";
    finalMbti += counts['E'] >= counts['I'] ? 'E' : 'I';
    finalMbti += counts['S'] >= counts['N'] ? 'S' : 'N';
    finalMbti += counts['T'] >= counts['F'] ? 'T' : 'F';
    finalMbti += counts['J'] >= counts['P'] ? 'J' : 'P';
    
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
    
    if(typeof window.saveNicknameToDB === 'function') {
        window.saveNicknameToDB(nickname);
    }
    
    goScreen('screen-mbti');
}

window.editProfileMsg = async function() {
    if (!window.myInfo) {
        alert("사용자 정보 로드 전입니다.");
        return;
    }
    
    const currentMsg = window.myInfo.msg === "상태 메시지를 입력해주세요" ? "" : window.myInfo.msg;
    const newMsg = prompt("새로운 '나의 한마디'를 입력해주세요. (최대 50자)", currentMsg);
    
    if (newMsg === null) return;
    
    const trimmedMsg = newMsg.trim().substring(0, 50);

    if (typeof window.saveProfileMsgToDB === 'function') {
        const success = await window.saveProfileMsgToDB(trimmedMsg);
        if (success) {
            window.openSheet('📝', '수정 완료', '나의 한마디가 성공적으로 저장되었습니다.', trimmedMsg || '메시지 삭제됨');
        } else {
            window.openSheet('🚨', '수정 실패', '메시지 저장 중 오류가 발생했습니다.', 'DB 연결 상태를 확인해주세요.');
        }
    } else {
        alert("오류: DB 저장 함수를 찾을 수 없습니다.");
    }
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

function disableVoteScreen() {
    const voteWrapper = document.getElementById('voteWrapper');
    const passBtn = document.getElementById('passBtn');
    
    if (document.getElementById('noTicketMsg')) return;

    if (voteWrapper) voteWrapper.style.display = 'none';
    if (passBtn) passBtn.style.display = 'none';
    
    const voteScreen = document.getElementById('screen-vote');
    if (voteScreen) {
        const tempMsg = document.createElement('div');
        tempMsg.id = 'noTicketMsg';
        tempMsg.style.cssText = 'flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-size: 18px; color: #636e72; padding: 20px;';
        tempMsg.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 15px;">😴</div>
            <h2>티켓이 모두 소진되었어요!</h2>
            <p>내일 다시 평가에 참여해 주세요.</p>
            <button class="btn btn-primary" onclick="goTab('screen-main', document.querySelector('.nav-item:first-child'))">메인으로</button>
        `;
        voteScreen.appendChild(tempMsg);
    }
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
window.editProfileMsg = editProfileMsg; 
window.disableVoteScreen = disableVoteScreen;

function init() {
    if (typeof window.loadDataFromServer === 'function') {
        window.loadDataFromServer();
    } else {
        console.warn("⚠️ logic.js 로드 실패! 핵심 기능 작동 불가.");
    }
}

window.addEventListener('DOMContentLoaded', init);
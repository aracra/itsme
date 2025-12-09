// ui.js
// Version: v19.0.0
// Description: UI Controller, Inventory, and Theme Management

// 1. Global UI Variables
let myMbti = "";
let tempTestResult = [];
let myChart = null;
const THEME_CLASSES = ['bg-gold', 'bg-dark', 'bg-pink']; // 관리되는 테마 목록

// 2. UI Update Functions
function updateTicketUI() {
    const e = document.getElementById('ticketDisplay');
    if (e && window.myInfo) {
        e.innerText = `🎫 남은 티켓: ${window.myInfo.tickets || 0}/5`;
    }
}

window.updateProfileUI = function() {
    if (!window.myInfo) return;

    const d = {
        mainMsg: `"${window.myInfo.msg || '상태 메시지'}"`,
        settingMsg: `"${window.myInfo.msg || '상태 메시지'}"`,
        shopTokenDisplay: window.myInfo.tokens,
        myAvatar: window.myInfo.avatar,
        settingsAvatar: window.myInfo.avatar,
        myNicknameDisplay: window.myInfo.nickname,
        settingsNickname: window.myInfo.nickname,
        myMbtiBadge: `#${window.myInfo.mbti}`
    };

    for (const k in d) {
        const e = document.getElementById(k);
        if (e) e.innerText = d[k];
    }

    if (document.getElementById('tab-prism')?.classList.contains('active') && window.drawChart) {
        window.drawChart();
    }
    if (window.applyActiveEffects) window.applyActiveEffects();
};

function setMyTypeUI(m) {
    myMbti = m;
    if (document.getElementById('myMbtiBadge')) {
        document.getElementById('myMbtiBadge').innerText = `#${m}`;
    }
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-mbti').classList.remove('active');
    document.getElementById('mainContainer').classList.add('logged-in');

    if (window.goTab) window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
}

// 3. Navigation & Routing (SPA)
function goTab(s, n) {
    // [Exit Guard]
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-vote' && window.isGameRunning) {
        if (!confirm("평가 중 이탈하면 티켓은 복구되지 않습니다.\n그래도 나가시겠습니까?")) return;
        window.isGameRunning = false;
    }

    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (n) n.classList.add('active');

    if (s === 'screen-main') {
        setTimeout(() => window.goSubTab('tab-prism', document.querySelector('.sub-tab:first-child')), 0);
    } else if (s === 'screen-rank') {
        if (window.renderRankList) window.renderRankList(-1); // Default All
        const allPill = document.querySelector('#rankFilterContainer .stat-pill:first-child');
        if (window.filterRank && allPill) window.filterRank(allPill, -1);
    } else if (s === 'screen-vote') {
        if(window.prepareVoteScreen) window.prepareVoteScreen();
    }

    if (window.updateProfileUI) window.updateProfileUI();
}

function goSubTab(c, t) {
    document.querySelectorAll('.sub-content').forEach(x => x.classList.remove('active'));
    document.getElementById(c).classList.add('active');
    document.querySelectorAll('.sub-tab').forEach(x => x.classList.remove('active'));
    if (t) t.classList.add('active');

    if (c === 'tab-prism' && window.drawChart) setTimeout(window.drawChart, 50);
    else if (c === 'tab-history' && window.renderHistoryList) window.renderHistoryList();
    else if (c === 'tab-trophy' && window.renderAchievementsList) window.renderAchievementsList();
}

function goScreen(s) {
    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
}

// 4. User Actions
function logout() {
    localStorage.clear();
    location.reload();
}
function loginWithServer() { goScreen('screen-nickname'); }
window.debugLogin = function(u) {
    if (!u) return;
    localStorage.setItem('my_uid', u);
    location.reload();
}
function nextTest(v, n) { tempTestResult.push(v); goScreen(n); }
function finishTest(l) {
    tempTestResult.push(l);
    const c = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    tempTestResult.forEach(v => c[v]++);
    let m = (c['E'] >= c['I'] ? 'E' : 'I') + (c['S'] >= c['N'] ? 'S' : 'N') +
            (c['T'] >= c['F'] ? 'T' : 'F') + (c['J'] >= c['P'] ? 'J' : 'P');
    
    if (window.saveMbtiToServer) window.saveMbtiToServer(m);
    else setMyTypeUI(m);
    tempTestResult = [];
}
window.saveMbtiToServer = function(m) {
    if(!window.db) { setMyTypeUI(m); return; }
    window.myInfo.mbti = m;
    window.db.collection("users").doc(localStorage.getItem('my_uid')).update({ mbti: m });
    setMyTypeUI(m);
}

function saveNicknameAndNext() {
    const n = document.getElementById('inputNickname').value.trim();
    if (!n) { alert("닉네임을 입력해주세요!"); return; }
    if (!window.myInfo) window.myInfo = { nickname: "" };
    window.myInfo.nickname = n;
    
    if (window.db) {
        window.db.collection("users").doc(localStorage.getItem('my_uid')).update({ nickname: n });
    }
    goScreen('screen-mbti');
}

window.editProfileMsg = async function() {
    if (!window.myInfo) return;
    const m = prompt("상태 메시지 변경", window.myInfo.msg === '상태 메시지' ? '' : window.myInfo.msg);
    if (m === null) return;
    if (window.saveProfileMsgToDB && await window.saveProfileMsgToDB(m.trim().substring(0, 50))) {
        // Simple Toast or UI update
    }
}

// 5. Bottom Sheet & Modal
function openSheet(i, t, d, s = "") {
    const h = `
    <div class="sheet-header-area">
        <div class="sheet-header-icon-frame">${i}</div>
        <div class="sheet-title">${t}</div>
    </div>
    <div class="sheet-body-area">
        <div class="sheet-message-box">${d}</div>
        ${s}
    </div>
    <div class="sheet-footer-area">
        <button class="btn btn-primary" onclick="closeSheet()">닫기</button>
    </div>`;
    document.querySelector('.bottom-sheet').innerHTML = h;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}
function closeSheet() {
    document.querySelectorAll('.sheet-overlay').forEach(x => x.classList.remove('open'));
}
function disableVoteScreen() {
    ['voteWrapper', 'passBtn', 'winnerContainer', 'roundBadge'].forEach(i => {
        const e = document.getElementById(i); if(e) e.style.display = 'none';
    });
    if (document.getElementById('noTicketMsg')) return;
    const s = document.getElementById('screen-vote');
    if (s) {
        const d = document.createElement('div');
        d.id = 'noTicketMsg';
        d.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-size:18px;color:var(--text-secondary);padding:20px;';
        d.innerHTML = `<div style="font-size:60px;margin-bottom:15px;">😴</div><h2>티켓 소진!</h2><p>내일 다시 충전돼요.</p><button class="btn btn-primary" onclick="goTab('screen-main',document.querySelector('.nav-item:first-child'))">메인으로</button>`;
        s.appendChild(d);
    }
}

// 6. Comment & Toast
let currentWinnerId = null;
window.openCommentPopup = function(id, n) {
    currentWinnerId = id;
    document.getElementById('commentTargetName').innerText = `${n}님에게 한마디`;
    document.getElementById('commentInput').value = '';
    document.getElementById('commentOverlay').classList.add('open');
}
window.closeCommentPopup = function() { document.getElementById('commentOverlay').classList.remove('open'); }
window.submitComment = function() {
    const t = document.getElementById('commentInput').value.trim();
    if (!t) { alert("내용을 입력해주세요."); return; }
    if (window.sendCommentToDB) window.sendCommentToDB(currentWinnerId, t);
    closeCommentPopup();
}

window.showToast = function(msg) {
    const existing = document.querySelector('.toast-msg');
    if(existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.5s';
        setTimeout(() => div.remove(), 500);
    }, 2000);
}

// 7. Inventory
window.openInventory = function() {
    const h = `
    <div class="sheet-header-area">
        <div class="sheet-header-icon-frame">🎒</div>
        <div class="sheet-title">보관함</div>
    </div>
    <div style="padding: 0 20px;">
        <div class="sub-tab-bar">
            <div class="sub-tab active inv-tab" onclick="updateInventoryList('all', this)">전체</div>
            <div class="sub-tab inv-tab" onclick="updateInventoryList('avatar', this)">아바타</div>
            <div class="sub-tab inv-tab" onclick="updateInventoryList('effect', this)">효과</div>
        </div>
    </div>
    <div class="sheet-body-area" id="inventoryListArea" style="min-height:200px;"></div>
    <div class="sheet-footer-area"><button class="btn btn-primary" onclick="closeSheet()">닫기</button></div>`;

    document.querySelector('.bottom-sheet').innerHTML = h;
    document.getElementById('bottomSheetOverlay').classList.add('open');
    window.updateInventoryList('all');
}

window.updateInventoryList = function(filter, tabEl) {
    if(tabEl) {
        document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
    }
    const container = document.getElementById('inventoryListArea');
    if(!container) return;

    const l = window.myInfo.inventory || [];
    const def = { id: 'def', type: 'avatar', value: '👤', name: '기본' };
    let all = (filter === 'effect') ? l.filter(i => i.type === 'effect') :
              (filter === 'avatar') ? [def, ...l.filter(i => i.type === 'avatar')] : [def, ...l];

    let listHtml = '';
    if (all.length === 0) listHtml = `<p style="margin-top:40px;">아이템이 없습니다.</p>`;
    else {
        all.forEach(i => {
            const isEquipped = (i.type === 'avatar' && i.value === window.myInfo.avatar);
            const isActive = i.isActive;
            
            let subText = i.type === 'avatar' ? '영구 소장' : '기간제';
            let subStyle = 'color:var(--text-secondary);';

            if (i.expiresAt) {
                const diff = new Date(i.expiresAt) - new Date();
                if (diff <= 0) subText = '만료됨';
                else {
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    subText = `${days}일 남음`;
                    if(diff < 86400000) { subStyle = 'color:#ff7675; font-weight:bold;'; subText = '곧 만료!'; }
                }
            }

            // Buttons
            let btnLabel = '사용';
            let btnClass = 'btn-outline';
            let btnAction = '';

            if (i.type === 'avatar') {
                if (isEquipped) { btnLabel = '사용 중'; btnClass = 'btn-secondary'; }
                else { btnAction = `onclick="equipAvatar('${i.value}')"`; }
            } else { // Effect
                if (isActive) { btnLabel = '해제'; btnClass = 'btn-secondary'; btnAction = `onclick="toggleEffect('${i.id}')"`; }
                else { btnAction = `onclick="toggleEffect('${i.id}')"`; }
            }

            listHtml += `
            <div class="list-item">
                <div class="common-circle-frame">${i.value.startsWith('bg')?'✨':i.value}</div>
                <div class="list-item-text">
                    <div style="font-weight:bold;font-size:14px;">${i.name}</div>
                    <div style="font-size:12px;${subStyle}">${subText}</div>
                </div>
                <button class="btn ${btnClass}" style="width:80px; padding:8px 0; font-size:12px; margin:0;" ${btnAction}>${btnLabel}</button>
            </div>`;
        });
    }
    container.innerHTML = listHtml;
}

window.applyActiveEffects = function() {
    const b = document.body;
    // Remove all managed theme classes
    b.classList.remove(...THEME_CLASSES);

    if (!window.myInfo?.inventory) return;
    const activeEffect = window.myInfo.inventory.find(i => i.type === 'effect' && i.isActive);

    if (activeEffect && THEME_CLASSES.includes(activeEffect.value)) {
        b.classList.add(activeEffect.value);
    }
}

// Exports
window.updateTicketUI = updateTicketUI;
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
window.disableVoteScreen = disableVoteScreen;
window.showToast = showToast;
window.updateInventoryList = updateInventoryList;
window.applyActiveEffects = applyActiveEffects;
// ui.js
/* Version: v19.11.4 */
// Description: UI Controller (Fix: Early Exit when No Tickets)

let myMbti = "";
let tempTestResult = [];
let myChart = null;
const THEME_CLASSES = ['bg-gold', 'bg-dark', 'bg-pink'];

function updateTicketUI() {
    const e = document.getElementById('ticketDisplay');
    if (e && window.myInfo) {
        e.innerText = `🎫 남은 티켓: ${window.myInfo.tickets || 0}/5`;
    }
    const b = document.getElementById('startBtnBadge');
    if (b && window.myInfo) {
        b.innerText = `🎫 ${window.myInfo.tickets || 0}`;
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

function goTab(s, n) {
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
        if (window.renderRankList) window.renderRankList(-1);
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

function logout() { localStorage.clear(); location.reload(); }
function loginWithServer() { goScreen('screen-nickname'); }
window.debugLogin = function(u) { if (!u) return; localStorage.setItem('my_uid', u); location.reload(); }
function nextTest(v, n) { tempTestResult.push(v); goScreen(n); }
function finishTest(l) {
    tempTestResult.push(l);
    const c = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    tempTestResult.forEach(v => c[v]++);
    let m = (c['E'] >= c['I'] ? 'E' : 'I') + (c['S'] >= c['N'] ? 'S' : 'N') + (c['T'] >= c['F'] ? 'T' : 'F') + (c['J'] >= c['P'] ? 'J' : 'P');
    if (window.saveMbtiToServer) window.saveMbtiToServer(m); else setMyTypeUI(m);
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
    if (window.db) window.db.collection("users").doc(localStorage.getItem('my_uid')).update({ nickname: n });
    goScreen('screen-mbti');
}
window.editProfileMsg = async function() {
    if (!window.myInfo) return;
    const m = prompt("상태 메시지 변경", window.myInfo.msg === '상태 메시지' ? '' : window.myInfo.msg);
    if (m === null) return;
    if (window.saveProfileMsgToDB && await window.saveProfileMsgToDB(m.trim().substring(0, 50))) {}
}

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
function closeSheet() { document.querySelectorAll('.sheet-overlay').forEach(x => x.classList.remove('open')); }

function disableVoteScreen() {
    ['voteWrapper', 'passBtn', 'winnerContainer', 'roundBadge'].forEach(i => { const e = document.getElementById(i); if(e) e.style.display = 'none'; });
    const intro = document.getElementById('voteIntro');
    if (intro) intro.style.display = 'none';

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

let currentWinnerId = null;
window.openProfilePopup = function(id) {
    const user = window.candidates.find(u => u.id === id);
    if (!user) return;
    const msg = user.msg || user.desc || "상태 메시지가 없습니다.";
    const content = `
        <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:20px;">
            <div class="avatar-circle" style="width:100px; height:100px; font-size:50px; margin-bottom:15px;">${user.avatar}<div class="avatar-badge" style="font-size:14px; padding:5px 10px;">#${user.mbti}</div></div>
            <h2 style="margin-bottom:5px;">${user.nickname}</h2>
            <p style="color:var(--text-primary); font-weight:bold; font-size:16px;">"${msg}"</p>
        </div>`;
    window.openSheet('👤', '친구 정보', '', content);
    const msgBox = document.querySelector('.sheet-message-box');
    if(msgBox) msgBox.style.display = 'none';
}
window.openCommentPopup = function(id, n) {
    currentWinnerId = id;
    document.getElementById('commentTargetName').innerText = `${n}님에게 한마디`;
    document.getElementById('commentInput').value = '';
    closeSheet();
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
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.5s'; setTimeout(() => div.remove(), 500); }, 2000);
}

window.openInventory = function() {
    const h = `
    <div class="sheet-header-area"><div class="sheet-header-icon-frame">🎒</div><div class="sheet-title">보관함</div></div>
    <div style="padding: 0 20px;"><div class="sub-tab-bar"><div class="sub-tab active inv-tab" onclick="updateInventoryList('all', this)">전체</div><div class="sub-tab inv-tab" onclick="updateInventoryList('avatar', this)">아바타</div><div class="sub-tab inv-tab" onclick="updateInventoryList('effect', this)">효과</div></div></div>
    <div class="sheet-body-area" id="inventoryListArea" style="min-height:200px;"></div>
    <div class="sheet-footer-area"><button class="btn btn-primary" onclick="closeSheet()">닫기</button></div>`;
    document.querySelector('.bottom-sheet').innerHTML = h;
    document.getElementById('bottomSheetOverlay').classList.add('open');
    window.updateInventoryList('all');
}
window.updateInventoryList = function(filter, tabEl) {
    if(tabEl) { document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active')); tabEl.classList.add('active'); }
    const container = document.getElementById('inventoryListArea');
    if(!container) return;
    const l = window.myInfo.inventory || [];
    const def = { id: 'def', type: 'avatar', value: '👤', name: '기본' };
    let all = (filter === 'effect') ? l.filter(i => i.type === 'effect') : (filter === 'avatar') ? [def, ...l.filter(i => i.type === 'avatar')] : [def, ...l];
    let listHtml = '';
    if (all.length === 0) listHtml = `<p class="list-empty-msg">아이템이 없습니다.</p>`;
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
            let btnLabel = '사용';
            let btnClass = 'btn-outline';
            let btnAction = '';
            if (i.type === 'avatar') { if (isEquipped) { btnLabel = '사용 중'; btnClass = 'btn-secondary'; } else { btnAction = `onclick="equipAvatar('${i.value}')"`; } }
            else { if (isActive) { btnLabel = '해제'; btnClass = 'btn-secondary'; btnAction = `onclick="toggleEffect('${i.id}')"`; } else { btnAction = `onclick="toggleEffect('${i.id}')"`; } }
            listHtml += `<div class="list-item"><div class="common-circle-frame">${i.value.startsWith('bg')?'✨':i.value}</div><div class="list-item-text"><div style="font-weight:bold;font-size:14px;">${i.name}</div><div style="font-size:12px;${subStyle}">${subText}</div></div><button class="btn ${btnClass}" style="width:80px; padding:8px 0; font-size:12px; margin:0;" ${btnAction}>${btnLabel}</button></div>`;
        });
    }
    container.innerHTML = listHtml;
}
window.applyActiveEffects = function() {
    const b = document.body;
    b.classList.remove(...THEME_CLASSES);
    if (!window.myInfo?.inventory) return;
    const activeEffect = window.myInfo.inventory.find(i => i.type === 'effect' && i.isActive);
    if (activeEffect && THEME_CLASSES.includes(activeEffect.value)) { b.classList.add(activeEffect.value); }
}

// [v19.11.2 Updated] Check Tickets Immediately
window.prepareVoteScreen = function() {
    if (window.candidates.length < 2) { alert("후보가 부족합니다. (최소 2명)"); return; }
    window.isGameRunning = false;
    
    // [Fix] If no tickets, go directly to Disabled Screen
    if (window.myInfo && window.myInfo.tickets <= 0) {
        window.disableVoteScreen();
        return; 
    }

    const noMsg = document.getElementById('noTicketMsg');
    if(noMsg) noMsg.remove();

    const titleEl = document.getElementById('voteTitle');
    if(titleEl) titleEl.innerText = ""; 

    document.getElementById('voteIntro').style.display = 'flex';
    document.getElementById('voteWrapper').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('roundBadge').style.display = 'none';
    window.updateTicketUI();
}

window.renderRankList = function(filterIdx) {
    const container = document.getElementById('rankListContainer');
    if (!container) return;
    let list = [...(window.candidates || [])];
    if (list.length === 0) { container.innerHTML = `<p class="list-empty-msg">랭킹 데이터가 없습니다.<br>친구를 초대해보세요!</p>`; return; }
    if (filterIdx === -1) { list.sort((a, b) => { const sumA = (a.stats || []).reduce((x, y) => x + y, 0); const sumB = (b.stats || []).reduce((x, y) => x + y, 0); return sumB - sumA; }); }
    else { list.sort((a, b) => (b.stats[filterIdx] || 0) - (a.stats[filterIdx] || 0)); }
    let html = '';
    list.forEach((u, idx) => {
        let score = 0;
        if (filterIdx === -1) score = Math.round((u.stats || []).reduce((a, b) => a + b, 0) / 6); else score = u.stats[filterIdx] || 0;
        let medal = '';
        if (idx === 0) medal = '🥇'; else if (idx === 1) medal = '🥈'; else if (idx === 2) medal = '🥉'; else medal = `${idx + 1}`;
        html += `<li class="list-item" onclick="window.openProfilePopup('${u.id}')"><div style="font-weight:900; font-size:16px; width:30px; text-align:center; margin-right:10px; color:${idx<3?'var(--primary)':'#ccc'}">${medal}</div><div class="common-circle-frame" style="margin-right:10px;">${u.avatar}</div><div class="list-item-text"><div style="font-weight:bold; font-size:14px;">${u.nickname}</div><div style="font-size:11px; color:var(--text-secondary);">${u.mbti ? '#'+u.mbti : ''}</div></div><div class="list-item-score">${score}점</div></li>`;
    });
    container.innerHTML = html;
};
window.filterRank = function(el, type) { document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active')); el.classList.add('active'); window.currentFilter = type; window.renderRankList(type); };
window.renderAchievementsList = function() {
    const container = document.querySelector('.achieve-grid');
    if (!container) return;
    const list = window.achievementsList || [];
    const myIds = new Set(window.myInfo.achievedIds || []);
    let html = '';
    list.forEach(a => {
        const isUnlocked = myIds.has(a.id);
        const cls = isUnlocked ? '' : 'locked';
        const date = window.achievedDateMap[a.id] || '';
        const clickAction = `onclick="window.showToast('${isUnlocked ? '달성일: '+date : '미달성: ' + a.desc}')"`;
        html += `<div class="achieve-item ${cls}" ${clickAction}><div style="font-size:30px; margin-bottom:5px;">${a.icon}</div><div class="achieve-title">${a.title}</div>${isUnlocked ? '<div style="font-size:9px; color:var(--primary); margin-top:2px;">✔ 달성</div>' : ''}</div>`;
    });
    if(html === '') html = `<p class="list-empty-msg" style="grid-column:1/-1;">업적 데이터 로딩 중...</p>`;
    container.innerHTML = html;
};
window.renderHistoryList = async function() {
    const container = document.querySelector('#tab-history .list-wrap');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center; padding:20px;">🔄 기록 불러오는 중...</div>`;
    if (!window.db) { container.innerHTML = `<p class="list-empty-msg">DB 연결이 필요합니다.</p>`; return; }
    try {
        const uid = localStorage.getItem('my_uid');
        const snapshot = await window.db.collection("logs").where("target_uid", "==", uid).orderBy("timestamp", "desc").limit(20).get();
        if (snapshot.empty) { container.innerHTML = `<p class="list-empty-msg">아직 기록이 없어요.<br>테스트를 진행해보세요!</p>`; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : '날짜 미상';
            let icon = '📩';
            if (data.action_type === 'VOTE') icon = '🗳️'; else if (data.action_type === 'ACHIEVE') icon = '🏆'; else if (data.action_type === 'PURCHASE') icon = '🛍️';
            html += `<li class="list-item" style="height:auto; min-height:60px;"><div class="common-circle-frame" style="font-size:18px;">${icon}</div><div class="list-item-text"><div style="font-weight:bold; font-size:13px; line-height:1.4;">${data.message}</div><div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${date}</div></div>${data.score_change !== 0 ? `<div class="list-item-score" style="background:transparent; color:${data.score_change>0?'#ff7675':'var(--text-secondary)'};">${data.score_change>0?'+':''}${data.score_change}</div>` : ''}</li>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); container.innerHTML = `<p class="list-empty-msg">기록을 불러오지 못했습니다.</p>`; }
};

window.updateTicketUI = updateTicketUI; window.setMyTypeUI = setMyTypeUI; window.goTab = goTab; window.goSubTab = goSubTab; window.goScreen = goScreen; window.logout = logout; window.loginWithServer = loginWithServer; window.nextTest = nextTest; window.finishTest = finishTest; window.saveNicknameAndNext = saveNicknameAndNext; window.openSheet = openSheet; window.closeSheet = closeSheet; window.disableVoteScreen = disableVoteScreen; window.showToast = showToast; window.updateInventoryList = updateInventoryList; window.applyActiveEffects = applyActiveEffects; window.renderRankList = renderRankList; window.filterRank = filterRank; window.renderAchievementsList = renderAchievementsList; window.renderHistoryList = renderHistoryList; window.openProfilePopup = openProfilePopup; window.openCommentPopup = openCommentPopup;
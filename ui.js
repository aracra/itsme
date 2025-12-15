// ui.js
// Version: v19.16.0 (Simple Standard)
// Description: UI Controller & Animation Handler

let myMbti = "";
let tempTestResult = [];
let myChart = null;
window.currentInvCategory = 'all'; 

// 🟢 [Simple] 하이픈(-) 클래스명 정의
const THEME_CLASSES = ['bg-gold', 'bg-dark', 'bg-pink']; 

window.updateStatus = function(m, t = 'wait') {
    const e = document.getElementById('dbStatus');
    if (e) {
        e.innerText = m;
        e.classList.remove('on', 'error');
        if (t === 'ok') e.classList.add('on');
        if (t === 'error') { e.classList.add('error'); e.onclick = () => location.reload(); }
    }
    console.log(`[Sys] ${m}`);
}

window.toggleDevMenu = function() {
    const el = document.getElementById('devMenuExpanded');
    if (el) el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
}

window.updateTicketUI = function() {
    const e = document.getElementById('ticketDisplay');
    const b = document.getElementById('startBtnBadge');
    const count = (window.myInfo && window.myInfo.tickets) ? window.myInfo.tickets : 0;
    
    if (e) e.innerText = `🎫 남은 티켓: ${count}/5`;
    if (b) {
        const numSpan = b.querySelector('.fb-count');
        if(numSpan) numSpan.innerText = count;
    }
}

window.updateProfileUI = function() {
    if (!window.myInfo) return;
    const d = {
        mainMsg: `"${window.myInfo.msg || '상태 메시지'}"`,
        shopTokenDisplay: window.myInfo.tokens,
        myAvatar: window.myInfo.avatar,
        myNicknameDisplay: window.myInfo.nickname,
        myMbtiBadge: `#${window.myInfo.mbti}`,
        settingsAccountDisplay: `kakao_${getUserId().substr(0,8)}***` 
    };

    for (const k in d) {
        const e = document.getElementById(k);
        if (e) e.innerText = d[k];
    }

    if (document.getElementById('tab-prism')?.classList.contains('active') && window.drawChart) window.drawChart();
    if (window.applyActiveEffects) window.applyActiveEffects();
    window.updateTicketUI();
};

window.setMyTypeUI = function(m) {
    myMbti = m;
    if (document.getElementById('myMbtiBadge')) document.getElementById('myMbtiBadge').innerText = `#${m}`;
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-mbti').classList.remove('active');
    document.getElementById('mainContainer').classList.add('logged-in');
    if (window.goTab) window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
}

// 🟢 [Simple] 복잡한 변환 없이 바로 적용
window.updateMyInfoUI = function() {
    if (!window.myInfo) return;
    const tokenEl = document.getElementById('shopTokenDisplay');
    if (tokenEl) tokenEl.innerText = window.myInfo.tokens;
    
    const avatarEls = document.querySelectorAll('.my-profile-icon, #myAvatar');
    avatarEls.forEach(el => {
        el.innerText = window.myInfo.avatar || '🙂'; 
    });

    // 테마 적용 (있는 그대로 사용)
    document.body.classList.remove(...THEME_CLASSES);
    if (window.myInfo.bgEffect) {
        document.body.classList.add(window.myInfo.bgEffect);
    }
};

// 2. Navigation
window.goTab = function(s, n) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-vote' && window.isGameRunning) {
        window.openCustomConfirm(
            "⚠️ 평가 이탈", 
            "평가 중 이탈하면 티켓은 복구되지 않습니다.<br><span class='warn-text'>그래도 나가시겠습니까?</span>", 
            () => {
                window.isGameRunning = false;
                proceedTab(s, n);
            }
        );
        return; 
    }
    proceedTab(s, n);
}

function proceedTab(s, n) {
    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (n) n.classList.add('active');

    if (s === 'screen-main') {
        setTimeout(() => window.goSubTab('tab-prism', document.querySelector('.sub-tab:first-child')), 0);
    } 
    else if (s === 'screen-rank') {
        if (window.initRankScreen) window.initRankScreen(); 
    } 
    else if (s === 'screen-vote') {
        if(window.prepareVoteScreen) window.prepareVoteScreen();
    }
    
    if (window.updateProfileUI) window.updateProfileUI();
}

window.goSubTab = function(c, t) {
    document.querySelectorAll('.sub-content').forEach(x => x.classList.remove('active'));
    document.getElementById(c).classList.add('active');
    if (t) {
        const parent = t.parentNode;
        Array.from(parent.children).forEach(child => child.classList.remove('active'));
        t.classList.add('active');
    }
    if (c === 'tab-prism' && window.drawChart) setTimeout(window.drawChart, 50);
    else if (c === 'tab-history' && window.renderHistoryList) window.renderHistoryList();
    else if (c === 'tab-trophy' && window.renderAchievementsList) window.renderAchievementsList();
}

window.goScreen = function(s) {
    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
}

// 3. Vote Screen Handlers
window.prepareVoteScreen = function() {
    if (window.candidates.length < 2) { alert("후보가 부족합니다. (최소 2명)"); return; }
    window.isGameRunning = false;
    if (window.myInfo && window.myInfo.tickets <= 0) { window.disableVoteScreen(); return; }
    const noMsg = document.getElementById('noTicketMsg'); if(noMsg) noMsg.remove();
    document.getElementById('screen-vote').style.position = ''; 
    document.getElementById('voteIntro').style.display = 'flex';
    document.getElementById('voteWrapper').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('roundBadge').style.display = 'none';
    document.getElementById('voteTitle').style.display = 'none';
    window.updateTicketUI();
}

window.initVoteScreenUI = function(title) {
    const titleEl = document.getElementById('voteTitle');
    if(titleEl) { titleEl.innerText = title; titleEl.style.display = 'block'; }
    document.getElementById('voteIntro').style.display = 'none';
    document.getElementById('voteWrapper').style.display = 'flex';
    document.getElementById('passBtn').style.display = 'block';
    document.getElementById('roundBadge').style.display = 'inline-block';
}

window.updateRoundBadgeUI = function(total, current) {
    const b = document.getElementById('roundBadge');
    if (b && total) {
        const t = total / 2;
        const c = (total - current) / 2 + 1;
        b.innerText = total === 2 ? "👑 결승전" : `🏆 ${total}강전 (${c}/${t})`;
    }
}

window.updateVsCardUI = function(uA, uB) {
    if(!uA || !uB) return;
    document.getElementById('vsContainer').style.display = 'flex';
    document.getElementById('winnerContainer').style.display = 'none';
    const cards = document.querySelectorAll('.vs-card');
    cards.forEach(c => c.classList.remove('selected-choice'));
    updateCard('A', uA);
    updateCard('B', uB);
}

function updateCard(p, u) {
    document.getElementById('name' + p).innerText = u.nickname;
    document.getElementById('desc' + p).innerText = u.desc || '';
    document.getElementById('avatar' + p).innerText = u.avatar;
}

window.animateVoteSelection = function(idx) {
    return new Promise(resolve => {
        const cards = document.querySelectorAll('#vsContainer .vs-card');
        const selectedCard = cards[idx];
        if (selectedCard) { selectedCard.classList.add('selected-choice'); }
        setTimeout(() => { resolve(); }, 550);
    });
}

window.showWinnerScreen = function(w) {
    document.getElementById('vsContainer').style.display = 'none';
    document.getElementById('passBtn').style.display = 'none';
    document.getElementById('roundBadge').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'flex';
    document.getElementById('winnerName').innerText = w.nickname;
    document.getElementById('winnerAvatar').innerText = w.avatar;
    document.getElementById('winnerTitle').innerText = "🏆 최종 우승!";
    document.getElementById('winnerText').innerText = "이 친구에게 점수가 전달되었습니다.";
    const actionArea = document.getElementById('winnerActionArea');
    actionArea.innerHTML = ''; 
    const btnComment = document.createElement('button');
    btnComment.className = 'btn-action type-white btn-master';
    btnComment.innerText = "💬 한줄평 남기기";
    btnComment.onclick = () => window.openCommentPopup(w.id, w.nickname);
    actionArea.appendChild(btnComment);
    const btnNext = document.createElement('button');
    btnNext.className = 'btn-action type-purple btn-master';
    if (window.myInfo.tickets <= 0) {
        btnNext.innerText = "티켓 소진 (메인으로)";
        btnNext.onclick = () => window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
    } else {
        btnNext.innerText = "다음 토너먼트 시작하기";
        btnNext.onclick = window.prepareVoteScreen;
    }
    actionArea.appendChild(btnNext);
    if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#ffd700', '#ffa500'] });
}

window.fireRoundEffect = function(r) {
    const b = document.getElementById('roundBadge');
    if (b) { b.classList.remove('pulse-anim'); void b.offsetWidth; b.classList.add('pulse-anim'); }
    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.2 }, colors: r === 2 ? ['#ffd700', '#ffa500'] : ['#6c5ce7', '#00b894'], disableForReducedMotion: true });
    }
}

// 4. Ticket Empty Screen
window.disableVoteScreen = function() {
    ['voteWrapper', 'passBtn', 'winnerContainer', 'roundBadge', 'voteIntro', 'voteTitle'].forEach(i => { 
        const e = document.getElementById(i); if(e) e.style.display = 'none'; 
    });
    if (document.getElementById('noTicketMsg')) return;
    const s = document.getElementById('screen-vote');
    if (s) {
        s.style.position = 'relative'; 
        const d = document.createElement('div');
        d.id = 'noTicketMsg';
        d.className = 'no-ticket-screen'; 
        d.innerHTML = `
            <div class="no-ticket-icon">😴</div>
            <h2 class="margin-bottom-30">티켓 소진!</h2>
            <p class="margin-bottom-30">내일 다시 충전돼요.</p>
            <button class="btn-action type-purple btn-master" onclick="goTab('screen-main',document.querySelector('.nav-item:first-child'))">메인으로</button>
        `;
        s.appendChild(d);
    }
}
window.resetVoteScreenUI = function() {
    const noMsg = document.getElementById('noTicketMsg'); if(noMsg) noMsg.remove();
    document.getElementById('screen-vote').style.position = '';
}

// 5. Modals
window.showConfirmModal = function(title, msg, onConfirm) { window.openCustomConfirm(title, msg, onConfirm); }
window.openCustomConfirm = function(title, msg, onConfirm) {
    const el = document.getElementById('customConfirmOverlay');
    const titleEl = document.getElementById('customConfirmTitle');
    const msgEl = document.getElementById('customConfirmMsg');
    const btn = document.getElementById('btnCustomConfirmAction');
    if (el && msgEl && btn) {
        if (titleEl) titleEl.innerText = title;
        msgEl.innerText = msg; 
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = function() { if (onConfirm) onConfirm(); window.closeCustomConfirm(); };
        el.classList.add('open');
    }
};
window.closeCustomConfirm = function() { document.getElementById('customConfirmOverlay').classList.remove('open'); };
window.openCustomAlert = function(title, msg) {
    const el = document.getElementById('customAlertOverlay');
    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMsg');
    const btn = document.getElementById('btnCustomAlertOk');
    if (el && msgEl && btn) {
        if(titleEl) titleEl.innerText = title;
        msgEl.innerText = msg;
        btn.onclick = function() { el.classList.remove('open'); };
        el.classList.add('open');
    } else { alert(msg); }
};
window.alert = function(msg) { window.openCustomAlert("알림", msg); };
window.openSheet = function(icon, title, msg, subMsg) {
    const overlayId = 'genericAlertOverlay';
    let overlay = document.getElementById(overlayId); if(overlay) overlay.remove();
    overlay = document.createElement('div'); overlay.id = overlayId; overlay.className = 'sheet-overlay open'; overlay.style.zIndex = '11000'; 
    overlay.innerHTML = `
        <div class="comment-modal">
            <div class="sheet-icon">${icon}</div>
            <h3 class="sheet-title-text">${title}</h3>
            <p class="sheet-sub-text">
                <span style="font-weight:bold; display:block; margin-bottom:5px;">${msg}</span>
                ${subMsg || ''}
            </p>
            <div class="modal-btn-row">
                <button class="btn-action type-gray" onclick="document.getElementById('${overlayId}').remove()">확인</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}
window.closePopup = function(id) { document.getElementById(id).classList.remove('open'); }
window.openPopup = function(id) { document.getElementById(id).classList.add('open'); }

window.openProfilePopup = function(id) {
    const user = window.candidates.find(u => u.id === id); if (!user) return;
    const overlayId = 'profileViewOverlay'; let overlay = document.getElementById(overlayId);
    if (!overlay) { overlay = document.createElement('div'); overlay.id = overlayId; overlay.className = 'sheet-overlay'; overlay.innerHTML = `<div class="comment-modal"><div id="profileViewContent"></div><div class="modal-btn-row"><button class="btn-action type-gray" onclick="closePopup('${overlayId}')">닫기</button></div></div>`; document.body.appendChild(overlay); }
    const content = `
        <div class="profile-view-box">
            <div class="avatar-circle profile-view-avatar">
                ${user.avatar}
                <div class="avatar-badge profile-view-badge">#${user.mbti}</div>
            </div>
            <h2 class="margin-bottom-30">${user.nickname}</h2>
            <div class="sheet-message-box">"${user.msg || user.desc || "상태 메시지가 없습니다."}"</div>
        </div>`;
    document.getElementById('profileViewContent').innerHTML = content;
    overlay.classList.add('open');
}
window.openCommentPopup = function(id, n) { window.currentWinnerId = id; document.getElementById('commentTargetName').innerText = `${n}님에게 한마디`; document.getElementById('commentInput').value = ''; document.getElementById('commentOverlay').classList.add('open'); }
window.submitComment = function() { const t = document.getElementById('commentInput').value.trim(); if (!t) { alert("내용을 입력해주세요."); return; } if (window.sendCommentToDB) window.sendCommentToDB(window.currentWinnerId, t); window.closePopup('commentOverlay'); }
window.showToast = function(msg) {
    const existing = document.querySelector('.toast-msg'); if(existing) existing.remove();
    const div = document.createElement('div'); div.className = 'toast-msg'; div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.5s'; setTimeout(() => div.remove(), 500); }, 2000);
}
window.showExcludePopup = function(userA, userB) {
    const elA = document.getElementById('txtExcludeA'); const elB = document.getElementById('txtExcludeB');
    const btnA = document.getElementById('btnExcludeA'); const btnB = document.getElementById('btnExcludeB');
    if (elA && userA) { elA.innerText = `${userA.nickname} (${userA.avatar})`; btnA.onclick = () => window.confirmExclude(userA.id, userA.nickname); }
    if (elB && userB) { elB.innerText = `${userB.nickname} (${userB.avatar})`; btnB.onclick = () => window.confirmExclude(userB.id, userB.nickname); }
    document.getElementById('excludeOverlay').classList.add('open');
};

// 🟢 [Simple] 그냥 있는 그대로 적용 (안전장치 삭제)
window.applyActiveEffects = function() { 
    const b = document.body; 
    b.classList.remove(...THEME_CLASSES); 
    if(!window.myInfo?.inventory) return; 
    const activeEffect = window.myInfo.inventory.find(i=>i.type==='effect' && i.isActive); 
    if(activeEffect) {
        if(THEME_CLASSES.includes(activeEffect.value)){ b.classList.add(activeEffect.value); }
    } 
}

window.drawChart = function() {
    const c = document.getElementById('myRadarChart'); if (!c) return;
    if (window.myChart) window.myChart.destroy();
    const style = getComputedStyle(document.body);
    window.myChart = new Chart(c, {
        type: 'radar',
        data: { labels: ['지성','센스','멘탈','인성','텐션','광기'], datasets: [{ label: '나', data: window.myInfo.stats, fill: true, backgroundColor: style.getPropertyValue('--chart-fill').trim(), borderColor: style.getPropertyValue('--chart-stroke').trim(), pointBackgroundColor: style.getPropertyValue('--chart-stroke').trim(), pointBorderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: style.getPropertyValue('--chart-grid').trim() }, grid: { color: style.getPropertyValue('--chart-grid').trim() }, pointLabels: { color: style.getPropertyValue('--chart-label').trim(), font: { size: 14, weight: 'bold' } }, suggestedMin: 0, suggestedMax: 100, ticks: { display: false, stepSize: 25 } } }, plugins: { legend: { display: false } } }
    });
};
window.renderRankList = function(filterIdx) {
    const container = document.getElementById('rankListContainer'); if (!container) return;
    let list = [...(window.candidates || [])];
    if (list.length === 0) { container.innerHTML = `<p class="list-empty-msg">랭킹 데이터가 없습니다.</p>`; return; }
    if (filterIdx === -1) list.sort((a, b) => (b.stats.reduce((x,y)=>x+y,0) - a.stats.reduce((x,y)=>x+y,0)));
    else list.sort((a, b) => (b.stats[filterIdx] || 0) - (a.stats[filterIdx] || 0));
    let html = '';
    list.forEach((u, idx) => {
        let score = (filterIdx === -1) ? Math.round(u.stats.reduce((a,b)=>a+b,0)/6) : u.stats[filterIdx] || 0;
        let medal = (idx===0)?'🥇':(idx===1)?'🥈':(idx===2)?'🥉':`${idx+1}`;
        html += `<li class="list-item" onclick="window.openProfilePopup('${u.id}')"><div style="font-weight:900; font-size:16px; width:30px; text-align:center; margin-right:10px; color:${idx<3?'var(--primary)':'#ccc'}">${medal}</div><div class="common-circle-frame" style="margin-right:10px;">${u.avatar}</div><div class="list-item-text"><div style="font-weight:bold; font-size:14px;">${u.nickname}</div><div style="font-size:11px; color:var(--text-secondary);">${u.mbti ? '#'+u.mbti : ''}</div></div><div class="list-item-score">${score}점</div></li>`;
    });
    container.innerHTML = html;
};

// [Ranking Logic]
window.currentRankView = 'rank'; 
window.initRankScreen = function() {
    const radioRank = document.getElementById('tabRank');
    if(radioRank) radioRank.checked = true;
    window.switchRankView('rank');
}
window.switchRankView = function(viewType) {
    window.currentRankView = viewType; 
    document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active'));
    if (viewType === 'fandom') window.renderFandomList(-1);
    else window.renderRankList(-1);
}
window.filterRank = function(el, type) { 
    document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active')); 
    if (el) el.classList.add('active'); 
    if (window.currentRankView === 'fandom') window.renderFandomList(type); 
    else { window.currentFilter = type; window.renderRankList(type); }
};
window.renderFandomList = async function(filterIdx) { 
    const container = document.getElementById('rankListContainer'); if (!container) return;
    container.innerHTML = `<div style="text-align:center; padding:50px;"><span style="font-size:30px;">🛰️</span><br><br>팬덤 신호를 수신 중입니다...</div>`;
    const fandomData = await window.getMyFandomData(filterIdx);
    let html = '';
    if (fandomData.length === 0) {
        const emptyComment = (filterIdx === -1) ? "아직 팬이 없네요... 🥲<br>친구들에게 매력을 어필해보세요!" : "이 능력으로는 아직<br>받은 표가 없어요!";
        html = `<p class="list-empty-msg" style="margin-top:50px; line-height:1.6;">${emptyComment}</p>`;
    } else {
        fandomData.forEach((fan, idx) => {
            let rankBadge = (idx===0)?'🥇':(idx===1)?'🥈':(idx===2)?'🥉':`${idx+1}`;
            let rankColor = (idx<3) ? '#e84393' : '#ccc'; 
            let scoreLabel = (filterIdx !== -1) ? '표 (해당)' : '표 (누적)';
            html += `<li class="list-item" onclick="window.openProfilePopup('${fan.id}')"><div style="font-weight:900; font-size:16px; width:30px; text-align:center; margin-right:10px; color:${rankColor}">${rankBadge}</div><div class="common-circle-frame" style="margin-right:10px;">${fan.avatar}</div><div class="list-item-text"><div style="font-weight:bold; font-size:14px;">${fan.nickname}</div><div style="font-size:11px; color:var(--text-secondary);">${fan.mbti ? '#'+fan.mbti : ''}</div></div><div class="list-item-score" style="background:#fff0f6; color:#e84393; border:1px solid #ffc9c9;">${fan.voteCount}${scoreLabel}</div></li>`;
        });
    }
    container.innerHTML = html;
}

window.logout = function() { localStorage.clear(); location.reload(); }
window.loginWithServer = function() { goScreen('screen-nickname'); }
window.debugLogin = function(u) { if (!u) return; localStorage.setItem('my_uid', u); location.reload(); }
window.nextTest = function(v, n) { tempTestResult.push(v); goScreen(n); }
window.finishTest = function(l) { tempTestResult.push(l); const c={E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0}; tempTestResult.forEach(v=>c[v]++); let m=(c['E']>=c['I']?'E':'I')+(c['S']>=c['N']?'S':'N')+(c['T']>=c['F']?'T':'F')+(c['J']>=c['P']?'J':'P'); window.saveMbtiToServer ? window.saveMbtiToServer(m) : setMyTypeUI(m); tempTestResult=[]; }
window.saveNicknameAndNext = function() { const n=document.getElementById('inputNickname').value.trim(); if(!n){alert("닉네임을 입력해주세요!");return;} if(!window.myInfo)window.myInfo={nickname:""}; window.myInfo.nickname=n; if(window.db)window.db.collection("users").doc(localStorage.getItem('my_uid')).update({nickname:n}); goScreen('screen-mbti'); }
window.editProfileMsg = function() { if(!window.myInfo)return; document.getElementById('profileMsgInput').value=window.myInfo.msg==='상태 메시지'?'':window.myInfo.msg; document.getElementById('profileMsgOverlay').classList.add('open'); }
window.submitProfileMsg = async function() { const m=document.getElementById('profileMsgInput').value; if(window.saveProfileMsgToDB && await window.saveProfileMsgToDB(m.trim().substring(0,50))) closePopup('profileMsgOverlay'); }
window.renderAchievementsList = function() { const container = document.querySelector('.achieve-grid'); if(!container) return; const list = window.achievementsList||[]; const myIds = new Set(window.myInfo.achievedIds||[]); let html=''; list.forEach(a=>{ const isUnlocked=myIds.has(a.id); const cls=isUnlocked?'':'locked'; const date=window.achievedDateMap[a.id]||''; html+=`<div class="achieve-item ${cls}" onclick="window.showToast('${isUnlocked?'달성일: '+date:'미달성: '+a.desc}')"><div style="font-size:30px; margin-bottom:5px;">${a.icon}</div><div class="achieve-title">${a.title}</div>${isUnlocked?'<div style="font-size:9px; color:var(--primary); margin-top:2px;">✔ 달성</div>':''}</div>`; }); if(html==='') html=`<p class="list-empty-msg" style="grid-column:1/-1;">업적 데이터 로딩 중...</p>`; container.innerHTML=html; }
window.renderHistoryList = async function() { const container = document.querySelector('#tab-history .list-wrap'); if(!container) return; container.innerHTML=`<div style="text-align:center; padding:20px;">🔄 기록 불러오는 중...</div>`; if(!window.db){container.innerHTML=`<p class="list-empty-msg">DB 연결이 필요합니다.</p>`;return;} try{const uid=localStorage.getItem('my_uid'); const snapshot=await window.db.collection("logs").where("target_uid","==",uid).orderBy("timestamp","desc").limit(20).get(); if(snapshot.empty){container.innerHTML=`<p class="list-empty-msg">아직 기록이 없어요.</p>`;return;} let html=''; snapshot.forEach(doc=>{ const data=doc.data(); const date=data.timestamp?data.timestamp.toDate().toLocaleDateString():'날짜 미상'; let icon='📩'; if(data.action_type==='VOTE')icon='🗳️';else if(data.action_type==='ACHIEVE')icon='🏆';else if(data.action_type==='PURCHASE')icon='🛍️'; html+=`<li class="list-item"><div class="common-circle-frame">${icon}</div><div class="list-item-text"><div style="font-weight:bold; font-size:13px;">${data.message}</div><div style="font-size:11px; color:var(--text-secondary);">${date}</div></div>${data.score_change!==0?`<div class="list-item-score" style="background:transparent; color:${data.score_change>0?'#ff7675':'var(--text-secondary)'};">${data.score_change>0?'+':''}${data.score_change}</div>`:''}</li>`; }); container.innerHTML=html; } catch(e){console.error(e);container.innerHTML=`<p class="list-empty-msg">기록 로드 실패</p>`;} }

window.shareLink = function() {
    const url = window.location.href;
    const title = "It's me! - 남들이 보는 진짜 나";
    const text = "친구들이 보는 내 이미지는 어떨까? 지금 확인해보세요!";
    if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch((error) => console.log('공유 취소 또는 실패', error));
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed'; textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); if(window.showToast) window.showToast("링크가 복사되었습니다! 🔗"); else alert("링크가 복사되었습니다!"); } catch (err) { alert("링크 복사에 실패했습니다."); }
        document.body.removeChild(textarea);
    }
};

// 🟢 [Simple Standard] SHOP_ITEMS 아이디를 모두 하이픈(-)으로 통일
const SHOP_ITEMS = [
    { id: 'ticket_1', tab: 'utility', section: '💎 토큰 충전소', type: 'item', icon: '🎫', name: '티켓 1장', price: 100, desc: '즉시 충전' },
    { id: 'ticket_5', tab: 'utility', section: '💎 토큰 충전소', type: 'item', icon: '🎫', name: '티켓 5장', price: 450, desc: '5장 묶음' },
    { id: 'name_change', tab: 'utility', section: '🏷️ 계정 관리', type: 'item', icon: '📝', name: '닉변권', price: 300, desc: '닉네임 변경' },
    { id: 'avatar_tiger', tab: 'deco', section: '🐯 동물 아바타 (영구)', type: 'avatar', icon: '🐯', name: '호랑이', price: 50 },
    { id: 'avatar_rabbit', tab: 'deco', section: '🐯 동물 아바타 (영구)', type: 'avatar', icon: '🐰', name: '토끼', price: 50 },
    { id: 'avatar_robot', tab: 'deco', section: '🤖 스페셜 아바타', type: 'avatar', icon: '🤖', name: '로봇', price: 100 },
    { id: 'avatar_alien', tab: 'deco', section: '🤖 스페셜 아바타', type: 'avatar', icon: '👽', name: '외계인', price: 100 },
    // 🟢 하이픈 사용 (bg-gold)
    { id: 'bg-gold', tab: 'deco', section: '✨ 테마 아이템', type: 'effect', icon: '✨', name: '황금 배경', price: 30 },
    { id: 'bg-dark', tab: 'deco', section: '✨ 테마 아이템', type: 'effect', icon: '🌑', name: '다크 모드', price: 30 },
    { id: 'bg-pink', tab: 'deco', section: '✨ 테마 아이템', type: 'effect', icon: '🌸', name: '핑크 모드', price: 30 },
    { id: 'shout', tab: 'social', section: '📢 확성기', type: 'item', icon: '📢', name: '전체 외치기', price: 50, desc: '메시지 전송' },
    { id: 'random_box', tab: 'gacha', section: '🎁 행운의 상자', type: 'gacha', icon: '❓', name: '랜덤 박스', price: 20, desc: '뭐가 나올까?' }
];

window.filterShop = function(category) {
    const container = document.querySelector('#screen-shop .shop-grid');
    if (!container) return; 
    const items = SHOP_ITEMS.filter(item => item.tab === category);
    container.innerHTML = ''; 
    if (items.length === 0) { container.innerHTML = `<div class="list-empty-msg" style="padding:50px;">준비 중인 상점입니다. 🧹</div>`; return; }
    const groups = {};
    items.forEach(item => { if (!groups[item.section]) groups[item.section] = []; groups[item.section].push(item); });
    let html = '';
    for (const [sectionTitle, groupItems] of Object.entries(groups)) {
        html += `<div class="shop-title" style="width:100%; margin-top:20px; margin-bottom:10px; font-weight:bold; font-size:16px; border-left:4px solid var(--primary); padding-left:10px; text-align:left;">${sectionTitle}</div><div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; width:100%; margin-bottom:20px;">`;
        groupItems.forEach(item => { html += `<div class="shop-item" onclick="window.tryPurchase('${item.id}')"><div style="font-size:30px; margin-bottom:5px;">${item.icon}</div><div class="shop-item-name">${item.name}</div><div class="shop-item-price">💎 ${item.price}</div></div>`; });
        html += `</div>`; 
    }
    container.innerHTML = html;
};

window.tryPurchase = function(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (item.id === 'shout') { window.openShoutInputModal(item); return; }
    if (item.type === 'gacha') { window.runGachaSystem(item); return; }
    
    // 🟢 [Simple] 단순 비교
    let checkVal = (item.type === 'effect') ? item.id : item.icon; 
    if (window.myInfo.inventory.some(i => i.value === checkVal)) {
        window.openCustomAlert("알림", "이미 보유한 아이템입니다!");
        return;
    }
    if (window.purchaseItem) window.purchaseItem(item.price, item.type, checkVal, item.name);
};

window.runGachaSystem = function(item) {
    if (window.myInfo.tokens < item.price) { window.openCustomAlert("잔액 부족 💸", "토큰이 부족합니다!"); return; }
    const doGacha = function() {
        window.myInfo.tokens -= item.price;
        document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens;
        const rand = Math.random() * 100;
        let rewardType = "token"; let rewardVal = 10; let msgTitle = "😭 꽝..."; let msgBody = "아쉽네요...\n위로금 10💎을 드립니다.";
        if (rand < 40) { } 
        else if (rand < 90) { rewardType = 'token'; rewardVal = 50; msgTitle = "💰 축하합니다!"; msgBody = "본전 뽑았다!\n토큰 50💎 획득!"; } 
        else {
            if (window.myInfo.inventory.some(i => i.value === '👻')) { rewardType = 'token'; rewardVal = 500; msgTitle = "👻 [전설] 중복"; msgBody = "이미 유령이 있네요!\n대신 500토큰을 드립니다!"; } 
            else { rewardType = 'avatar'; rewardVal = '👻'; msgTitle = "👻 대박 사건!!"; msgBody = "[전설] 유령 아바타 당첨!!\n지금 바로 장착해보세요."; }
        }
        const updates = { tokens: window.myInfo.tokens }; 
        if (rewardType === 'token') { updates.tokens += rewardVal; window.myInfo.tokens += rewardVal; document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens; } 
        else if (rewardType === 'avatar') { const newItem = { type: 'avatar', value: rewardVal, name: '유령 아바타', date: new Date() }; window.myInfo.inventory.push(newItem); updates.inventory = window.myInfo.inventory; }
        if (window.db) { window.db.collection('users').doc(localStorage.getItem('my_uid')).update(updates).then(() => { window.openCustomAlert(msgTitle, msgBody); }).catch((err) => { console.error(err); }); }
    };
    window.openCustomConfirm("🎁 랜덤 박스", `${item.name}를 구매하시겠습니까?\n(가격: ${item.price} 💎)`, doGacha);
};

window.openShoutInputModal = function(item) {
    if (window.myInfo.tokens < item.price) { window.openCustomAlert("잔액 부족 💸", "토큰이 부족합니다!"); return; }
    document.getElementById('shoutInputPrice').innerText = `가격: ${item.price} 💎`;
    document.getElementById('shoutInputText').value = ""; 
    const btn = document.getElementById('btnShoutSubmit');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.onclick = function() {
        const message = document.getElementById('shoutInputText').value.trim();
        if (message.length === 0) { window.openCustomAlert("입력 오류", "보낼 메시지를 입력해주세요."); return; }
        window.submitShoutMessage(item, message);
    };
    window.openPopup('shoutInputOverlay');
};

window.submitShoutMessage = function(item, message) {
    window.myInfo.tokens -= item.price;
    document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens;
    window.closePopup('shoutInputOverlay'); 
    const updates = { tokens: window.myInfo.tokens }; 
    const shoutLog = { senderNickname: window.myInfo.nickname, senderAvatar: window.myInfo.avatar, message: message, timestamp: new Date() };
    if (window.db) {
        window.db.collection('users').doc(localStorage.getItem('my_uid')).update(updates)
            .then(() => { if(window.saveShoutLog) window.saveShoutLog(shoutLog); window.openCustomAlert("📢 전송 완료", `메시지를 전체에게 보냈습니다!`); })
            .catch((err) => { console.error(err); window.openCustomAlert("오류", "전송에 실패했습니다."); });
    }
};

window.showShoutNotification = function(data) {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px); background: rgba(0, 0, 0, 0.85); color: white; padding: 12px 20px; border-radius: 50px; z-index: 9999; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-size: 14px; white-space: nowrap; max-width: 90%;`;
    toast.innerHTML = `<span style="font-size:18px;">${data.senderAvatar || '📢'}</span><span style="font-weight:bold; color:#a29bfe;">${data.senderNickname}</span><span style="opacity:0.9;">: ${data.message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.transform = "translateX(-50%) translateY(0)"; }, 100);
    setTimeout(() => { toast.style.transform = "translateX(-50%) translateY(-100px)"; setTimeout(() => { document.body.removeChild(toast); }, 500); }, 5000);
};

window.currentDisplayedList = [];
window.openInventory = function() { window.openPopup('inventoryOverlay'); window.updateInventoryList('all', null); };
window.updateInventoryList = function(category, tabEl) {
    window.currentInvCategory = category;
    if (document.querySelector('.inv-tab')) {
        if (tabEl) { document.querySelectorAll('.inv-tab').forEach(el => el.classList.remove('active')); tabEl.classList.add('active'); }
        else { const firstTab = document.querySelector('.inv-tab'); if(firstTab) { document.querySelectorAll('.inv-tab').forEach(el => el.classList.remove('active')); firstTab.classList.add('active'); } }
    }
    const fullList = window.myInfo.inventory || [];
    let filtered = [];
    if (category === 'all') filtered = fullList;
    else if (category === 'avatar') filtered = fullList.filter(item => item.type === 'avatar');
    else if (category === 'effect') filtered = fullList.filter(item => item.type === 'effect');
    window.currentDisplayedList = [...filtered].reverse();
    let container = document.getElementById('inventoryListArea'); 
    if (!container) container = document.getElementById('inventoryGrid'); 
    if (!container) { console.error("❌ 가방 영역(inventoryGrid)을 찾을 수 없습니다!"); return; }
    container.innerHTML = "";
    if (window.currentDisplayedList.length === 0) { container.innerHTML = `<div class="list-empty-msg" style="padding:40px; text-align:center; color:#999;">아이템이 없습니다 텅~🗑️</div>`; return; }
    let html = '<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; width:100%;">';
    window.currentDisplayedList.forEach((item, index) => {
        let displayIcon = item.value || item.icon;
        if ((!displayIcon || displayIcon === "") && typeof SHOP_ITEMS !== 'undefined') { const originalItem = SHOP_ITEMS.find(si => si.id === item.id); if (originalItem) displayIcon = originalItem.icon; }
        displayIcon = displayIcon || '📦';
        
        // 🟢 [Simple] 있는 그대로 비교 (하이픈)
        const isEquipped = (item.type === 'avatar' && window.myInfo.avatar === item.value) || 
                           (item.type === 'effect' && window.myInfo.bgEffect === item.value);
                           
        const borderStyle = isEquipped ? "border:2px solid var(--primary); background:rgba(108,92,231,0.1);" : "border:1px solid var(--border);";
        html += `<div onclick="window.equipItem(${index})" style="${borderStyle} border-radius:12px; padding:10px 5px; text-align:center; cursor:pointer; position:relative;"><div style="font-size:30px; margin-bottom:5px;">${displayIcon}</div><div style="font-size:11px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>${isEquipped ? '<div style="position:absolute; top:5px; right:5px; width:8px; height:8px; background:var(--primary); border-radius:50%;"></div>' : ''}</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
};

// 🟢 [Simple] 있는 그대로 저장
window.equipItem = function(index) {
    const item = window.currentDisplayedList[index];
    if (!item) return;
    const updates = {};
    if (item.type === 'avatar') { window.myInfo.avatar = item.value; updates.avatar = item.value; } 
    else if (item.type === 'effect') { 
        window.myInfo.bgEffect = item.value; 
        updates.bgEffect = item.value; 
    }
    if (window.db) { window.db.collection('users').doc(localStorage.getItem('my_uid')).update(updates).then(() => { window.updateInventoryList(window.currentInvCategory, document.querySelector('.inv-tab.active')); if(window.updateMyInfoUI) window.updateMyInfoUI(); }); }
};

function initShopSafe() { setTimeout(() => { if (typeof window.filterShop === 'function') { window.filterShop('utility'); } }, 300); }
if (document.readyState === 'loading') { window.addEventListener('DOMContentLoaded', initShopSafe); } else { initShopSafe(); }
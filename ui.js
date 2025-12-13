// ui.js
// Version: v19.14.0 (Refactored)
// Description: UI Controller & Animation Handler

let myMbti = "";
let tempTestResult = [];
let myChart = null;
const THEME_CLASSES = ['bg-gold', 'bg-dark', 'bg-pink'];

// 1. Common UI Updaters
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
    
    // [Fix] 패치되었던 티켓 카운트 배지 로직 정식 반영
    if (b) {
        const numSpan = b.querySelector('.fb-count');
        if(numSpan) numSpan.innerText = count;
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

// 2. Navigation
window.goTab = function(s, n) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-vote' && window.isGameRunning) {
        window.openCustomConfirm("⚠️ 평가 이탈<br><span class='warn-text'>티켓은 복구되지 않습니다.</span>", () => {
            window.isGameRunning = false;
            proceedTab(s, n);
        });
        return; 
    }
    proceedTab(s, n);
}

function proceedTab(s, n) {
    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (n) n.classList.add('active');

    if (s === 'screen-main') setTimeout(() => window.goSubTab('tab-prism', document.querySelector('.sub-tab:first-child')), 0);
    else if (s === 'screen-rank') {
        if (window.renderRankList) window.renderRankList(-1);
        const allPill = document.querySelector('#rankFilterContainer .stat-pill:first-child');
        if (window.filterRank && allPill) window.filterRank(allPill, -1);
    } else if (s === 'screen-vote') {
        if(window.prepareVoteScreen) window.prepareVoteScreen();
    }
    if (window.updateProfileUI) window.updateProfileUI();
}

window.goSubTab = function(c, t) {
    document.querySelectorAll('.sub-content').forEach(x => x.classList.remove('active'));
    document.getElementById(c).classList.add('active');
    document.querySelectorAll('.sub-tab').forEach(x => x.classList.remove('active'));
    if (t) t.classList.add('active');
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
    
    // Check Ticket
    if (window.myInfo && window.myInfo.tickets <= 0) {
        window.disableVoteScreen();
        return; 
    }

    // Reset UI
    const noMsg = document.getElementById('noTicketMsg');
    if(noMsg) noMsg.remove();
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
    
    // Reset Animation Classes
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

// [New] Animation Handler for Vote
window.animateVoteSelection = function(idx) {
    return new Promise(resolve => {
        const cards = document.querySelectorAll('#vsContainer .vs-card');
        const selectedCard = cards[idx];
        
        if (selectedCard) {
            selectedCard.classList.add('selected-choice');
        }

        // Wait 550ms then resolve
        setTimeout(() => {
            resolve();
        }, 550);
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

    // Render Buttons
    const actionArea = document.getElementById('winnerActionArea');
    actionArea.innerHTML = ''; // Clear prev

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
        d.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-size: 18px; color: var(--text-secondary); background-color: var(--card); z-index: 10;`;
        d.innerHTML = `
            <div style="font-size:60px; margin-bottom:20px;">😴</div>
            <h2 style="margin-bottom:10px;">티켓 소진!</h2>
            <p style="margin-bottom:30px;">내일 다시 충전돼요.</p>
            <button class="btn-action type-purple btn-master" onclick="goTab('screen-main',document.querySelector('.nav-item:first-child'))">메인으로</button>
        `;
        s.appendChild(d);
    }
}
window.resetVoteScreenUI = function() {
    const noMsg = document.getElementById('noTicketMsg');
    if(noMsg) noMsg.remove();
    document.getElementById('screen-vote').style.position = '';
}

// 5. Modals & Popups
window.showConfirmModal = function(title, msg, onConfirm) { /* Deprecated -> use openCustomConfirm */ window.openCustomConfirm(msg, onConfirm); }

window.openCustomConfirm = function(msg, onConfirm) {
    const el = document.getElementById('customConfirmOverlay');
    const msgEl = document.getElementById('customConfirmMsg');
    const btn = document.getElementById('btnCustomConfirmAction');
    if (el && msgEl && btn) {
        msgEl.innerHTML = msg; 
        btn.onclick = function() { if (onConfirm) onConfirm(); window.closeCustomConfirm(); };
        el.classList.add('open');
    }
};
window.closeCustomConfirm = function() { document.getElementById('customConfirmOverlay').classList.remove('open'); };

window.openSheet = function(icon, title, msg, subMsg) {
    /* Use dynamic creation for generic alert to keep HTML clean */
    const overlayId = 'genericAlertOverlay';
    let overlay = document.getElementById(overlayId);
    if(overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = overlayId; overlay.className = 'sheet-overlay open'; overlay.style.zIndex = '11000';
    overlay.innerHTML = `<div class="comment-modal"><div style="font-size:40px; margin-bottom:10px;">${icon}</div><h3>${title}</h3><p style="text-align:center; margin-bottom:5px; font-weight:bold;">${msg}</p><p style="text-align:center; font-size:13px; color:var(--text-secondary); margin-bottom:20px;">${subMsg || ''}</p><div class="modal-btn-row"><button class="btn-action type-gray" onclick="document.getElementById('${overlayId}').remove()">확인</button></div></div>`;
    document.body.appendChild(overlay);
}

window.closePopup = function(id) { document.getElementById(id).classList.remove('open'); }

window.openProfilePopup = function(id) {
    const user = window.candidates.find(u => u.id === id);
    if (!user) return;
    const overlayId = 'profileViewOverlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement('div'); overlay.id = overlayId; overlay.className = 'sheet-overlay';
        overlay.innerHTML = `<div class="comment-modal"><div id="profileViewContent"></div><div class="modal-btn-row"><button class="btn-action type-gray" onclick="closePopup('${overlayId}')">닫기</button></div></div>`;
        document.body.appendChild(overlay);
    }
    const content = `<div style="display:flex; flex-direction:column; align-items:center; margin-bottom:20px;"><div class="avatar-circle" style="width:100px; height:100px; font-size:50px; margin-bottom:15px;">${user.avatar}<div class="avatar-badge" style="font-size:14px; padding:5px 10px;">#${user.mbti}</div></div><h2 style="margin-bottom:5px;">${user.nickname}</h2><div class="sheet-message-box" style="width:100%; margin-bottom:0;">"${user.msg || user.desc || "상태 메시지가 없습니다."}"</div></div>`;
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

// 6. Chart & Lists (Brief implementations)
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
window.filterRank = function(el, type) { document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active')); el.classList.add('active'); window.currentFilter = type; window.renderRankList(type); };

// Other helpers (Inventory, History, MBTI Test) omitted for brevity but presumed included or identical to previous version.
// Simply re-adding missing tiny functions to ensure full operation:
window.logout = function() { localStorage.clear(); location.reload(); }
window.loginWithServer = function() { goScreen('screen-nickname'); }
window.debugLogin = function(u) { if (!u) return; localStorage.setItem('my_uid', u); location.reload(); }
window.nextTest = function(v, n) { tempTestResult.push(v); goScreen(n); }
window.finishTest = function(l) { tempTestResult.push(l); const c={E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0}; tempTestResult.forEach(v=>c[v]++); let m=(c['E']>=c['I']?'E':'I')+(c['S']>=c['N']?'S':'N')+(c['T']>=c['F']?'T':'F')+(c['J']>=c['P']?'J':'P'); window.saveMbtiToServer ? window.saveMbtiToServer(m) : setMyTypeUI(m); tempTestResult=[]; }
window.saveNicknameAndNext = function() { const n=document.getElementById('inputNickname').value.trim(); if(!n){alert("닉네임을 입력해주세요!");return;} if(!window.myInfo)window.myInfo={nickname:""}; window.myInfo.nickname=n; if(window.db)window.db.collection("users").doc(localStorage.getItem('my_uid')).update({nickname:n}); goScreen('screen-mbti'); }
window.editProfileMsg = function() { if(!window.myInfo)return; document.getElementById('profileMsgInput').value=window.myInfo.msg==='상태 메시지'?'':window.myInfo.msg; document.getElementById('profileMsgOverlay').classList.add('open'); }
window.submitProfileMsg = async function() { const m=document.getElementById('profileMsgInput').value; if(window.saveProfileMsgToDB && await window.saveProfileMsgToDB(m.trim().substring(0,50))) closePopup('profileMsgOverlay'); }
window.openInventory = function() { document.getElementById('inventoryOverlay').classList.add('open'); window.updateInventoryList('all'); }
window.updateInventoryList = function(filter, tabEl) {
    if(tabEl) { document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active')); tabEl.classList.add('active'); }
    const container = document.getElementById('inventoryListArea'); if(!container) return;
    const l = window.myInfo.inventory || [];
    const def = { id: 'def', type: 'avatar', value: '👤', name: '기본' };
    let all = (filter === 'effect') ? l.filter(i => i.type === 'effect') : (filter === 'avatar') ? [def, ...l.filter(i => i.type === 'avatar')] : [def, ...l];
    let listHtml = '';
    if (all.length === 0) listHtml = `<p class="list-empty-msg">아이템이 없습니다.</p>`;
    else {
        all.forEach(i => {
            const isEquipped = (i.type === 'avatar' && i.value === window.myInfo.avatar);
            const isActive = i.isActive;
            let btnLabel = '사용', btnClass = 'btn-outline', btnAction = '';
            if (i.type === 'avatar') { if (isEquipped) { btnLabel = '사용 중'; btnClass = 'btn-action type-gray small'; } else { btnAction = `onclick="equipAvatar('${i.value}')"`; btnClass = 'btn-action small'; } }
            else { if (isActive) { btnLabel = '해제'; btnClass = 'btn-action type-gray small'; btnAction = `onclick="toggleEffect('${i.id}')"`; } else { btnAction = `onclick="toggleEffect('${i.id}')"`; btnClass = 'btn-action small'; } }
            listHtml += `<div class="list-item"><div class="common-circle-frame">${i.value.startsWith('bg')?'✨':i.value}</div><div class="list-item-text"><div style="font-weight:bold;font-size:14px;">${i.name}</div></div><button class="${btnClass}" style="width:80px;" ${btnAction}>${btnLabel}</button></div>`;
        });
    }
    container.innerHTML = listHtml;
}
window.applyActiveEffects = function() { const b=document.body; b.classList.remove(...THEME_CLASSES); if(!window.myInfo?.inventory) return; const activeEffect=window.myInfo.inventory.find(i=>i.type==='effect'&&i.isActive); if(activeEffect&&THEME_CLASSES.includes(activeEffect.value)){b.classList.add(activeEffect.value);} }
window.renderAchievementsList = function() { const container = document.querySelector('.achieve-grid'); if(!container) return; const list = window.achievementsList||[]; const myIds = new Set(window.myInfo.achievedIds||[]); let html=''; list.forEach(a=>{ const isUnlocked=myIds.has(a.id); const cls=isUnlocked?'':'locked'; const date=window.achievedDateMap[a.id]||''; html+=`<div class="achieve-item ${cls}" onclick="window.showToast('${isUnlocked?'달성일: '+date:'미달성: '+a.desc}')"><div style="font-size:30px; margin-bottom:5px;">${a.icon}</div><div class="achieve-title">${a.title}</div>${isUnlocked?'<div style="font-size:9px; color:var(--primary); margin-top:2px;">✔ 달성</div>':''}</div>`; }); if(html==='') html=`<p class="list-empty-msg" style="grid-column:1/-1;">업적 데이터 로딩 중...</p>`; container.innerHTML=html; }
window.renderHistoryList = async function() { const container = document.querySelector('#tab-history .list-wrap'); if(!container) return; container.innerHTML=`<div style="text-align:center; padding:20px;">🔄 기록 불러오는 중...</div>`; if(!window.db){container.innerHTML=`<p class="list-empty-msg">DB 연결이 필요합니다.</p>`;return;} try{const uid=localStorage.getItem('my_uid'); const snapshot=await window.db.collection("logs").where("target_uid","==",uid).orderBy("timestamp","desc").limit(20).get(); if(snapshot.empty){container.innerHTML=`<p class="list-empty-msg">아직 기록이 없어요.</p>`;return;} let html=''; snapshot.forEach(doc=>{ const data=doc.data(); const date=data.timestamp?data.timestamp.toDate().toLocaleDateString():'날짜 미상'; let icon='📩'; if(data.action_type==='VOTE')icon='🗳️';else if(data.action_type==='ACHIEVE')icon='🏆';else if(data.action_type==='PURCHASE')icon='🛍️'; html+=`<li class="list-item"><div class="common-circle-frame">${icon}</div><div class="list-item-text"><div style="font-weight:bold; font-size:13px;">${data.message}</div><div style="font-size:11px; color:var(--text-secondary);">${date}</div></div>${data.score_change!==0?`<div class="list-item-score" style="background:transparent; color:${data.score_change>0?'#ff7675':'var(--text-secondary)'};">${data.score_change>0?'+':''}${data.score_change}</div>`:''}</li>`; }); container.innerHTML=html; } catch(e){console.error(e);container.innerHTML=`<p class="list-empty-msg">기록 로드 실패</p>`;} }
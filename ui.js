// ui.js
// Version: v19.14.6 (Cleanup)
// Description: UI Controller & Animation Handler

let myMbti = "";
let tempTestResult = [];
let myChart = null;
window.currentInvFilter = 'all'; 
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
    
    if (window.myInfo && window.myInfo.tickets <= 0) {
        window.disableVoteScreen();
        return; 
    }

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
        if (selectedCard) {
            selectedCard.classList.add('selected-choice');
        }
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

// 4. Ticket Empty Screen (Cleaned)
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
        d.className = 'no-ticket-screen'; // Use CSS class
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
    const noMsg = document.getElementById('noTicketMsg');
    if(noMsg) noMsg.remove();
    document.getElementById('screen-vote').style.position = '';
}

// 5. Modals & Popups
window.showConfirmModal = function(title, msg, onConfirm) { 
    window.openCustomConfirm(title, msg, onConfirm); 
}

window.openCustomConfirm = function(title, msg, onConfirm) {
    const el = document.getElementById('customConfirmOverlay');
    const titleEl = document.getElementById('customConfirmTitle');
    const msgEl = document.getElementById('customConfirmMsg');
    const btn = document.getElementById('btnCustomConfirmAction');

    if (el && msgEl && btn) {
        if (titleEl) titleEl.innerText = title;
        msgEl.innerHTML = msg; 
        
        btn.onclick = function() { 
            if (onConfirm) onConfirm(); 
            window.closeCustomConfirm(); 
        };
        
        el.classList.add('open');
    }
};

window.closeCustomConfirm = function() { 
    document.getElementById('customConfirmOverlay').classList.remove('open'); 
};

window.openCustomAlert = function(msg, onOk) {
    const el = document.getElementById('customAlertOverlay');
    const msgEl = document.getElementById('customAlertMsg');
    const btn = document.getElementById('btnCustomAlertOk');

    if (el && msgEl && btn) {
        msgEl.innerText = msg;
        btn.onclick = function() {
            el.classList.remove('open');
            if (onOk) onOk();
        };
        el.classList.add('open');
    } else {
        console.warn("Custom Alert HTML not found. Fallback to native alert.");
        alert(msg); 
    }
};

window.alert = function(msg) {
    window.openCustomAlert(msg);
};

window.openSheet = function(icon, title, msg, subMsg) {
    const overlayId = 'genericAlertOverlay';
    let overlay = document.getElementById(overlayId);
    if(overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = overlayId; 
    overlay.className = 'sheet-overlay open'; 
    overlay.style.zIndex = '11000'; // Keep this specific override
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

window.logout = function() { localStorage.clear(); location.reload(); }
window.loginWithServer = function() { goScreen('screen-nickname'); }
window.debugLogin = function(u) { if (!u) return; localStorage.setItem('my_uid', u); location.reload(); }
window.nextTest = function(v, n) { tempTestResult.push(v); goScreen(n); }
window.finishTest = function(l) { tempTestResult.push(l); const c={E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0}; tempTestResult.forEach(v=>c[v]++); let m=(c['E']>=c['I']?'E':'I')+(c['S']>=c['N']?'S':'N')+(c['T']>=c['F']?'T':'F')+(c['J']>=c['P']?'J':'P'); window.saveMbtiToServer ? window.saveMbtiToServer(m) : setMyTypeUI(m); tempTestResult=[]; }
window.saveNicknameAndNext = function() { const n=document.getElementById('inputNickname').value.trim(); if(!n){alert("닉네임을 입력해주세요!");return;} if(!window.myInfo)window.myInfo={nickname:""}; window.myInfo.nickname=n; if(window.db)window.db.collection("users").doc(localStorage.getItem('my_uid')).update({nickname:n}); goScreen('screen-mbti'); }
window.editProfileMsg = function() { if(!window.myInfo)return; document.getElementById('profileMsgInput').value=window.myInfo.msg==='상태 메시지'?'':window.myInfo.msg; document.getElementById('profileMsgOverlay').classList.add('open'); }
window.submitProfileMsg = async function() { const m=document.getElementById('profileMsgInput').value; if(window.saveProfileMsgToDB && await window.saveProfileMsgToDB(m.trim().substring(0,50))) closePopup('profileMsgOverlay'); }

// Inventory System (Cleaned)
window.openInventory = function() {
    document.getElementById('inventoryOverlay').classList.add('open');
    const allTab = document.querySelector('.inv-tab:first-child'); 
    if(allTab) {
        window.updateInventoryList('all', allTab);
    }
}

window.updateInventoryList = function(filter, tabEl) {
    if (filter) window.currentInvFilter = filter;
    
    if(tabEl) { 
        document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active')); 
        tabEl.classList.add('active'); 
    }

    const container = document.getElementById('inventoryListArea'); 
    if(!container) return;
    
    const l = window.myInfo.inventory || [];
    const def = { id: 'def', type: 'avatar', value: '👤', name: '기본' };
    
    let all = (filter === 'effect') ? l.filter(i => i.type === 'effect') : (filter === 'avatar') ? [def, ...l.filter(i => i.type === 'avatar')] : [def, ...l];
    
    let listHtml = '';
    if (all.length === 0) {
        listHtml = `<p class="list-empty-msg" style="margin-top:80px;">보관함이 비어있어요 텅~ 🗑️</p>`;
    } else {
        all.forEach(i => {
            const isEquipped = (i.type === 'avatar' && i.value === window.myInfo.avatar);
            const isActive = i.isActive;
            
            let btnLabel = '사용';
            let btnClass = 'btn-item-use';
            let btnAction = '';

            if (i.type === 'avatar') { 
                if (isEquipped) { 
                    btnLabel = '사용 중'; 
                    btnClass += ' using'; 
                } else { 
                    btnAction = `onclick="equipAvatar('${i.value}')"`; 
                } 
            } else { // effect
                if (isActive) { 
                    btnLabel = '해제'; 
                    btnClass = 'btn-item-use using'; 
                    btnAction = `onclick="toggleEffect('${i.id}')"`; 
                } else { 
                    btnAction = `onclick="toggleEffect('${i.id}')"`; 
                } 
            }
            
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

            // Using Clean CSS Classes
            listHtml += `
                <div class="list-item border-bottom-light">
                    <div class="common-circle-frame" style="background:#f8f9fa;">${i.value.startsWith('bg')?'✨':i.value}</div>
                    <div class="list-item-text">
                        <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${i.name}</div>
                        <div style="font-size:11px; ${subStyle}">${subText}</div>
                    </div>
                    <button class="${btnClass}" ${btnAction}>${btnLabel}</button>
                </div>`;
        });
    }
    container.innerHTML = listHtml;
}

window.applyActiveEffects = function() { const b=document.body; b.classList.remove(...THEME_CLASSES); if(!window.myInfo?.inventory) return; const activeEffect=window.myInfo.inventory.find(i=>i.type==='effect'&&i.isActive); if(activeEffect&&THEME_CLASSES.includes(activeEffect.value)){b.classList.add(activeEffect.value);} }
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
        try {
            document.execCommand('copy');
            if(window.showToast) window.showToast("링크가 복사되었습니다! 🔗"); else alert("링크가 복사되었습니다!");
        } catch (err) { alert("링크 복사에 실패했습니다."); }
        document.body.removeChild(textarea);
    }
};
// ui.js
// Version: v19.15.0
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

// [수정] proceedTab 함수 내 'screen-rank' 부분 변경
function proceedTab(s, n) {
    document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
    document.getElementById(s).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (n) n.classList.add('active');

    if (s === 'screen-main') {
        setTimeout(() => window.goSubTab('tab-prism', document.querySelector('.sub-tab:first-child')), 0);
    } 
    else if (s === 'screen-rank') {
        // 👇 [여기만 싹 바꿨습니다!] 
        // 입장 시 무조건 '종합 랭킹' 모드로 초기화
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

// [수정] filterRank 함수 교체
window.filterRank = function(el, type) { 
    // 1. 모든 알약(필터) 끄기
    document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active')); 
    
    // 2. 선택된 알약 켜기 (el이 있을 때만)
    if (el) el.classList.add('active'); 
    
    // 3. 현재 보고 있는 뷰(Rank vs Fandom)에 따라 다른 함수 호출
    // window.currentRankView 변수는 아래 3번에서 추가합니다.
    if (window.currentRankView === 'fandom') {
        console.log("팬덤 필터 적용:", type);
        window.renderFandomList(type); // 팬덤 리스트 다시 그리기
    } else {
        console.log("랭킹 필터 적용:", type);
        window.currentFilter = type; 
        window.renderRankList(type);   // 랭킹 리스트 다시 그리기
    }
};

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

// ==========================================
// [NEW] 랭킹 & 추종자(팬덤) 시스템 추가 로직
// ==========================================

// 현재 뷰 상태 저장 ('rank' 또는 'fandom')
window.currentRankView = 'rank'; 

// 1. 랭킹 화면 초기화 (입장 시 호출)
window.initRankScreen = function() {
    // 스위치를 '전체 랭킹'으로 강제 이동
    const radioRank = document.getElementById('tabRank');
    if(radioRank) radioRank.checked = true;
    
    // 뷰 상태 업데이트
    window.switchRankView('rank');
}

// 2. 탭 스위치 전환 (HTML의 radio input에서 onchange로 호출)
window.switchRankView = function(viewType) {
    window.currentRankView = viewType; // 상태 변경
    
    // 필터(알약) 초기화: 아무것도 선택 안 된 상태로
    document.querySelectorAll('#rankFilterContainer .stat-pill').forEach(x => x.classList.remove('active'));

    // 리스트 새로고침 (종합 기준 -1)
    if (viewType === 'fandom') {
        window.renderFandomList(-1);
    } else {
        window.renderRankList(-1);
    }
}

// [수정] ui.js 맨 아래에 있는 renderFandomList 함수 교체

window.renderFandomList = async function(filterIdx) { // async 붙음!
    const container = document.getElementById('rankListContainer'); 
    if (!container) return;
    
    // 로딩 표시
    container.innerHTML = `<div style="text-align:center; padding:50px;">
        <span style="font-size:30px;">🛰️</span><br><br>
        팬덤 신호를 수신 중입니다...
    </div>`;

    // 1. 진짜 데이터 가져오기 (Logic 호출)
    const fandomData = await window.getMyFandomData(filterIdx);

    // 2. HTML 생성
    let html = '';
    
    if (fandomData.length === 0) {
        // 데이터 없을 때 멘트
        const emptyComment = (filterIdx === -1) 
            ? "아직 팬이 없네요... 🥲<br>친구들에게 매력을 어필해보세요!" 
            : "이 능력으로는 아직<br>받은 표가 없어요!";
            
        html = `<p class="list-empty-msg" style="margin-top:50px; line-height:1.6;">${emptyComment}</p>`;
    } else {
        fandomData.forEach((fan, idx) => {
            // 순위 아이콘 (1,2,3등만 특별대우)
            let rankBadge = (idx===0)?'🥇':(idx===1)?'🥈':(idx===2)?'🥉':`${idx+1}`;
            let rankColor = (idx<3) ? '#e84393' : '#ccc'; // 핑크색 강조
            
            // 필터 여부에 따른 텍스트 (총 득표 vs 해당 득표)
            let scoreLabel = (filterIdx !== -1) ? '표 (해당)' : '표 (누적)';
            
            html += `
            <li class="list-item" onclick="window.openProfilePopup('${fan.id}')">
                <div style="font-weight:900; font-size:16px; width:30px; text-align:center; margin-right:10px; color:${rankColor}">${rankBadge}</div>
                <div class="common-circle-frame" style="margin-right:10px;">${fan.avatar}</div>
                <div class="list-item-text">
                    <div style="font-weight:bold; font-size:14px;">${fan.nickname}</div>
                    <div style="font-size:11px; color:var(--text-secondary);">${fan.mbti ? '#'+fan.mbti : ''}</div>
                </div>
                <div class="list-item-score" style="background:#fff0f6; color:#e84393; border:1px solid #ffc9c9;">
                    ${fan.voteCount}${scoreLabel}
                </div>
            </li>`;
        });
    }
    
    container.innerHTML = html;
}

// ==========================================
// [ui.js] 상점 시스템 로직 (여기부터 끝까지 복사!)
// ==========================================

// 1. 상점 데이터
const SHOP_ITEMS = [
    { id: 'ticket_1', tab: 'utility', section: '💎 토큰 충전소', type: 'item', icon: '🎫', name: '티켓 1장', price: 100, desc: '즉시 충전' },
    { id: 'ticket_5', tab: 'utility', section: '💎 토큰 충전소', type: 'item', icon: '🎫', name: '티켓 5장', price: 450, desc: '5장 묶음' },
    { id: 'name_change', tab: 'utility', section: '🏷️ 계정 관리', type: 'item', icon: '📝', name: '닉변권', price: 300, desc: '닉네임 변경' },

    { id: 'avatar_tiger', tab: 'deco', section: '🐯 동물 아바타 (영구)', type: 'avatar', icon: '🐯', name: '호랑이', price: 50 },
    { id: 'avatar_rabbit', tab: 'deco', section: '🐯 동물 아바타 (영구)', type: 'avatar', icon: '🐰', name: '토끼', price: 50 },
    { id: 'avatar_robot', tab: 'deco', section: '🤖 스페셜 아바타', type: 'avatar', icon: '🤖', name: '로봇', price: 100 },
    { id: 'avatar_alien', tab: 'deco', section: '🤖 스페셜 아바타', type: 'avatar', icon: '👽', name: '외계인', price: 100 },
    
    { id: 'bg_gold', tab: 'deco', section: '✨ 테마 아이템 (7일)', type: 'effect', icon: '✨', name: '황금 배경', price: 30 },
    { id: 'bg_dark', tab: 'deco', section: '✨ 테마 아이템 (7일)', type: 'effect', icon: '🌑', name: '다크 모드', price: 30 },
    { id: 'bg_pink', tab: 'deco', section: '✨ 테마 아이템 (7일)', type: 'effect', icon: '🌸', name: '핑크 모드', price: 30 },

    { id: 'shout', tab: 'social', section: '📢 확성기', type: 'item', icon: '📢', name: '전체 외치기', price: 50, desc: '준비 중...' },

    // 👇 type: 'gacha' 확인!
    { id: 'random_box', tab: 'gacha', section: '🎁 행운의 상자', type: 'gacha', icon: '❓', name: '랜덤 박스', price: 20, desc: '뭐가 나올까?' }
];

// 2. 탭 필터링
window.filterShop = function(category) {
    const container = document.querySelector('.shop-grid');
    if (!container) return; 

    const items = SHOP_ITEMS.filter(item => item.tab === category);
    container.innerHTML = ''; 

    if (items.length === 0) {
        container.innerHTML = `<div class="list-empty-msg" style="padding:50px;">준비 중인 상점입니다. 🧹</div>`;
        return;
    }

    const groups = {};
    items.forEach(item => {
        if (!groups[item.section]) groups[item.section] = [];
        groups[item.section].push(item);
    });

    let html = '';
    for (const [sectionTitle, groupItems] of Object.entries(groups)) {
        html += `
            <div class="shop-title" style="width:100%; margin-top:20px; margin-bottom:10px; font-weight:bold; font-size:16px; border-left:4px solid var(--primary); padding-left:10px; text-align:left;">
                ${sectionTitle}
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; width:100%; margin-bottom:20px;">
        `;
        groupItems.forEach(item => {
            html += `
            <div class="shop-item" onclick="window.tryPurchase('${item.id}')" style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:15px 5px; text-align:center;">
                <div style="font-size:30px; margin-bottom:5px;">${item.icon}</div>
                <div class="shop-item-name" style="font-size:12px; font-weight:bold;">${item.name}</div>
                <div class="shop-item-price" style="font-size:11px; color:var(--primary); font-weight:bold;">💎 ${item.price}</div>
            </div>
            `;
        });
        html += `</div>`; 
    }
    container.innerHTML = html;
}

// 3. 구매 시도
// [ui.js] window.tryPurchase 함수 수정
window.tryPurchase = function(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    // [NEW] 확성기 아이템일 경우, 메시지 입력 창을 띄웁니다.
    if (item.id === 'shout') {
        openShoutInputModal(item); // 📢 확성기 전용 함수 호출
        return; 
    }
    
    // [가챠]
    if (item.type === 'gacha') {
        runGachaSystem(item); 
        return; 
    }

    let checkVal = (item.type === 'effect') ? item.id : item.icon;
    if (window.myInfo.inventory.some(i => i.value === checkVal)) {
        alert("이미 보유한 아이템입니다!");
        return;
    }

    if (window.purchaseItem) {
        window.purchaseItem(item.price, item.type, checkVal, item.name);
    }
}

// ==========================================
// [NEW] 확성기 메시지 입력 모달 함수 추가
// ==========================================
// [ui.js] window.openShoutInputModal 함수 전체 교체
window.openShoutInputModal = function(item) {
    // 1. 돈 검사 (다시 한번)
    if (window.myInfo.tokens < item.price) {
        openCustomAlert("잔액 부족 💸", "토큰이 부족합니다!");
        return;
    }

    // 2. 메시지 입력창 UI 업데이트
    document.getElementById('shoutInputPrice').innerText = `가격: ${item.price} 💎`;
    document.getElementById('shoutInputText').value = ""; // 입력창 비우기

    // 3. '보내기' 버튼에 이벤트 연결 (이벤트 리스너 중복 방지 처리 포함)
    const btn = document.getElementById('btnShoutSubmit');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.onclick = function() {
        const message = document.getElementById('shoutInputText').value.trim();
        
        if (message.length === 0) {
            openCustomAlert("입력 오류", "보낼 메시지를 입력해주세요.");
            return;
        }

        // 4. 구매 및 DB 저장 로직 실행 (로직은 아래에)
        submitShoutMessage(item, message);
    };

    // 5. 모달 띄우기
    openPopup('shoutInputOverlay');
};

// ==========================================
// [NEW] 확성기 메시지 최종 구매 및 DB 저장 함수
// ==========================================
// [ui.js] window.submitShoutMessage 함수 전체 교체 (DB 안전성 강화)
window.submitShoutMessage = function(item, message) {
    // 1. 토큰 차감
    window.myInfo.tokens -= item.price;
    document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens;
    closePopup('shoutInputOverlay'); // 입력 모달 닫기
    
    // 2. DB 업데이트: 토큰 차감
    const updates = { tokens: window.myInfo.tokens }; 
    
    // 3. 확성기 로그 데이터 준비
    const shoutLog = {
        senderNickname: window.myInfo.nickname,
        senderAvatar: window.myInfo.avatar,
        message: message,
        // **[NEW]** firebase.firestore 대신 안전하게 Firestore에서 가져오도록 수정
        timestamp: new Date() // 임시로 클라이언트 시간 사용 (오류 회피용)
    };
    
    // 4. DB 저장 및 완료 알림
    if (window.db) {
        window.db.collection('users').doc(localStorage.getItem('my_uid')).update(updates)
            .then(() => {
                // [NEW] 📢 확성기 로그 저장 함수 호출! (async)
                window.saveShoutLog(shoutLog);
                openCustomAlert("📢 전송 완료", `메시지 "${message}"를 전체에게 보냈습니다!`);
            })
            .catch((err) => { 
                console.error(err); 
                openCustomAlert("오류", "전송에 실패했습니다."); 
            });
    } else {
        // DB 연결 실패 시에도 일단 알림은 띄웁니다.
        openCustomAlert("경고", "DB 연결에 실패하여 토큰 차감 기록이 되지 않았을 수 있습니다.");
    }
};

// [logic.js] 맨 아래에 추가된 코드 확인
// ==========================================
// 📢 확성기 메시지를 DB에 기록하는 함수
// ==========================================
window.saveShoutLog = async function(shoutLog) {
    if (!window.db) {
        console.error("DB 객체가 초기화되지 않았습니다.");
        return;
    }
    
    try {
        // [NEW] 서버 타임스탬프를 여기서 직접 정의해서 전달
        shoutLog.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        await window.db.collection('shout_log').add(shoutLog);
        console.log("📢 확성기 로그 저장 완료:", shoutLog.message);
    } catch (e) {
        console.error("📢 확성기 로그 저장 실패:", e);
    }
};

// ============================================================
// [수정] 가챠 시스템 (시스템 창 제거 -> 전용 모달 적용)
// ============================================================
window.runGachaSystem = function(item) {
    // 1. 돈 검사
    if (window.myInfo.tokens < item.price) {
        // 시스템 alert 대신 커스텀 알림 사용
        openCustomAlert("잔액 부족 💸", "토큰이 부족합니다!\n상점에서 충전해주세요.");
        return;
    }

    // 2. 구매 확인 (시스템 confirm 제거 -> 커스텀 모달 사용)
    // "확인" 버튼을 눌렀을 때 실행될 행동(Action)을 정의합니다.
    const doGacha = function() {
        // --- 여기서부터 실제 가챠 로직 ---
        
        // 로컬 차감 및 UI 갱신
        window.myInfo.tokens -= item.price;
        document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens;
        
        // 확률 굴리기
        const rand = Math.random() * 100;
        let rewardType = "token";
        let rewardVal = 10;
        let msgTitle = "";
        let msgBody = "";

        // 확률표 (0~40: 꽝, 40~90: 50토큰, 90~100: 유령)
        if (rand < 40) {
            rewardType = 'token'; rewardVal = 10; 
            msgTitle = "😭 꽝..."; 
            msgBody = "아쉽네요...\n위로금 10💎을 드립니다.";
        } else if (rand < 90) {
            rewardType = 'token'; rewardVal = 50; 
            msgTitle = "💰 축하합니다!"; 
            msgBody = "본전 뽑았다!\n토큰 50💎 획득!";
        } else {
            if (window.myInfo.inventory.some(i => i.value === '👻')) {
                rewardType = 'token'; rewardVal = 500; 
                msgTitle = "👻 [전설] 중복";
                msgBody = "이미 유령이 있네요!\n대신 500토큰을 드립니다!";
            } else {
                rewardType = 'avatar'; rewardVal = '👻'; 
                msgTitle = "👻 대박 사건!!";
                msgBody = "[전설] 유령 아바타 당첨!!\n지금 바로 장착해보세요.";
            }
        }

        // DB 업데이트 준비
        const updates = { tokens: window.myInfo.tokens }; 

        if (rewardType === 'token') {
            updates.tokens += rewardVal; 
            window.myInfo.tokens += rewardVal; 
            document.getElementById('shopTokenDisplay').innerText = window.myInfo.tokens; 
        } else if (rewardType === 'avatar') {
            const newItem = { type: 'avatar', value: rewardVal, name: '유령 아바타', date: new Date() };
            window.myInfo.inventory.push(newItem);
            updates.inventory = window.myInfo.inventory;
        }

        // DB 저장 실행
        if (window.db) {
            window.db.collection('users').doc(localStorage.getItem('my_uid')).update(updates)
                .then(() => { 
                    // 3. 결과 알림 (시스템 alert 제거 -> 커스텀 알림)
                    openCustomAlert(msgTitle, msgBody);
                })
                .catch((err) => { 
                    console.error(err); 
                    openCustomAlert("오류", "저장에 실패했습니다."); 
                });
        }
    };

    // 커스텀 확인창 띄우기 (제목, 내용, 확인시 실행할 함수)
    openCustomConfirm(
        "🎁 랜덤 박스", 
        `${item.name}를 구매하시겠습니까?\n(가격: ${item.price} 💎)`, 
        doGacha
    );
}

// ============================================================
// [NEW] 모달 팝업 도우미 함수 (다른 곳에서도 쓰세요!)
// ============================================================

// 1. 확인/취소 팝업 띄우기
window.openCustomConfirm = function(title, msg, yesCallback) {
    const overlay = document.getElementById('customConfirmOverlay');
    if(!overlay) return;

    // 제목과 내용 채우기
    document.getElementById('customConfirmTitle').innerText = title;
    document.getElementById('customConfirmMsg').innerText = msg;

    // '확인' 버튼에 기능 연결 (기존 이벤트 제거 후 새거 연결)
    const btn = document.getElementById('btnCustomConfirmAction');
    // 복제해서 기존 리스너 날리기 (가장 쉬운 방법)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.onclick = function() {
        overlay.classList.remove('open'); // 팝업 닫기
        if(yesCallback) yesCallback();    // 콜백 실행
    };

    overlay.classList.add('open'); // 팝업 열기
}

// 2. 팝업 닫기 (취소 버튼용)
window.closeCustomConfirm = function() {
    document.getElementById('customConfirmOverlay').classList.remove('open');
}

// 3. 단순 알림 팝업 띄우기 (Alert 대체)
window.openCustomAlert = function(title, msg) {
    const overlay = document.getElementById('customAlertOverlay');
    if(!overlay) return;

    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMsg').innerText = msg;

    // 확인 버튼 누르면 닫기
    const btn = document.getElementById('btnCustomAlertOk');
    btn.onclick = function() {
        overlay.classList.remove('open');
    };

    overlay.classList.add('open');
}

// [ui.js] 맨 아래에 추가
// ==========================================
// 🔔 확성기 알림 표시 (Toast UI)
// ==========================================
window.showShoutNotification = function(data) {
    // 1. 알림창 HTML 동적 생성
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
        background: rgba(0, 0, 0, 0.85); color: white; padding: 12px 20px;
        border-radius: 50px; z-index: 9999; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-size: 14px; white-space: nowrap; max-width: 90%;
    `;
    
    // 내용 채우기 (아바타 + 닉네임 + 메시지)
    toast.innerHTML = `
        <span style="font-size:18px;">${data.senderAvatar || '📢'}</span>
        <span style="font-weight:bold; color:#a29bfe;">${data.senderNickname}</span>
        <span style="opacity:0.9;">: ${data.message}</span>
    `;

    document.body.appendChild(toast);

    // 2. 애니메이션: 위에서 아래로 쑥!
    setTimeout(() => {
        toast.style.transform = "translateX(-50%) translateY(0)"; // 등장
    }, 100);

    // 3. 5초 뒤에 사라지기
    setTimeout(() => {
        toast.style.transform = "translateX(-50%) translateY(-100px)"; // 퇴장
        setTimeout(() => { document.body.removeChild(toast); }, 500); // 삭제
    }, 5000);
};


// [ui.js] 파일 맨 끝에 붙여넣기 (누락된 팝업 도우미 함수들)
// ==========================================

// 1. 팝업 열기 (ID로 찾아서 open 클래스 추가)
window.openPopup = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('open');
    } else {
        console.error(`❌ 팝업을 찾을 수 없습니다: ${id}`);
    }
};

// 2. 팝업 닫기 (ID로 찾아서 open 클래스 제거)
window.closePopup = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('open');
    }
};
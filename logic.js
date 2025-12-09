// logic.js (Full Code: Patch v11.2 - Visual Hierarchy & Bug Fix)

// ========================================
// 1. Firebase 설정
// ========================================
window.firebaseConfig = { 
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

window.db = null; window.FieldValue = null;
function updateStatus(msg, type='wait') {
    const el = document.getElementById('dbStatus');
    if(el) { el.innerText = msg; el.className = 'db-status'; if(type==='error')el.classList.add('error'); if(type==='ok')el.classList.add('on'); if(type==='error') el.onclick=()=>window.location.reload(); }
    console.log(`[System] ${msg}`);
}
function initFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        window.db = firebase.firestore(); window.FieldValue = firebase.firestore.FieldValue; return true;
    } return false;
}

window.ACHIEVEMENTS_MASTER_DATA = [
    { id: 'ach_01', icon: '👶', title: '응애 나 아기 유저', desc: '가입을 환영합니다!', type: 'System', condition_key: 'login_count', condition_value: 1, reward: 10 },
    { id: 'ach_02', icon: '👋', title: '똑똑, 누구 없소?', desc: '첫 번째 그룹 생성.', type: 'Group', condition_key: 'group_count', condition_value: 1, reward: 30 },
    { id: 'ach_03', icon: '🗳️', title: '소중한 한 표', desc: '첫 투표 참여.', type: 'Vote', condition_key: 'vote_count', condition_value: 1, reward: 10 },
    { id: 'ach_04', icon: '🔥', title: '불타는 투표권', desc: '티켓 소진.', type: 'System', condition_key: 'tickets', condition_value: 0, reward: 20 },
    { id: 'ach_05', icon: '💎', title: '육각형 인간', desc: '평균 50점 이상.', type: 'Stat', condition_key: 'stats_average', condition_value: 50, reward: 100 },
    { id: 'ach_06', icon: '🎤', title: '확신의 센터상', desc: '랭킹 1위.', type: 'Stat', condition_key: 'rank', condition_value: 1, reward: 150 },
    { id: 'ach_07', icon: '🤪', title: '이 구역의 미친X', desc: '[광기] 압도적.', type: 'Stat', condition_key: 'stats_mania_ratio', condition_value: 2, reward: 50 },
    { id: 'ach_08', icon: '🧊', title: '시베리아 벌판', desc: '[멘탈] 80점 이상.', type: 'Stat', condition_key: 'stats_mentality', condition_value: 80, reward: 40 },
    { id: 'ach_09', icon: '💬', title: '투머치 토커', desc: '코멘트 10개 이상.', type: 'Comment', condition_key: 'comment_count', condition_value: 10, reward: 20 },
    { id: 'ach_10', icon: '💰', title: '자본주의의 맛', desc: '아이템 구매.', type: 'Shop', condition_key: 'purchase_count', condition_value: 1, reward: 10 }
];

window.questions=[]; window.candidates=[]; window.tournamentRound=[]; window.nextRound=[];
window.currentQ=null; window.currentFilter=-1; window.isVoting=false; window.isGamePaid=false; window.currentRoundMax=0;
window.myInfo={tickets:5,lastTicketDate:"",msg:"",tokens:0,avatar:"🦊",nickname:"",achievedIds:[],stats:[50,50,50,50,50,50]};
window.achievementsList=[]; window.achievedDateMap={};
const STAT_MAP = ['지성', '센스', '멘탈', '인성', '텐션', '광기']; 

function getUserId() { let uid=localStorage.getItem('my_uid'); if(!uid){uid='user_'+Math.random().toString(36).substr(2,9);localStorage.setItem('my_uid',uid);} return uid; }

window.initGame = async function() {
    updateStatus("● SDK 확인 중...");
    if (!initFirebase()) { updateStatus("● SDK 로드 실패", 'error'); return; }
    updateStatus("● DB 연결됨...");
    try {
        const db = window.db;
        try {
            const batch = db.batch();
            window.ACHIEVEMENTS_MASTER_DATA.forEach(ach => batch.set(db.collection("achievements").doc(ach.id), ach));
            await batch.commit().catch(()=>{});
            const achSnap = await db.collection("achievements").get();
            window.achievementsList=[]; achSnap.forEach(d=>window.achievementsList.push(d.data()));
        } catch(e) { window.achievementsList = window.ACHIEVEMENTS_MASTER_DATA; }
        
        updateStatus("● 데이터 로드..");
        const qSnap = await db.collection("questions").get(); window.questions=[]; qSnap.forEach(d=>window.questions.push(d.data()));
        const uSnap = await db.collection("users").get(); window.candidates=[]; uSnap.forEach(d=>{let u=d.data(); u.id=d.id; u.stats=u.stats||[50,50,50,50,50,50]; if(u.id!==getUserId()&&u.nickname) window.candidates.push(u);});

        await window.checkAndResetTickets(); 
        const myUid = getUserId();
        const myDoc = await db.collection("users").doc(myUid).get().catch(()=>null);
        if (myDoc && myDoc.exists) {
            const d = myDoc.data();
            await loadAchievementDates(myUid);
            checkAchievements(d, d.achievedIds);
        }
        
        updateStatus("● 렌더링..");
        if (window.myInfo.mbti && document.getElementById('screen-login').classList.contains('active')) {
             if(typeof window.setMyTypeUI === 'function') window.setMyTypeUI(window.myInfo.mbti);
        } else if (window.candidates.length >= 2) {
            if (typeof window.renderRankList === 'function') window.renderRankList(window.currentFilter);
        }
        if (typeof window.updateProfileUI === 'function') window.updateProfileUI(); 
        updateStatus("● DB OK", 'ok');
    } catch (e) { console.error("Init Error:", e); updateStatus("● 로딩 실패", 'error'); }
};
window.loadDataFromServer = function() { window.initGame(); }

window.checkAndResetTickets = async function() {
    const uid = getUserId(); if(!window.db) return;
    try {
        const doc = await window.db.collection("users").doc(uid).get();
        if(doc.exists) {
            const d = doc.data(); window.myInfo={...window.myInfo,...d};
            const today = new Date().toLocaleDateString();
            if(d.lastTicketDate !== today) {
                window.myInfo.tickets=5; window.myInfo.lastTicketDate=today;
                window.db.collection("users").doc(uid).update({tickets:5, lastTicketDate:today});
            }
        } else { window.db.collection("users").doc(uid).set(window.myInfo); }
    } catch(e) {}
    if(typeof window.updateTicketUI === 'function') window.updateTicketUI();
}

window.refillTickets = function() {
    if(!window.myInfo) return;
    window.myInfo.tickets = 5;
    if(window.db) window.db.collection("users").doc(getUserId()).update({ tickets: 5 });
    if(typeof window.updateTicketUI === 'function') window.updateTicketUI();
    // [🔥 v11.2] 티켓 충전 시 빈 화면 방지
    if (document.getElementById('screen-vote').classList.contains('active')) {
        const noTicketMsg = document.getElementById('noTicketMsg');
        if (noTicketMsg) { noTicketMsg.remove(); window.startTournament(); }
    }
    alert("티켓이 충전되었습니다! (5장)");
}

async function checkAchievements(userStats, dbIds = []) {
    if (!window.db) return []; 
    const uid = getUserId();
    if (!window.myInfo.achievedIds) window.myInfo.achievedIds = [];
    const currentSet = new Set([...window.myInfo.achievedIds, ...dbIds]);
    window.myInfo.achievedIds = Array.from(currentSet);
    const newly = [];

    window.achievementsList.forEach(ach => {
        if (currentSet.has(ach.id)) return;
        let ok = false;
        const k = ach.condition_key, v = ach.condition_value;
        if (userStats[k] !== undefined && userStats[k] >= v) ok = true;
        if (k === 'stats_average' && (userStats.stats.reduce((a,b)=>a+b,0)/6 >= v)) ok = true;
        if (k === 'stats_mentality' && userStats.stats[2] >= v) ok = true;
        
        if (ok) {
            newly.push(ach.id); currentSet.add(ach.id);
            window.myInfo.tokens += ach.reward;
            window.db.collection("logs").add({
                target_uid: uid, sender_uid: 'system', action_type: 'ACHIEVE', stat_type: -1, 
                score_change: ach.reward, message: `업적 [${ach.title}]을(를) 달성했습니다.`, 
                ach_id: ach.id, is_read: false, timestamp: window.FieldValue.serverTimestamp() 
            });
        }
    });

    if (newly.length > 0) {
        await window.db.collection("users").doc(uid).update({ achievedIds: window.FieldValue.arrayUnion(...newly), tokens: window.myInfo.tokens });
        const today = new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\./g,'').replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3').slice(0,10);
        newly.forEach(id => window.achievedDateMap[id] = today);
        if (typeof window.renderAchievementsList === 'function') window.renderAchievementsList(window.myInfo.achievedIds);
    }
}

async function loadAchievementDates(uid) {
    if (!window.db) return;
    try {
        const snap = await window.db.collection("logs").where("target_uid", "==", uid).where("action_type", "==", "ACHIEVE").get();
        window.achievedDateMap = {};
        snap.forEach(d => {
            const l = d.data();
            if(l.ach_id && l.timestamp) window.achievedDateMap[l.ach_id] = l.timestamp.toDate().toLocaleDateString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\./g,'').replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3').slice(0,10);
        });
    } catch(e) {}
}

window.sendCommentToDB = function(targetUid, text) {
    if(!window.db) return;
    const senderName = window.myInfo.nickname || '익명';
    const fullMsg = `${senderName}: ${text}`;
    window.db.collection("logs").add({
        target_uid: targetUid, sender_uid: getUserId(), action_type: 'COMMENT', stat_type: -1, score_change: 0,
        message: fullMsg, is_read: false, timestamp: window.FieldValue.serverTimestamp()
    });
    window.db.collection("users").doc(targetUid).update({ comment_count: window.FieldValue.increment(1) });
    alert("한줄평이 전송되었습니다! 💌");
}

window.filterRank = function(el, t) {
    document.querySelectorAll('.stat-pill').forEach(p=>p.classList.remove('active')); el.classList.add('active');
    window.currentFilter = t; if(window.renderRankList) window.renderRankList(t);
}
window.renderRankList = function(filter) {
    const c = document.getElementById('rankListContainer'); if(!c) return; c.innerHTML = '';
    let d = window.candidates.map(u => ({...u, s: filter===-1?u.stats.reduce((a,b)=>a+b,0):u.stats[filter]}));
    d.sort((a,b)=>b.s - a.s);
    d.forEach((u,i) => {
        const li = document.createElement('li'); li.className = 'list-item';
        let sc = filter===-1 ? `${u.s}점` : `${u.s}점`;
        let rc = i===0?'#ffc107':(i===1?'#adb5bd':(i===2?'#cd7f32':'#636e72'));
        let rt = i<3?`🥇🥈🥉`.charAt(i):i+1;
        li.onclick = () => window.openSheet(u.avatar||'❓', u.nickname, `<p style="text-align:center;">"${u.desc||''}"</p><h3>📊 스탯</h3><ul style="padding-left:20px;">${u.stats.map((s,x)=>`<li>${STAT_MAP[x]}: ${s}</li>`).join('')}</ul>`, `MBTI: #${u.mbti}`);
        li.innerHTML = `<div class="list-item-icon-area" style="width:30px;font-size:18px;color:${rc};font-weight:bold;">${rt}</div><div class="list-item-icon-area"><div class="rank-avatar">${u.avatar}</div></div><div class="list-item-text"><div class="history-title">${u.nickname}</div><div class="history-date">#${u.mbti}</div></div><div class="list-item-score" style="background:none;color:#2d3436;">${sc}</div>`;
        c.appendChild(li);
    });
}

window.renderHistoryList = async function() {
    const c = document.getElementById('tab-history').querySelector('.list-wrap'); if(!c || !window.db) return; c.innerHTML = '';
    try {
        const snap = await window.db.collection("logs").where("target_uid", "==", getUserId()).orderBy("timestamp", "desc").limit(30).get();
        if (snap.empty) { c.innerHTML = `<li style="text-align:center;padding:30px;">기록 없음</li>`; return; }
        const seen = new Set();
        snap.forEach(doc => {
            const l = doc.data();
            const k = l.ach_id ? `ach_${l.ach_id}` : `msg_${l.message}_${l.timestamp?.seconds}`;
            if(seen.has(k)) return; seen.add(k);

            const li = document.createElement('li'); li.className = 'list-item';
            let icon, lT, sT, sM, sc='', ss='', date=l.timestamp?l.timestamp.toDate().toLocaleDateString('ko-KR').slice(0,11):'방금';

            // [🔥 v11.2] 팝업 내용 뒤집기 (제목 <-> 내용)
            if (l.action_type === 'VOTE') {
                icon = '📈'; 
                lT = l.message; // 리스트용
                sT = "스탯 점수 획득!"; // 팝업 제목 (고정)
                sM = l.message;      // 팝업 박스 내용
                sc = `+${l.score_change}점`; ss = 'score-red';
            } else if (l.action_type === 'ACHIEVE') {
                icon = '🎁'; const m = l.message.match(/\[(.*?)\]/); 
                const achName = m ? m[1] : '업적';
                lT = `업적 [${achName}] 달성!`; 
                sT = achName; // 팝업 제목 = 업적 이름
                sM = l.message; // 팝업 박스 내용 = 설명
                sc = `+${l.score_change}💎`; ss = 'score-gold';
            } else if (l.action_type === 'PURCHASE') {
                icon = '🛍️'; lT = '아이템 구매'; sT = "구매 완료"; sM = l.message; sc = `${l.score_change}💎`; ss = 'score-blue';
            } else if (l.action_type === 'COMMENT') {
                icon = '💬'; const parts = l.message.split(': ');
                const name = parts[0]; const content = parts.slice(1).join(': ');
                lT = `${name} "${content}"`;
                sT = `${name}님의 한마디`; // 팝업 제목
                sM = `"${content}"`;       // 팝업 박스 내용
                sc = 'New'; ss = 'score-gray';
            } else { icon = '📋'; lT = '알림'; sT = '알림'; sM = l.message; }

            li.onclick = () => {
                document.querySelector('.bottom-sheet').innerHTML = `
                    <div class="sheet-content">
                        <div class="sheet-icon">${icon}</div>
                        <div class="sheet-title">${sT}</div>
                        <div class="sheet-message-box">${sM}</div>
                        <div class="sheet-meta-row">
                            <span>${date}</span>
                            ${sc ? `<span class="info-badge" style="${ss ? ss.replace('background', 'background') : ''}">${sc}</span>` : ''}
                        </div>
                        <button class="btn btn-primary" onclick="closeSheet()">확인</button>
                    </div>`;
                document.getElementById('bottomSheetOverlay').classList.add('open');
            };
            li.innerHTML = `<div class="list-item-icon-area"><div style="font-size:24px;background:#f0f3ff;width:40px;height:40px;display:flex;justify-content:center;align-items:center;border-radius:50%;">${icon}</div></div><div class="list-item-text"><div class="history-title">${lT}</div><div class="history-date">${date}</div></div><div class="list-item-score ${ss}">${sc}</div>`;
            c.appendChild(li);
        });
    } catch(e) { console.error(e); }
}

window.renderAchievementsList = async function(ids) {
    const c = document.querySelector('.achieve-grid'); if(!c) return; c.innerHTML = '';
    const myIds = ids || window.myInfo.achievedIds || [];
    window.achievementsList.forEach(ach => {
        const u = myIds.includes(ach.id), el = document.createElement('div');
        el.className = `achieve-item ${u?'':'locked'}`;
        const d = window.achievedDateMap[ach.id];
        
        el.onclick = () => {
            const dateStr = u ? (d || '달성 완료') : '-';
            const rewardBadge = `<span class="info-badge score-gold">+${ach.reward}💎</span>`;
            
            document.querySelector('.bottom-sheet').innerHTML = `
                <div class="sheet-content">
                    <div class="sheet-icon">${ach.icon}</div>
                    <div class="sheet-title">${ach.title}</div>
                    <div class="sheet-message-box">${ach.desc}</div>
                    <div class="sheet-meta-row">
                        <span>${dateStr}</span>
                        ${rewardBadge}
                    </div>
                    <button class="btn btn-primary" onclick="closeSheet()">확인</button>
                </div>`;
            document.getElementById('bottomSheetOverlay').classList.add('open');
        };
        el.innerHTML = `<div class="achieve-icon">${ach.icon}</div><div class="achieve-title">${ach.title}</div>`;
        c.appendChild(el);
    });
}

// ========================================
// 7. 차트 & 토너먼트
// ========================================
window.drawChart = function() {
    const ctx = document.getElementById('myRadarChart'); if (!ctx) return;
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, { type: 'radar', data: { labels: STAT_MAP, datasets: [{ label: '나의 스탯', data: window.myInfo.stats, fill: true, backgroundColor: 'rgba(108, 92, 231, 0.2)', borderColor: 'rgb(108, 92, 231)', pointBackgroundColor: 'rgb(108, 92, 231)', pointBorderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: '#dfe6e9' }, grid: { color: '#dfe6e9' }, pointLabels: { color: '#636e72', font: { size: 14, weight: 'bold' } }, suggestedMin: 0, suggestedMax: 100, ticks: { display: false, stepSize: 25 } } }, plugins: { legend: { display: false } } } });
};

window.startTournament = function() {
    if (window.myInfo.tickets <= 0) { if(window.disableVoteScreen) window.disableVoteScreen(); return; }
    if (window.candidates.length < 2) { alert("후보 부족"); return; }
    window.isGamePaid = false;
    if(document.getElementById('noTicketMsg')) document.getElementById('noTicketMsg').remove();
    document.getElementById('winnerContainer').style.display='none';
    
    // [🔥 v11.2] 강제 표시
    const vw = document.getElementById('voteWrapper'); if(vw) vw.style.display='flex';
    const vs = document.getElementById('vsContainer'); if(vs) vs.style.display='flex';
    
    document.getElementById('passBtn').style.display='block';
    if(document.getElementById('roundBadge')) document.getElementById('roundBadge').style.display='inline-block';
    if(window.questions.length > 0) {
        window.currentQ = window.questions[Math.floor(Math.random() * window.questions.length)];
        if(document.getElementById('voteTitle')) document.getElementById('voteTitle').innerText = window.currentQ.text;
    }
    window.tournamentRound = [...window.candidates].sort(()=>Math.random()-0.5).slice(0,8);
    if(window.tournamentRound.length > 4) window.tournamentRound = window.tournamentRound.slice(0,4);
    else if(window.tournamentRound.length > 2) window.tournamentRound = window.tournamentRound.slice(0,2);
    window.nextRound = []; window.currentRoundMax = window.tournamentRound.length;
    updateRoundTitle(); showMatch();
}

function updateRoundTitle() {
    const b = document.getElementById('roundBadge');
    if(b && window.currentRoundMax) {
        const t = window.currentRoundMax / 2, c = (window.currentRoundMax - window.tournamentRound.length) / 2 + 1;
        b.innerText = window.currentRoundMax===2 ? "👑 결승전" : `🏆 ${window.currentRoundMax}강전 (${c}/${t})`;
    }
}

function showMatch() {
    if(window.tournamentRound.length < 2) {
        if(window.nextRound.length === 1) { showWinner(window.nextRound[0]); return; }
        window.tournamentRound = window.nextRound; window.nextRound = [];
        window.tournamentRound.sort(()=>Math.random()-0.5); window.currentRoundMax = window.tournamentRound.length;
        updateRoundTitle(); fireRoundEffect(window.currentRoundMax);
    }
    if(window.tournamentRound.length < 2) return;
    updateRoundTitle(); updateCard('A', window.tournamentRound[0]); updateCard('B', window.tournamentRound[1]);
}

function fireRoundEffect(round) {
    const b = document.getElementById('roundBadge');
    if(b) { b.classList.remove('pulse-anim'); void b.offsetWidth; b.classList.add('pulse-anim'); }
    if(typeof confetti==='function') confetti({ particleCount: 100, spread: 80, origin: { y: 0.2 }, colors: round===2?['#ffd700','#ffa500']:['#6c5ce7','#00b894'], disableForReducedMotion: true });
}

function updateCard(pos, u) { if(!u) return; document.getElementById('name'+pos).innerText = u.nickname; document.getElementById('desc'+pos).innerText = u.desc||''; document.getElementById('avatar'+pos).innerText = u.avatar; }

window.vote = function(idx) {
    if(window.isVoting) return;
    if(!window.tournamentRound || window.tournamentRound.length < 2) return;
    if(!window.isGamePaid && window.myInfo.tickets <= 0) { alert("티켓 소진"); return; }
    window.isVoting = true;
    if(!window.isGamePaid) {
        window.myInfo.tickets = Math.max(0, window.myInfo.tickets - 1); window.isGamePaid = true;
        if(window.db) window.db.collection("users").doc(getUserId()).update({ tickets: window.FieldValue.increment(-1) });
    }
    window.myInfo.tokens += 10;
    if(window.db) window.db.collection("users").doc(getUserId()).update({ vote_count: window.FieldValue.increment(1), tokens: window.FieldValue.increment(10) });
    const w = idx===0 ? window.tournamentRound.shift() : (window.tournamentRound.splice(0,1), window.tournamentRound.shift());
    window.tournamentRound.shift(); window.nextRound.push(w);
    if(window.updateTicketUI) window.updateTicketUI();
    if(window.updateProfileUI) window.updateProfileUI();
    showMatch(); setTimeout(()=>window.isVoting=false, 500);
}

function showWinner(w) {
    saveScore(w, 20);
    (async () => {
        const uid = getUserId();
        if(window.db) {
            const myDoc = await window.db.collection("users").doc(uid).get();
            if(myDoc.exists) checkAchievements(myDoc.data(), myDoc.data().achievedIds);
            const sender = window.myInfo.nickname || '익명';
            const stat = STAT_MAP[window.currentQ?.type||0];
            window.db.collection("logs").add({
                target_uid: w.id, sender_uid: uid, action_type: 'VOTE', stat_type: window.currentQ?.type||0, score_change: 20,
                message: `[${stat}] ${sender}님의 투표!`, is_read: false, timestamp: window.FieldValue.serverTimestamp()
            });
        }
    })();
    
    document.getElementById('vsContainer').style.display='none'; document.getElementById('passBtn').style.display='none';
    if(document.getElementById('roundBadge')) document.getElementById('roundBadge').style.display='none';
    document.getElementById('winnerContainer').style.display='flex';
    document.getElementById('winnerName').innerText = w.nickname;
    document.getElementById('winnerAvatar').innerText = w.avatar;
    
    const winnerBox = document.querySelector('.winner-box');
    const oldBtns = winnerBox.querySelectorAll('.btn-action'); oldBtns.forEach(btn => btn.remove());
    const btnContainer = document.createElement('div'); btnContainer.className = 'btn-action'; btnContainer.style.marginTop = '20px'; btnContainer.style.width = '100%';
    
    const commentBtn = document.createElement('button'); commentBtn.className = 'btn btn-outline'; commentBtn.innerText = "💬 한줄평 남기기"; commentBtn.onclick = () => window.openCommentPopup(w.id, w.nickname);
    btnContainer.appendChild(commentBtn);
    
    const nextBtn = document.createElement('button'); nextBtn.className = 'btn btn-primary';
    if (window.myInfo.tickets <= 0) {
        document.getElementById('winnerText').innerHTML = `점수 전달 완료!<br><span style="color:#e74c3c;font-weight:bold;">🎫 티켓 소진!</span>`;
        nextBtn.innerText = "메인으로 돌아가기";
        // [🔥 v11.2] 메인으로 갈 때만 disableVoteScreen 실행
        nextBtn.onclick = () => { if(window.disableVoteScreen) window.disableVoteScreen(); window.goTab('screen-main', document.querySelector('.nav-item')); };
    } else {
        document.getElementById('winnerText').innerText = "이 친구에게 점수가 전달되었습니다.";
        nextBtn.innerText = "다음 토너먼트 시작하기";
        nextBtn.onclick = window.startTournament;
    }
    btnContainer.appendChild(nextBtn);
    winnerBox.appendChild(btnContainer);
    if(typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

async function saveScore(w, score) {
    w.stats[window.currentQ?.type||0] = Math.min(100, w.stats[window.currentQ?.type||0] + score);
    const idx = window.candidates.findIndex(c=>c.id===w.id);
    if(idx!==-1) window.candidates[idx].stats = w.stats;
    if(window.renderRankList) window.renderRankList(window.currentFilter);
    if(window.db) {
        window.db.collection("users").doc(w.id).collection("received_votes").add({ stat_type: window.currentQ?.type||0, score_change: score, timestamp: window.FieldValue.serverTimestamp() });
        window.db.collection("users").doc(w.id).update({ stats: w.stats });
    }
}
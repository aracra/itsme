// ui.js
// Version: v19.16.7 (Clean & Fixed)

// 1. 공통 유틸리티 & 설정
const THEME_CLASSES = ['bg-gold', 'bg-dark', 'bg-pink']; 

window.updateStatus = function(msg, type = 'wait') {
    const el = document.getElementById('dbStatus');
    if (el) {
        el.innerText = msg;
        el.classList.remove('on', 'error');
        if (type === 'ok') el.classList.add('on');
        if (type === 'error') { el.classList.add('error'); el.onclick = () => location.reload(); }
    }
    console.log(`[Sys] ${msg}`);
};

window.toggleDevMenu = function() {
    const el = document.getElementById('devMenuExpanded');
    if (el) el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
};

// 2. 메인 UI 업데이트 (내 정보, 티켓 등)
// [ui.js] 내 정보 화면 갱신 (거울 탭)
window.updateMyInfoUI = function() {
    const info = window.myInfo;
    if (!info) return;

    // 1. 텍스트 정보 갱신
    setText('myNickname', info.nickname);
    setText('myMbti', info.mbti ? `#${info.mbti}` : '#???');
    setText('myAvatar', info.avatar || '👤');
    setText('mainMsg', info.statusMsg || "상태 메시지를 입력해주세요."); // 상태메시지 추가

    // 2. 상위 % 뱃지 (가짜 데이터지만 동기부여용)
    const totalStats = Object.values(info.stats || {}).reduce((a,b)=>a+b, 0);
    const percent = Math.max(1, 100 - Math.floor(totalStats / 10)); // 대충 계산
    const badge = document.querySelector('.header-badge');
    if(badge) badge.innerText = `👑 상위 ${percent}% (종합)`;

    // 3. 차트 그리기 (★ 현재 거울 탭이 활성화된 경우에만!)
    const mirrorScreen = document.getElementById('screen-main');
    if (mirrorScreen && mirrorScreen.classList.contains('active')) {
        setTimeout(window.drawChart, 100); // 0.1초 뒤 실행 (안전빵)
    }
};

// (유틸) 텍스트 안전하게 넣기
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}

window.updateTicketUI = function() {
    const count = (window.myInfo && window.myInfo.tickets !== undefined) ? window.myInfo.tickets : 0;
    
    const badge = document.getElementById('ticketDisplay');
    if (badge) badge.innerText = `🎫 남은 티켓: ${count}/5`;
    
    const floatBadge = document.getElementById('ticketCountNum');
    if (floatBadge) floatBadge.innerText = count;
};

// 3. 화면 네비게이션
// [ui.js] 탭 전환 함수 (모달 경고판 적용)
window.goTab = function(screenId, navElement) {
    // 1. 게임 중인지 체크 (투표 화면이 아닌 곳으로 갈 때)
    if (window.isGameRunning && screenId !== 'screen-vote') {
        
        // (1) 모달 띄우기 전, "어디로 가려고 했는지" 저장해둠
        window.pendingTabId = screenId;
        window.pendingNav = navElement; // (선택사항: 네비게이션 하이라이트 처리를 위해)

        // (2) 모달 열기
        const overlay = document.getElementById('gameExitOverlay');
        const exitBtn = document.getElementById('btnForceExit');
        
        if (overlay && exitBtn) {
            // "나가기" 버튼 클릭 시 동작 정의
            exitBtn.onclick = function() {
                // 게임 강제 종료 처리
                window.isGameRunning = false;
                window.tournamentRound = [];
                
                // 투표 화면 초기화 (다시 들어오면 대기화면 뜨게)
                const intro = document.getElementById('voteIntro');
                const wrapper = document.getElementById('voteWrapper');
                const winner = document.getElementById('winnerContainer');
                if(intro) intro.style.display = 'flex';
                if(wrapper) wrapper.style.display = 'none';
                if(winner) winner.style.display = 'none';

                console.log("🏳️ 게임 기권 (사용자 이탈)");
                window.closePopup('gameExitOverlay');

                // ★ 저장해뒀던 목적지로 이동 재개!
                window.goTab(window.pendingTabId, window.pendingNav);
            };
            
            window.openPopup('gameExitOverlay');
            return; // 여기서 함수 중단 (이동 막음)
        }
    }
    // 1. 모든 화면 숨기기
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    // 2. 선택된 화면 보여주기
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }

    // 3. 하단 메뉴 활성화 표시 (CSS class)
    if (navElement) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        navElement.classList.add('active');
    }

    // 4. 화면별 데이터 새로고침 (Refresh Logic)
	// 1. 🪞 거울 (메인) 화면
    if (screenId === 'screen-main') {
        // 차트가 찌그러지지 않게 0.2초 뒤에 그리기
        if (window.drawChart) setTimeout(window.drawChart, 200);
        // 내 정보 텍스트도 갱신
        if (window.updateMyInfoUI) window.updateMyInfoUI();
    } 
    
    // 2. 🏆 랭킹 화면
    else if (screenId === 'screen-rank') {
        // 'refreshRank' 대신 'renderRankList'를 직접 호출!
        if (window.renderRankList) window.renderRankList();
    } 
    
    // 3. 🛍️ 상점 화면
    else if (screenId === 'screen-shop') {
        if (window.renderShop) window.renderShop();
    } 
    
    // 4. 📢 광장 화면
    else if (screenId === 'screen-square') {
        if (window.refreshSquare) window.refreshSquare();
    }
    
    // 5. ⚙️ 설정 화면 (필요하다면)
    else if (screenId === 'screen-settings') {
        // 설정 화면 들어갈 때 할 일이 있으면 여기에
        if (window.updateMyInfoUI) window.updateMyInfoUI();
    }
};

window.goSubTab = function(contentId, tabEl) {
    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
    document.getElementById(contentId).classList.add('active');
    
    if (tabEl && tabEl.parentNode) {
        Array.from(tabEl.parentNode.children).forEach(c => c.classList.remove('active'));
        tabEl.classList.add('active');
    }

    if (contentId === 'tab-prism' && window.drawChart) setTimeout(window.drawChart, 50);
    else if (contentId === 'tab-history' && window.renderHistoryList) window.renderHistoryList();
    else if (contentId === 'tab-trophy' && window.renderAchievementsList) window.renderAchievementsList();
};

window.goScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
};

// 4. 로그인 및 설정 관련 함수 (★ 여기가 에러 나던 부분!)
window.logout = function() { 
    if(confirm("로그아웃 하시겠습니까?")) {
        localStorage.clear(); 
        location.reload(); 
    }
};

window.loginWithServer = function() { 
    window.goScreen('screen-nickname'); 
};

window.debugLogin = function(uid) { 
    if (!uid) return; 
    localStorage.setItem('my_uid', uid); 
    location.reload(); 
};

// 5. 토너먼트 & 투표 화면
window.prepareVoteScreen = function() {
    if (!window.candidates || window.candidates.length < 2) {
        alert("⚠️ 후보 데이터가 부족합니다 (최소 2명).\n개발자 메뉴에서 [NPC 생성]을 먼저 해주세요!");
        window.goTab('screen-rank', document.querySelectorAll('.nav-item')[2]);
        return;
    }
    
    window.isGameRunning = false;
    document.getElementById('voteIntro').style.display = 'flex';
    document.getElementById('voteWrapper').style.display = 'none';
    document.getElementById('winnerContainer').style.display = 'none';
    window.updateTicketUI();
};

window.initVoteScreenUI = function(title) {
    const titleEl = document.getElementById('voteTitle');
    if(titleEl) { titleEl.innerText = title; titleEl.style.display = 'block'; }
    document.getElementById('voteIntro').style.display = 'none';
    document.getElementById('voteWrapper').style.display = 'flex';
    document.getElementById('roundBadge').style.display = 'inline-block';
};

window.updateVsCardUI = function(c1, c2) {
    document.getElementById('nameA').innerText = c1.nickname;
    document.getElementById('avatarA').innerText = c1.avatar || '🙂';
    document.getElementById('descA').innerText = c1.mbti ? `#${c1.mbti}` : '';

    document.getElementById('nameB').innerText = c2.nickname;
    document.getElementById('avatarB').innerText = c2.avatar || '🙂';
    document.getElementById('descB').innerText = c2.mbti ? `#${c2.mbti}` : '';

    // 선택 효과 초기화
    document.querySelectorAll('.vs-card').forEach(c => c.classList.remove('selected-choice'));
};

window.animateVoteSelection = function(idx) {
    return new Promise(resolve => {
        const cards = document.querySelectorAll('.vs-card');
        if (cards[idx]) cards[idx].classList.add('selected-choice');
        setTimeout(resolve, 500);
    });
};

// 우승 화면
// [ui.js] 우승 화면 (버튼 2개 완벽 복구 버전)
window.showWinnerScreen = function(w) {
    console.log("🏆 우승 화면 출력:", w.nickname);

    // 1. 화면 전환 (VS 카드 숨기고, 우승 박스 보이기)
    document.getElementById('voteIntro').style.display = 'none';
    document.getElementById('voteWrapper').style.display = 'none'; // 대결 카드 숨김
    document.getElementById('roundBadge').style.display = 'none'; // 라운드 배지 숨김
    
    const winnerContainer = document.getElementById('winnerContainer');
    winnerContainer.style.display = 'flex'; // 우승 박스 등장

    // 2. 우승자 데이터 채우기
    document.getElementById('winnerName').innerText = w.nickname;
    document.getElementById('winnerAvatar').innerText = w.avatar || '🏆';
    document.getElementById('winnerTitle').innerText = "👑 최종 선택!";
    document.getElementById('winnerText').innerText = `${w.nickname}님이 우승했습니다!`;

	// [ui.js] showWinnerScreen 함수 내부의 '3. 버튼 영역' 부분 교체
	// 3. ★ 핵심: 남은 티켓에 따라 버튼 다르게 보여주기
	const actionArea = document.getElementById('winnerActionArea');
	if (actionArea) {
	actionArea.innerHTML = ''; // 기존 버튼 비우기

    // (A) 댓글 버튼 (공통)
    const btnComment = document.createElement('button');
    btnComment.className = 'btn-action type-gray btn-master';
    btnComment.innerText = "💬 한줄 평 남기기";
    btnComment.style.marginBottom = "10px";
    btnComment.onclick = () => {
        if (window.openCommentPopup) window.openCommentPopup(w.id, w.nickname);
        else alert("댓글 기능 준비 중입니다 🚧");
    };
    actionArea.appendChild(btnComment);

    // (B) 갈림길: 티켓이 남았니?
    const remainingTickets = (window.myInfo && window.myInfo.tickets !== undefined) ? window.myInfo.tickets : 0;

    if (remainingTickets > 0) {
        // [CASE 1] 티켓 있음 -> "이어서 하기" (빠른 진행)
        const btnNext = document.createElement('button');
        btnNext.className = 'btn-action type-blue btn-master'; // 파란색(긍정)
        btnNext.innerHTML = `이어서 하기 (🎫 ${remainingTickets}장 남음)`;
        btnNext.onclick = () => {
            // 우승 화면 닫고 바로 새 게임 시작
            document.getElementById('winnerContainer').style.display = 'none';
            if (window.realStartGame) window.realStartGame();
        };
        actionArea.appendChild(btnNext);

    } else {
        // [CASE 2] 티켓 없음 -> "메인으로" (퇴장)
        const btnHome = document.createElement('button');
        btnHome.className = 'btn-action type-purple btn-master'; // 보라색(기본)
        btnHome.innerText = "메인으로 돌아가기 (티켓 소진)";
        btnHome.onclick = () => {
            window.isGameRunning = false;
            if (window.goTab) window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
            else location.reload();
        };
        actionArea.appendChild(btnHome);
    }
}

    // 4. 축하 폭죽 효과 🎉
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
};

// ★ 중복되었던 종료 함수 하나로 통합
window.closeTournament = function() {
    const overlay = document.getElementById('tournamentOverlay');
    if (overlay) overlay.classList.remove('open');
    
    alert("수고하셨습니다 심판님! 보상으로 50💎을 드립니다.");
    if (window.myInfo) window.myInfo.tokens = (window.myInfo.tokens || 0) + 50;
    if (window.updateMyInfoUI) window.updateMyInfoUI();
    
    // 메인으로 복귀
    window.isGameRunning = false;
    window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
};

// [ui.js] 라운드 배지 업그레이드 (진행 상황 표시)
window.updateRoundBadgeUI = function(roundSize, current, total) {
    const b = document.getElementById('roundBadge');
    if (!b) return;

    if (roundSize === 2) {
        b.innerText = "👑 결승전";
        b.style.backgroundColor = "#ffc107"; 
        b.style.color = "#000";
    } else {
        // 예: 🏆 8강 (1/4)
        b.innerText = `🏆 ${roundSize}강 (${current}/${total})`;
        b.style.backgroundColor = ""; 
        b.style.color = "";
    }
};

// [ui.js] 상점 아이템 목록 (랜덤박스 전용 히든템 추가)
window.SHOP_ITEMS = [
    // [일반 상품]
    { id: 'ticket_1', type: 'item', icon: '🎫', name: '티켓 1장', price: 100 },
    { id: 'ticket_5', type: 'item', icon: '🎫', name: '티켓 5장', price: 450 },
    { id: 'theme_default', type: 'theme', icon: '☀️', name: '순정 모드', price: 0, value: 'default' },
    { id: 'theme_dark', type: 'theme', icon: '🌙', name: '다크 모드', price: 50, value: 'dark' },
    
    // [가챠 상품]
    { id: 'random_box', type: 'gacha', icon: '❓', name: '랜덤 박스', price: 20 },

    // [히든 상품 - 상점 목록엔 안 뜨고 뽑기로만 획득!]
    // display: false 같은 플래그를 둬서 renderShop에서 거를 수도 있지만,
    // 일단 renderShop 로직이 단순하므로 맨 아래에 두면 보이기만 하고 구매는 불가(가격 없음 등) 처리가 필요.
    // 여기서는 renderShop 함수를 수정하지 않고, 그냥 '히든'으로 취급하겠습니다.
    { id: 'theme_neon', type: 'theme', icon: '👾', name: '네온 모드', price: 9999, value: 'neon', isHidden: true }
];

// [ui.js] renderShop 함수 도입부 수정
// [ui.js] 상점 화면 그리기 (랜덤박스 무한 구매 허용판)
window.renderShop = function() {
    const container = document.getElementById('shop-list');
    if (!container) return;
    container.innerHTML = '';

    const myInventory = window.myInfo.inventory || [];

    // 히든 아이템 제외하고 반복
    window.SHOP_ITEMS.filter(item => !item.isHidden).forEach(item => {
        const isOwned = myInventory.some(saved => saved.id === item.id);
        let btnHtml = '';

        // ★ 핵심 수정: 가챠(gacha)는 소유 여부 상관없이 무조건 [구매] 버튼!
        if (item.type === 'gacha') {
            btnHtml = `<button class="btn-buy" onclick="window.requestBuy('${item.id}')">구매</button>`;
        } 
        else if (isOwned) {
            // 이미 산 아이템 (테마, 일반 등)
            btnHtml = `<button class="btn-buy" disabled style="background:#b2bec3; border:none; color:white; cursor:default; opacity:0.8;">보유중</button>`;
        } 
        else {
            // 아직 안 산 아이템
            btnHtml = `<button class="btn-buy" onclick="window.requestBuy('${item.id}')">구매</button>`;
        }

        const card = document.createElement('div');
        card.className = 'shop-item card';
        if(isOwned && item.type !== 'gacha') card.style.opacity = "0.9"; // 박스는 투명해지지 않음

        card.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">💎 ${item.price}</div>
            </div>
            ${btnHtml} 
        `;
        container.appendChild(card);
    });
};

window.requestBuy = function(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if(window.buyItem) window.buyItem(item);
};

// 7. 인벤토리 (Inventory)
// [수정 후] 이렇게 딱 한 줄만 남기세요!
// 인벤토리 열 때, logic.js에 있는 새 함수(renderInventory)를 실행하도록 연결
window.openInventory = function() { 
    window.openPopup('inventoryOverlay'); 
    if(window.renderInventory) window.renderInventory(); 
};

// 8. 랭킹 (Ranking)
window.initRankScreen = function() {
    if (!window.candidates || window.candidates.length === 0) {
        document.getElementById('rankListContainer').innerHTML = '<div style="padding:40px; text-align:center;">🔄 데이터 로딩 중...</div>';
        if (window.loadCandidatesFromDB) window.loadCandidatesFromDB().then(() => window.renderRankList());
    } else {
        window.renderRankList();
    }
};

// [ui.js] 랭킹 리스트 (방명록 공간 추가 버전)
window.renderRankList = function() {
    const listEl = document.getElementById('rankListContainer');
    if (!listEl) return;
    
    const myUid = localStorage.getItem('my_uid');
    
    // 1. 데이터 준비
    let users = (window.candidates || []).map(u => {
        const total = Object.values(u.stats || {}).reduce((a,b)=>a+b, 0);
        return { ...u, totalScore: total };
    });

    // 2. 정렬
    const sortKey = window.rankSortStat; 
    users.sort((a, b) => {
        if (sortKey) {
            const valA = (a.stats && a.stats[sortKey]) ? a.stats[sortKey] : 0;
            const valB = (b.stats && b.stats[sortKey]) ? b.stats[sortKey] : 0;
            if (valB === valA) return b.totalScore - a.totalScore;
            return valB - valA;
        } else {
            return b.totalScore - a.totalScore;
        }
    });

    // 3. HTML 생성
    let html = '';
    let currentRank = 1;

    users.forEach((u, index) => {
        // 등수 계산
        let scoreToCompare = sortKey ? (u.stats[sortKey] || 0) : u.totalScore;
        let prevScore = 0;
        if (index > 0) {
            const prevUser = users[index-1];
            prevScore = sortKey ? (prevUser.stats[sortKey] || 0) : prevUser.totalScore;
        }
        if (index > 0 && scoreToCompare < prevScore) currentRank = index + 1;

        let rankDisplay = `<span style="font-weight:bold; color:#b2bec3;">${currentRank}</span>`;
        if (currentRank === 1) rankDisplay = '🥇';
        if (currentRank === 2) rankDisplay = '🥈';
        if (currentRank === 3) rankDisplay = '🥉';

        const isMe = (u.id === myUid);
        const itemBg = isMe ? 'background-color: #f8f7ff;' : ''; 
        const nameSuffix = isMe ? ' <span style="font-size:11px; color:#6c5ce7; font-weight:bold;">(나)</span>' : '';
        const displayScore = sortKey ? `${scoreToCompare} <span style="font-size:10px; color:#aaa;">(${u.totalScore})</span>` : `${u.totalScore}점`;
        const s = u.stats || {};
        
        // ★ [방명록 공간 추가] id="gb-유저ID"
        const detailHtml = `
            <div class="rank-detail-view">
                <div class="detail-stat-grid">
                    <div class="detail-stat-item">🧠 지성<span class="detail-stat-val">${s.intelligence||0}</span></div>
                    <div class="detail-stat-item">⚡ 센스<span class="detail-stat-val">${s.speed||0}</span></div>
                    <div class="detail-stat-item">🛡️ 멘탈<span class="detail-stat-val">${s.strength||0}</span></div>
                    <div class="detail-stat-item">💖 인성<span class="detail-stat-val">${s.empathy||0}</span></div>
                    <div class="detail-stat-item">🎉 텐션<span class="detail-stat-val">${s.charisma||0}</span></div>
                    <div class="detail-stat-item">🌀 광기<span class="detail-stat-val">${s.luck||0}</span></div>
                </div>

                <div class="guestbook-area">
                    <div class="guestbook-title">📝 최근 받은 한줄평</div>
                    <div id="gb-${u.id}" class="guestbook-list">
                        <div class="empty-guestbook">터치하여 불러오기...</div>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:center; gap:10px; margin-top:15px;">
                     ${!isMe ? `<button class="btn-action type-purple small" style="width:100%;" onclick="event.stopPropagation(); window.openCommentPopup('${u.id}', '${u.nickname}')">💬 한줄평 남기기</button>` : '<div style="font-size:12px; color:#aaa;">내 프로필입니다</div>'}
                </div>
            </div>
        `;

        // onclick 이벤트에 user ID 전달 (window.toggleRankDetail(this, '유저ID'))
        html += `
            <li class="list-item" onclick="window.toggleRankDetail(this, '${u.id}')" style="${itemBg}">
                <div style="width:30px; text-align:center; font-size:16px; font-weight:bold;">${rankDisplay}</div>
                <div class="common-circle-frame">${u.avatar || '🙂'}</div>
                <div class="list-item-text">
                    <div style="font-weight:bold; font-size:15px; color:#2d3436; margin-bottom:2px;">
                        ${u.nickname}${nameSuffix}
                    </div>
                    <div style="font-size:12px; color:#888;">#${u.mbti}</div>
                </div>
                <div class="list-item-score">${displayScore}</div>
                ${detailHtml}
            </li>
        `;
    });

    listEl.innerHTML = html || '<div style="padding:40px; text-align:center; color:#999;">데이터 없음</div>';
};

// 9. 기타 팝업
window.openPopup = function(id) { document.getElementById(id).classList.add('open'); };
window.closePopup = function(id) { document.getElementById(id).classList.remove('open'); };

// [ui.js] 🍞 토스트 메시지 출력 함수 (Real Version)
window.showToast = function(message) {
    // 1. 토스트 박스가 없으면 만들기 (최초 1회)
    let toast = document.getElementById("toast-container");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-container";
        document.body.appendChild(toast);
    }

    // 2. 메시지 넣고 보여주기
    toast.innerText = message;
    toast.className = "show";

    // 3. 3초 뒤에 사라지게 하기
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
};


// [ui.js] 이 함수가 있어야 테마가 바뀝니다!
// [ui.js] 테마 적용 함수 (동기화)
window.applyActiveEffects = function() {
    // 1. 내 정보에서 테마 값 가져오기
    const theme = window.myInfo.equippedTheme || window.myInfo.bgEffect || 'default';

    // 2. 기존 테마 벗기기
    document.body.classList.remove('bg-dark', 'bg-gold', 'bg-pink');

    // 3. CSS 클래스 정확하게 붙이기
    if (theme === 'dark' || theme === 'bg-dark') {
        document.body.classList.add('bg-dark'); // ★ 여기 수정됨
    } 
    else if (theme === 'pink' || theme === 'bg-pink') {
        document.body.classList.add('bg-pink');
    }
    else if (theme === 'gold' || theme === 'bg-gold') {
        document.body.classList.add('bg-gold');
    }
    
    console.log(`✨ 효과 적용됨: ${theme}`);
};

// 10. 차트 (Chart.js)
window.drawChart = function() {
    const canvas = document.getElementById('myRadarChart');
    if (!canvas || !window.myInfo) return;
    if (window.myChart) window.myChart.destroy();
    
    const stats = window.myInfo.stats || { strength:0, speed:0, intelligence:0, luck:0, charisma:0, empathy:0 };
    
    window.myChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: ['지성','센스','멘탈','인성','텐션','광기'],
            datasets: [{
                label: '내 능력치',
                data: Object.values(stats),
                backgroundColor: 'rgba(108, 92, 231, 0.2)',
                borderColor: '#6c5ce7',
                pointBackgroundColor: '#6c5ce7'
            }]
        },
        options: {
            scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
};

// [ui.js] 한줄평 팝업 (입력창 고정 패치)
window.openCommentPopup = function(targetId, targetName) {
    // 1. 기존 팝업 제거
    const oldPopup = document.getElementById('commentPopupOverlay');
    if (oldPopup) oldPopup.remove();

    // 2. HTML 새로 생성
    const popup = document.createElement('div');
    popup.id = 'commentPopupOverlay';
    popup.className = 'overlay'; 
    popup.innerHTML = `
        <div class="popup">
            <div class="popup-header">
                <h3>💬 한줄 평 남기기</h3>
                <button class="btn-close" onclick="document.getElementById('commentPopupOverlay').remove()">✖</button>
            </div>
            <div class="popup-body">
                <p style="color:#6c5ce7; font-weight:bold; margin-bottom:10px;">To. ${targetName} 님</p>
                
                <textarea id="commentInput" placeholder="이 캐릭터에게 하고 싶은 말을 남겨주세요!" maxlength="50" 
                    style="width:100%; height:100px; padding:12px; border-radius:12px; border:1px solid #dfe6e9; font-family: 'Pretendard', sans-serif; resize: none; outline:none; font-size:14px; line-height:1.4;"></textarea>
                
                <button id="btnSubmitComment" class="btn-action type-purple" style="width:100%; margin-top:15px;">등록하기</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('open'), 10);
    
    // 3. 이벤트 연결
    const inputEl = popup.querySelector('#commentInput'); 
    const btnEl = popup.querySelector('#btnSubmitComment');

    btnEl.onclick = function() {
        const text = inputEl.value.trim();
        
        if (!text) return alert("내용을 입력해주세요!");
        
        if (window.submitComment) {
            window.submitComment(targetId, text);
            popup.remove();
        } else {
            alert("저장 기능 오류");
        }
    };
};

// [ui.js] 📢 광장 & 우편함 화면 그리기
window.renderSquareScreen = function(userList, feedList, mode) {
    // 1. 명예의 전당 (전체 탭에서만 보임)
    const rankContainer = document.getElementById('squareTopRank');
    const rankTitle = document.querySelector('.section-title'); // "명예의 전당" 타이틀

    if (mode === 'MY') {
        if(rankContainer) rankContainer.style.display = 'none';
        if(rankTitle) rankTitle.style.display = 'none';
    } else {
        if(rankContainer) rankContainer.style.display = 'flex';
        if(rankTitle) rankTitle.style.display = 'block';
        
        // 랭킹 그리기 (기존 로직 유지)
        // (userList는 객체가 아니라 배열이어야 정렬 가능하므로 변환)
        let sortedUsers = Array.isArray(userList) ? userList : Object.values(userList);
        sortedUsers.sort((a, b) => {
            const scoreA = Object.values(a.stats || {}).reduce((sum, v) => sum + v, 0);
            const scoreB = Object.values(b.stats || {}).reduce((sum, v) => sum + v, 0);
            return scoreB - scoreA;
        });

        let html = '';
        sortedUsers.slice(0, 5).forEach((u, i) => {
            const isGold = i === 0 ? 'gold' : '';
            const rankText = `${i + 1}위`;
            const score = Object.values(u.stats || {}).reduce((a,b)=>a+b, 0);
            html += `
                <div class="rank-card ${isGold}" onclick="window.openCommentPopup('${u.id}', '${u.nickname}')">
                    <div class="rank-badge">${rankText}</div>
                    <div class="common-circle-frame" style="width:50px; height:50px; font-size:25px; margin:15px auto 10px;">${u.avatar || '🙂'}</div>
                    <div style="font-weight:bold; font-size:14px; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.nickname}</div>
                    <div style="font-size:12px; color:#888;">${score}점</div>
                </div>
            `;
        });
        if(rankContainer) rankContainer.innerHTML = html;
    }

    // 2. 피드(댓글) 리스트 그리기
    const feedContainer = document.getElementById('squareFeed');
    const listTitle = document.getElementById('squareListTitle');
    
    if(listTitle) listTitle.innerText = (mode === 'MY') ? "💌 받은 메시지함" : "💬 실시간 톡";

    if (feedContainer) {
        let html = '';
        feedList.forEach(c => {
            // 날짜 포맷 (오늘이면 시간, 아니면 날짜)
            const dateObj = new Date(c.timestamp ? c.timestamp.seconds * 1000 : c.date);
            const dateStr = dateObj.toLocaleDateString();
            
            // 내 소식일 땐 배경색을 살짝 다르게? (선택)
            const itemStyle = (mode === 'MY') ? 'border:1px solid #6c5ce7; background:#f8f7ff;' : '';

            html += `
                <div class="feed-item" style="${itemStyle}">
                    <div class="feed-header">
                        <span style="font-weight:bold; color:#2d3436;">${c.from_name || '익명'}</span>
                        <span style="font-size:11px;">${dateStr}</span>
                    </div>
                    <div class="feed-content">
                        ${mode === 'ALL' ? `<span class="feed-target">@${c.to_name}</span>` : ''}
                        ${c.content}
                    </div>
                </div>
            `;
        });

        if(feedList.length === 0) {
            const emptyMsg = (mode === 'MY') ? "아직 받은 메시지가 없어요 📭<br>친구들에게 나를 알려보세요!" : "첫 번째 글을 남겨보세요! 💬";
            html = `<div style="padding:50px 20px; text-align:center; color:#b2bec3; line-height:1.6;">${emptyMsg}</div>`;
        }
        
        feedContainer.innerHTML = html;
    }
};

// ==========================================
// [ui.js] 🏆 랭킹 필터 & 정렬 로직 (반드시 파일 맨 아래에 있어야 함)
// ==========================================

// 전역 변수: 현재 정렬 기준
window.rankSortStat = null; 
window.rankViewMode = 'rank'; 

// 1. 랭킹 뷰 전환 (전체 랭킹 vs 나의 팬덤)
window.switchRankView = function(mode) {
    window.rankViewMode = mode;
    if (mode === 'fandom') {
        if(window.showToast) window.showToast("🚧 '나의 팬덤' 기능은 준비 중입니다! (전체 랭킹을 보여줍니다)");
    }
    if(window.renderRankList) window.renderRankList();
};

// 2. 스탯 필터 클릭 (지성, 센스, 멘탈...)
window.filterRank = function(element, statIndex) {
    const parent = element.parentNode;
    Array.from(parent.children).forEach(c => c.classList.remove('active'));
    element.classList.add('active');

    const statKeys = ['intelligence', 'speed', 'strength', 'empathy', 'charisma', 'luck'];
    window.rankSortStat = statKeys[statIndex];
    console.log(`🏆 정렬 기준 변경: ${window.rankSortStat}`);

    if(window.renderRankList) window.renderRankList();
};
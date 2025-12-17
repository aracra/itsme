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
window.updateMyInfoUI = function() {
    const info = window.myInfo;
    if (!info) return;

    const nameEl = document.getElementById('myNickname');
    const avatarEl = document.getElementById('myAvatar');
    const mbtiEl = document.getElementById('myMbti');

    if (nameEl) nameEl.innerText = info.nickname;
    if (mbtiEl) mbtiEl.innerText = info.mbti ? `#${info.mbti}` : '#???';
    if (avatarEl) avatarEl.innerText = info.avatar || '🙂';

    // 토큰 표시 (여러 군데 있을 수 있음)
    document.querySelectorAll('.my-token-display').forEach(el => el.innerText = info.tokens);
    const tokenEl = document.getElementById('shopTokenDisplay');
    if(tokenEl) tokenEl.innerText = info.tokens;

    // 배경 효과 적용
    if(window.applyActiveEffects) window.applyActiveEffects();
    window.updateTicketUI();
    
    console.log("🔄 UI 갱신 완료");
};

window.updateTicketUI = function() {
    const count = (window.myInfo && window.myInfo.tickets !== undefined) ? window.myInfo.tickets : 0;
    
    const badge = document.getElementById('ticketDisplay');
    if (badge) badge.innerText = `🎫 남은 티켓: ${count}/5`;
    
    const floatBadge = document.getElementById('ticketCountNum');
    if (floatBadge) floatBadge.innerText = count;
};

// 3. 화면 네비게이션
// [ui.js] 탭 전환 함수 (전체 수리 버전)
window.goTab = function(screenId, navElement) {
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
    if (screenId === 'screen-vote') {
        // 투표 화면: 새 질문 로드 등
        if (window.initVoteScreenUI && window.currentQ) {
             // (필요 시 로직 추가)
        }
    } else if (screenId === 'screen-rank') {
        // 랭킹 화면: 리스트 새로고침
        if (window.refreshRank) window.refreshRank();

    } else if (screenId === 'screen-shop') {
        // 상점 화면: 아이템 목록 새로고침
        if (window.renderShop) window.renderShop();

    } else if (screenId === 'screen-square') {
        // 📢 [광장] 화면: 랭킹+댓글 새로고침 (여기가 추가된 부분!)
        if (window.refreshSquare) window.refreshSquare();
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

// [ui.js] 상점 아이템 목록 (전역 변수로 승격!)
window.SHOP_ITEMS = [
    { id: 'ticket_1', type: 'item', icon: '🎫', name: '티켓 1장', price: 100 },
    { id: 'ticket_5', type: 'item', icon: '🎫', name: '티켓 5장', price: 450 },
    
    // ▼ 테마 아이템 (type: 'theme' 추가)
    { id: 'theme_default', type: 'theme', icon: '☀️', name: '순정 모드', price: 0, value: 'default' }, // 기본
    { id: 'theme_dark', type: 'theme', icon: '🌙', name: '다크 모드', price: 50, value: 'dark' },    // 다크
    
    { id: 'random_box', type: 'gacha', icon: '❓', name: '랜덤 박스', price: 20 }
];

// [ui.js] 상점 화면 그리기 (업그레이드 버전)
window.renderShop = function() {
    const container = document.getElementById('shop-list');
    if (!container) return;
    container.innerHTML = '';

    // 0. 내 정보 가져오기
    const myInventory = window.myInfo.inventory || [];
    const equippedTheme = window.myInfo.equippedTheme || 'default'; // 현재 장착 중인 테마

    // window.SHOP_ITEMS 사용!
    window.SHOP_ITEMS.forEach(item => {
        // 1. 소유 여부 확인
        const isOwned = myInventory.some(saved => saved.id === item.id);

        // 2. 버튼 HTML 결정 (핵심!)
        let btnHtml = '';

        if (isOwned) {
            // (A) 이미 샀을 때
            if (item.type === 'theme') {
                // 테마인 경우: 장착 상태 확인
                if (equippedTheme === item.value) {
                    // 이미 끼고 있음 -> 비활성화
                    btnHtml = `<button class="btn-buy" disabled style="background-color:#4cd137; opacity:0.8; cursor:default;">장착중 ✅</button>`;
                } else {
                    // 샀는데 안 끼고 있음 -> [장착] 버튼 (requestEquip 호출)
                    btnHtml = `<button class="btn-buy" onclick="window.requestEquip('${item.id}')" style="background-color:#6c5ce7;">장착</button>`;
                }
            } else {
                // 소모품(티켓 등)인데 샀을 때 -> 그냥 보유중 (나중에 필요하면 '사용' 추가)
                btnHtml = `<button class="btn-buy" disabled style="background-color: #6c757d; cursor: default; opacity: 0.7;">보유중</button>`;
            }
        } else {
            // (B) 안 샀을 때 -> [구매] 버튼
            btnHtml = `<button class="btn-buy" onclick="window.requestBuy('${item.id}')">구매</button>`;
        }

        const card = document.createElement('div');
        card.className = 'shop-item card';
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

// 🛑 중요: window.updateInventoryList 와 window.equipItem 함수 덩어리는 전부 삭제하세요!

// 8. 랭킹 (Ranking)
window.initRankScreen = function() {
    if (!window.candidates || window.candidates.length === 0) {
        document.getElementById('rankListContainer').innerHTML = '<div style="padding:40px; text-align:center;">🔄 데이터 로딩 중...</div>';
        if (window.loadCandidatesFromDB) window.loadCandidatesFromDB().then(() => window.renderRankList());
    } else {
        window.renderRankList();
    }
};

window.renderRankList = function() {
    const listEl = document.getElementById('rankListContainer');
    if (!listEl) return;
    
    const users = [...(window.candidates || [])];
    // 점수(stats 합계) 순 정렬
    users.sort((a, b) => {
        const scoreA = Object.values(a.stats || {}).reduce((sum, v) => sum + v, 0);
        const scoreB = Object.values(b.stats || {}).reduce((sum, v) => sum + v, 0);
        return scoreB - scoreA;
    });

    let html = '';
    users.forEach((u, i) => {
        const score = Object.values(u.stats || {}).reduce((sum, v) => sum + v, 0);
        const rank = i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1);
        html += `
            <li class="list-item">
                <div style="font-weight:bold; width:30px;">${rank}</div>
                <div class="common-circle-frame" style="margin-right:10px;">${u.avatar||'🙂'}</div>
                <div class="list-item-text">
                    <div style="font-weight:bold;">${u.nickname}</div>
                    <div style="font-size:12px; color:#888;">#${u.mbti}</div>
                </div>
                <div class="list-item-score">${score}점</div>
            </li>
        `;
    });
    listEl.innerHTML = html || '<div style="padding:20px; text-align:center;">데이터 없음</div>';
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
// [ui.js] 테마 및 효과 적용 함수 (경고 제거 버전)
window.applyActiveEffects = function() {
    // 1. 내 정보에서 테마 값 가져오기 (없으면 'default')
    const theme = window.myInfo.equippedTheme || window.myInfo.bgEffect || 'default';

    // 2. 기존에 입고 있던 테마들 싹 벗기기 (초기화)
    document.body.classList.remove('theme-dark', 'bg-dark', 'bg-gold', 'bg-pink', 'theme-mint');

    // 3. 테마별 적용 로직
    if (theme === 'default') {
        // ★ 핵심 수정: 'default'는 에러가 아님! 그냥 여기서 끝내면 됨.
        console.log("✨ 순정 모드(Default) 적용 완료");
        return; 
    }

    if (theme === 'dark' || theme === 'bg-dark') {
        document.body.classList.add('theme-dark');
    } 
    else if (theme === 'pink' || theme === 'bg-pink') {
        document.body.classList.add('theme-pink'); // CSS에 .theme-pink가 있다면
    }
    else {
        // 진짜로 이상한 코드가 들어왔을 때만 경고 띄우기
        console.warn("⚠️ 테마 적용 실패 (알 수 없는 코드):", theme);
    }
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

// [ui.js] openCommentPopup 함수 수정
window.openCommentPopup = function(targetId, targetName) {
    // 1. 기존 팝업 제거 (청소)
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
                    style="width:100%; height:80px; padding:10px; border-radius:10px; border:1px solid #ddd; font-family: 'Malgun Gothic', sans-serif;"></textarea>
                <button id="btnSubmitComment" class="btn-action type-purple" style="width:100%; margin-top:10px;">등록하기</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('open'), 10);
    
    // 4. ★ 핵심 수정: 문서 전체가 아니라 'popup' 변수 안에서만 찾기!
    // 이렇게 하면 밖에 좀비가 있든 말든 무조건 지금 뜬 창의 내용을 읽어옵니다.
    const inputEl = popup.querySelector('#commentInput'); 
    const btnEl = popup.querySelector('#btnSubmitComment');

    btnEl.onclick = function() {
        const text = inputEl.value.trim(); // 여기서 안전하게 가져옴
        
        if (!text) return alert("내용을 입력해주세요!");
        
        if (window.submitComment) {
            window.submitComment(targetId, text);
            popup.remove();
        } else {
            alert("저장 기능 오류");
        }
    };
};

// [ui.js] 📢 광장 화면 그리기
window.renderSquareScreen = function(rankList, feedList) {
    // 1. 명예의 전당 (Top 5까지 보여줍시다)
    const rankContainer = document.getElementById('squareTopRank');
    if (rankContainer) {
        let html = '';
        const topMembers = rankList.slice(0, 5); // 5명
        
        topMembers.forEach((u, i) => {
            const isGold = i === 0 ? 'gold' : '';
            const rankText = `${i + 1}위`;
            const score = Object.values(u.stats || {}).reduce((a,b)=>a+b, 0);

            html += `
                <div class="rank-card ${isGold}" onclick="window.openProfilePopup('${u.id}')">
                    <div class="rank-badge">${rankText}</div>
                    <div class="common-circle-frame" style="width:50px; height:50px; font-size:25px; margin:15px auto 10px;">${u.avatar || '🙂'}</div>
                    <div style="font-weight:bold; font-size:14px; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.nickname}</div>
                    <div style="font-size:12px; color:#888;">${score}점</div>
                </div>
            `;
        });
        if(topMembers.length === 0) html = '<div style="padding:20px; text-align:center; color:#999; width:100%;">아직 랭킹이 없어요 🕸️</div>';
        rankContainer.innerHTML = html;
    }

    // 2. 피드 그리기
    const feedContainer = document.getElementById('squareFeed');
    if (feedContainer) {
        let html = '';
        feedList.forEach(c => {
            html += `
                <div class="feed-item">
                    <div class="feed-header">
                        <span style="font-weight:bold;">${c.from_name || '익명'}</span>
                        <span>${c.date ? c.date.substring(5,10) : ''}</span>
                    </div>
                    <div class="feed-content">
                        <span class="feed-target">@${c.to_name || '???'}</span>
                        ${c.content}
                    </div>
                </div>
            `;
        });
        if(feedList.length === 0) html = '<div style="padding:30px; text-align:center; color:#999;">첫 번째 글을 남겨보세요! 💬</div>';
        feedContainer.innerHTML = html;
    }
};
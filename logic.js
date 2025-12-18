// logic.js
// Version: v19.16.7 (Final Logic)

// 1. Firebase 설정 (기존 설정 유지)
window.firebaseConfig = {
    apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc",
    authDomain: "it-s-me-96d66.firebaseapp.com",
    projectId: "it-s-me-96d66",
    storageBucket: "it-s-me-96d66.firebasestorage.app",
    messagingSenderId: "950221311348",
    appId: "1:950221311348:web:43c851b6a4d7446966f021",
    measurementId: "G-J3SYEX4SYW"
};

// 전역 변수 초기화
window.db = null;
window.FieldValue = null;
window.isGameRunning = false;
window.isVoting = false;

// 토너먼트 데이터
window.candidates = [];      // 전체 후보
window.tournamentRound = []; // 현재 라운드 대진표
window.nextRound = [];       // 다음 라운드 진출자
window.currentQ = null;      // 현재 질문
window.MAX_TICKETS = 5; // 👈 나중에 이 숫자만 바꾸면 하루 제한 변경 끝!

// 질문 리스트
// [logic.js] 질문 리스트 (A vs B 밸런스 게임)
window.questions = [
    // 🔥 매운맛 / 팩폭
    { id: 1, text: "😈 조별과제에서 '버스' 탈 것 같은 사람은?" },
    { id: 2, text: "💸 돈 빌려주면 절대 못 돌려받을 것 같은 사람은?" },
    { id: 3, text: "🤬 운전할 때 성격 파탄날 것 같은 사람은?" },
    { id: 4, text: "🍷 술 마시면 흑역사 생성기가 될 사람은?" },
    { id: 5, text: "🤥 입만 열면 거짓말! 사기꾼 기질이 다분한 사람은?" },

    // 🏝️ 만약에 (IF)
    { id: 6, text: "🧟 좀비 사태 발생! 끝까지 바퀴벌레처럼 생존할 사람은?" },
    { id: 7, text: "🏝️ 무인도에 딱 한 명만 데려가야 한다면 누구?" },
    { id: 8, text: "👽 외계인이 침공했을 때, 바로 배신하고 앞잡이 할 사람은?" },
    { id: 9, text: "👻 귀신의 집에서 가장 비명 지르며 기절할 사람은?" },
    { id: 10, text: "💰 로또 1등 당첨! 바로 잠수타고 연락 끊을 사람은?" },

    // 💕 연애 / 썸
    { id: 11, text: "🦊 여우짓/플러팅 장인일 것 같은 사람은?" },
    { id: 12, text: "💔 환승이별을 아무렇지 않게 할 것 같은 사람은?" },
    { id: 13, text: "💍 결혼하면 꽉 잡혀서 살 것 같은 사람은?" },
    { id: 14, text: "📱 연인 핸드폰 몰래 훔쳐볼 것 같은 집착왕은?" },
    { id: 15, text: "💌 고백하면 1초 만에 차일 것 같은 사람은?" },

    // 🤡 엉뚱 / 개그
    { id: 16, text: "🎤 아이돌 데뷔하면 '센터' 먹을 것 같은 사람은?" },
    { id: 17, text: "🎬 나중에 유튜브 스타가 되어있을 것 같은 관종은?" },
    { id: 18, text: "🕺 클럽에서 춤추다가 쫓겨날 것 같은 사람은?" },
    { id: 19, text: "🥘 뷔페 가면 사장님이 싫어할 정도로 많이 먹을 사람은?" },
    { id: 20, text: "💩 똥 싸다가 변기 막히게 할 것 같은 사람은?" },

    // 🧠 능력 / 지능
    { id: 21, text: "🤓 전교 1등 출신! 가장 스마트할 것 같은 사람은?" },
    { id: 22, text: "💼 나중에 대기업 임원이나 사장님이 될 관상은?" },
    { id: 23, text: "🍳 요리대회 나가면 우승할 것 같은 금손은?" },
    { id: 24, text: "🕵️‍♂️ 방탈출 카페 가면 혼자 다 풀어서 탈출시킬 사람은?" },
    { id: 25, text: "🗣️ 말싸움하면 절대 안 질 것 같은 논리왕은?" }
];

// 2. 초기화 (페이지 로드 시)
window.addEventListener('load', function() {
    console.log("🐢 Logic 로드 완료. Firebase 연결 시도...");
    if (window.firebase) {
        if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
        window.db = firebase.firestore();
        window.FieldValue = firebase.firestore.FieldValue;
        
        // 게임 초기화 실행
        if (window.initGame) window.initGame();
    }
});

// 게임 초기 세팅
// [logic.js] 게임 초기화 및 리셋 관리
window.initGame = function() {
    const myUid = localStorage.getItem('my_uid');
    
    if (!myUid) {
        if(window.updateStatus) window.updateStatus("로그인 필요", "wait");
        return;
    }

    // 실시간 리스너 연결
    window.db.collection('users').doc(myUid).onSnapshot((doc) => {
        if (doc.exists) {
            window.myInfo = doc.data();
            if(window.myInfo.tickets === undefined) window.myInfo.tickets = 0;

            // ★ [추가] 일일 리셋 체크 (데이터 로드 직후 수행)
            checkDailyReset(myUid);

            if(window.updateMyInfoUI) window.updateMyInfoUI();
            if(window.updateStatus) window.updateStatus("🟢 준비 완료", "ok");

            // 후보자 로드
            if (!window.candidates || window.candidates.length === 0) {
                window.loadCandidatesFromDB();
            }
        }
    });
};

// ★ [신규 함수] 일일 리셋 로직 (KST 자정 기준)
function checkDailyReset(uid) {
    // 1. 한국 시간 기준 '오늘 날짜' 구하기 (YYYY-MM-DD)
    // toLocaleDateString('ko-KR')을 쓰면 사용자 로컬 시간대가 섞일 수 있으니
    // 확실하게 오프셋 계산을 하는 게 좋지만, 간단히 이렇게 하겠습니다.
    const now = new Date();
    const todayStr = now.toLocaleDateString('ko-KR'); // "2025. 12. 18." 형태

    // 2. 마지막 접속(리셋) 날짜 가져오기
    const lastResetDate = localStorage.getItem('lastLoginDate_' + uid);

    // 3. 날짜가 다르면? (하루가 지남!)
    if (lastResetDate !== todayStr) {
        console.log("🌙 날짜가 변경되었습니다. 일일 리셋을 수행합니다.");

        // (A) 티켓 리필 (5장 미만일 때만 5장으로! 10장이면 10장 유지)
        let currentTickets = window.myInfo.tickets || 0;
        let newTickets = currentTickets;
        
        if (currentTickets < 5) {
            newTickets = 5;
            console.log(`🎫 티켓 충전: ${currentTickets} -> 5`);
        } else {
            console.log(`🎫 티켓 유지: ${currentTickets} (5장 이상이라 충전 안 함)`);
        }

        // (B) 운세 뽑기 기록 초기화 (이미 로직에 있지만 확실하게)
        // 로컬스토리지의 'dailyFortuneData'는 놔둬도 날짜 비교해서 알아서 무시함.
        // 그래도 깔끔하게 하려면 여기서 지워도 됨. (선택사항)
        
        // (C) DB 업데이트
        if (newTickets !== currentTickets) {
            window.db.collection('users').doc(uid).update({ tickets: newTickets });
            window.myInfo.tickets = newTickets; // 메모리 즉시 반영
        }

        // (D) 오늘 날짜 도장 찍기
        localStorage.setItem('lastLoginDate_' + uid, todayStr);
        
        // 알림
        if(window.showToast) window.showToast("🌞 새로운 하루가 시작되었습니다! (티켓 점검 완료)");
    }
}

// [logic.js] 후보자 불러오기 (나 포함 버전)
window.loadCandidatesFromDB = async function() {
    if (!window.db) return;
    const myUid = localStorage.getItem('my_uid');
    
    try {
        const snapshot = await window.db.collection('users').get();
        const list = [];
        
        snapshot.forEach(doc => {
            // ★ 수정: '나'를 제외하는 if문을 제거했습니다.
            // 이제 나도 랭킹 리스트에 포함됩니다!
            list.push({ id: doc.id, ...doc.data() });
        });
        
        window.candidates = list;
        console.log(`📦 후보자 ${list.length}명 로드됨 (나 포함)`);
        
        if(window.renderRankList) window.renderRankList();
        
    } catch (e) { console.error(e); }
};

// ==========================================================
// 3. 🔥 토너먼트 핵심 로직 (여기가 안 되면 게임이 안 됨)
// ==========================================================
// [logic.js] realStartGame 수정 (ID 기준 중복 제거 버전)
window.realStartGame = function() {
    if (window.isGameRunning) return;

    // 🛑 1. 도플갱어 방지 (ID 기준)
    // "이름이 같아도 ID가 다르면 다른 사람이다!"
    const seenIds = new Set();
    const uniqueList = [];
    
    const myUid = localStorage.getItem('my_uid');

    (window.candidates || []).forEach(c => {
        // 1) 내 ID 제외
        // 2) 이미 등록된 'ID'면 제외 (이건 진짜 에러니까)
        if (c.id !== myUid && !seenIds.has(c.id)) {
            seenIds.add(c.id);
            uniqueList.push(c);
        }
    });
    
    // 명단 교체
    window.candidates = uniqueList;
    console.log(`🧹 후보 명단 정리 완료 (ID 기준): ${window.candidates.length}명 대기 중`);

    // 2. 인원수 체크
    if (window.candidates.length < 4) {
        alert(`⚠️ 후보가 부족합니다. (현재 ${window.candidates.length}명)\n최소 4명이 필요합니다. [개발자 메뉴]에서 NPC를 추가해주세요.`);
        return;
    }

    // 3. 티켓 차감
    if ((window.myInfo.tickets || 0) < 1) {
        alert("티켓이 부족합니다! 🎫");
        return;
    }
    window.myInfo.tickets--;
    window.db.collection("users").doc(myUid).update({ tickets: window.myInfo.tickets });
    if (window.updateTicketUI) window.updateTicketUI();

    // 4. 게임 시작
    window.isGameRunning = true;
    window.currentQ = window.questions[Math.floor(Math.random() * window.questions.length)] || { text: "질문 데이터 없음" };
    if(window.initVoteScreenUI) window.initVoteScreenUI(window.currentQ.text);

    // 대진표 섞기
    let players = [...window.candidates];
    players.sort(() => Math.random() - 0.5);
    
    const size = (players.length >= 8) ? 8 : 4;
    window.tournamentRound = players.slice(0, size);
    window.nextRound = [];
    
    console.log(`🏁 토너먼트 시작! (${size}강)`);
    showMatch();
};

// [Core] 매치 보여주기 (계산 로직 추가)
function showMatch() {
    // A. 현재 라운드가 끝났는가? (남은 사람 2명 미만)
    if (window.tournamentRound.length < 2) {
        // 결승전 승자 발생 시
        if (window.nextRound.length === 1) {
            finishGame(window.nextRound[0]);
            return;
        }
        
        // 다음 라운드로 이동 (8강 -> 4강)
        window.tournamentRound = window.nextRound;
        window.nextRound = [];
        window.tournamentRound.sort(() => Math.random() - 0.5); 
    }

    // ★ 진행도 계산 (Progress Calculation)
    const currentRoundSize = window.tournamentRound.length + (window.nextRound.length * 2);
    const totalMatches = currentRoundSize / 2;       // 이번 라운드 총 경기 수 (8강이면 4경기)
    const currentMatchNum = window.nextRound.length + 1; // 현재 경기 번호 (승자 수 + 1)
    
    // UI 업데이트 (8강, 1, 4) 형태로 전달
    if(window.updateRoundBadgeUI) window.updateRoundBadgeUI(currentRoundSize, currentMatchNum, totalMatches);

    // B. 경기 진행 (VS 카드 업데이트)
    const p1 = window.tournamentRound[0];
    const p2 = window.tournamentRound[1];

    if(window.updateVsCardUI) {
        window.updateVsCardUI(p1, p2);
    }
}

// [Vote Click] 투표 처리 (HTML onclick="vote(0)" 와 연결됨)
window.vote = function(index) {
    if (window.isVoting) return;
    window.isVoting = true;

    // 1. 선택 애니메이션 (ui.js)
    if(window.animateVoteSelection) window.animateVoteSelection(index);

    setTimeout(() => {
        // 2. 승자 판별
        const winner = window.tournamentRound[index];
        window.nextRound.push(winner);
        
        // 3. 대진표에서 2명 제거
        window.tournamentRound.splice(0, 2);

        // 4. 보상 (10원)
        window.myInfo.tokens += 10;
        if(window.updateMyInfoUI) window.updateMyInfoUI();

        // 5. 다음 매치로
        showMatch();
        window.isVoting = false;
    }, 500); // 애니메이션 시간 대기
};

// [End] 게임 종료 및 우승
function finishGame(winner) {
    console.log("🏆 우승:", winner.nickname);
    window.isGameRunning = false;
    
    // 우승자 보상 (DB 업데이트)
    window.db.collection("users").doc(winner.id).update({
        tokens: window.FieldValue.increment(100),
        "stats.luck": window.FieldValue.increment(10)
    });
	
	// 1. 메모리(장부)도 즉시 수정! (이게 빠져서 점수가 안 변해 보였음)
	winner.stats.luck += 10; 
	winner.tokens += 100;

	// 2. 랭킹판 다시 그리기
	if(window.renderRankList) window.renderRankList();

	console.log(`🏆 로컬 데이터 갱신: ${winner.nickname} (운 +10, 돈 +100)`);

    // 화면 표시
    if(window.showWinnerScreen) window.showWinnerScreen(winner);
}

// ==========================================================
// 4. 기타 기능 (상점 등)
// ==========================================================
// [logic.js] buyItem 함수 교체 (중복 결제 방지)
window.buyItem = async function(item) {
    // 0. (NEW) 진짜 중복 구매 방지: 가방(Inventory) 먼저 검사! 🎒
    // 주의: DB에 'id'라는 이름으로 저장했으므로, 확인할 때도 .id로 찾아야 합니다.
    const myInventory = window.myInfo.inventory || []; // 가방이 비었을 경우 대비
    const alreadyHas = myInventory.some(savedItem => savedItem.id === item.id);

    if (alreadyHas) {
        alert("이미 가지고 있는 아이템입니다! (중복 구매 불가 🙅‍♂️)");
        return; 
    }

    // 1. 기존: 광클 방지 & 돈 체크
    if (window.isBuying) return;
    if ((window.myInfo.tokens || 0) < item.price) {
        alert("잔액이 부족합니다 💸");
        return;
    }

    // 2. 구매 확인창
    if (confirm(item.name + "을(를) 구매하시겠습니까?")) {
        window.isBuying = true;
        try {
            const uid = localStorage.getItem('my_uid');
            
            // ★ 핵심: DB 저장값 결정
            let saveValue = item.icon || '📦';
            
            // 테마 아이템 코드 변환 로직
            if(item.name.includes('다크') || item.id === 'theme_dark') saveValue = 'bg-dark';
            else if(item.name.includes('골드') || item.id === 'theme_gold') saveValue = 'bg-gold';
            else if(item.name.includes('핑크') || item.id === 'theme_pink') saveValue = 'bg-pink';

            // 3. DB 업데이트
            await window.db.collection('users').doc(uid).update({
                tokens: firebase.firestore.FieldValue.increment(-item.price),
                inventory: firebase.firestore.FieldValue.arrayUnion({
                    id: item.id,     // 👈 여기가 'id'라서 위에서 검사할 때도 .id여야 함
                    name: item.name, 
                    type: item.type,
                    value: saveValue, 
                    date: new Date().toISOString()
                })
            });

            // 4. 로그 남기기
            await window.db.collection('logs').add({
                target_uid: uid,
                action_type: 'PURCHASE',
                message: `${item.name} 구매 (값: ${saveValue})`,
                score_change: -item.price,
                timestamp: new Date()
            });

            // ★ (중요) 화면 새로고침 없이 즉시 반영을 위해 로컬 정보 업데이트
            // 이걸 안 하면 새로고침 하기 전까지는 또 살 수 있게 보임
            if (!window.myInfo.inventory) window.myInfo.inventory = [];
            window.myInfo.inventory.push({ id: item.id, name: item.name, value: saveValue });
            window.myInfo.tokens -= item.price; // 돈 깎인 것도 반영

            alert("구매 완료! 🎒 가방을 확인하세요.");
        } catch(e) {
            console.error(e);
            alert("구매 실패: " + e.message);
        } finally {
            window.isBuying = false;
        }
    }
};

// [logic.js] 5. 인벤토리 화면 그리기 (Fix Version)
// [logic.js] 가방 화면 그리기 (여기가 진짜 탈의실)
window.renderInventory = function() {
    // 1. 그릴 위치 찾기 (HTML ID: inventoryListArea)
    const container = document.getElementById('inventoryListArea'); 
    if (!container) return;
    
    container.innerHTML = '';
    
    // 2. 내 가방 & 현재 입은 옷 정보 가져오기
    const myInv = (window.myInfo && window.myInfo.inventory) ? window.myInfo.inventory : [];
    const currentTheme = window.myInfo.equippedTheme || 'default'; 

    if (myInv.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">가방이 텅 비었어요 🕸️<br>상점에서 쇼핑을 즐겨보세요!</div>';
        return;
    }

    // 3. 목록 그리기 (최신순 정렬)
    [...myInv].reverse().forEach(savedItem => {
        // ★ 핵심: 저장된 ID로 원본 아이템 정보(이름, 아이콘) 찾기
        const itemDetail = window.SHOP_ITEMS.find(s => s.id === savedItem.id);

        // 아이템 정보가 없으면(삭제됨) 건너뜀
        if (!itemDetail) return;
	
		// ★ 추가된 코드: 가챠(랜덤박스) 아이템은 가방 목록에서 숨김!
        if (itemDetail.type === 'gacha') return;

        // 버튼 HTML 결정
        let btnHtml = '';

        if (itemDetail.type === 'theme') {
            // [테마] 아이템인 경우 -> 장착 버튼 표시
            const isEquipped = (itemDetail.value === currentTheme);

            if (isEquipped) {
                // 입고 있음
                btnHtml = `<button disabled style="background:#4cd137; color:white; border:none; padding:6px 12px; border-radius:5px; font-size:12px; font-weight:bold;">착용중 ✅</button>`;
            } else {
                // 입을 수 있음 -> [착용] 버튼
                btnHtml = `<button onclick="window.equipItem('${itemDetail.id}')" style="background:#6c5ce7; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-size:12px;">착용</button>`;
            }
        } else {
            // [소모품/기타] 아이템 -> 그냥 텍스트
            btnHtml = `<span style="font-size:12px; color:#aaa; font-weight:bold;">소장용</span>`;
        }

        // 4. 리스트 아이템 생성
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 10px; margin-bottom:8px; border-bottom:1px solid #eee;';
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="font-size:28px; width:40px; text-align:center;">${itemDetail.icon || '📦'}</div>
                <div>
                    <div style="font-weight:bold; font-size:15px; color:#333; margin-bottom:2px;">${itemDetail.name}</div>
                    <div style="font-size:12px; color:#888;">${itemDetail.type === 'theme' ? '🎨 테마 스킨' : '📦 아이템'}</div>
                </div>
            </div>
            <div>${btnHtml}</div>
        `;
        container.appendChild(div);
    });
};
// [logic.js] 2. 아이템 장착 함수 (검문소 철거 버전)
window.equipItem = async function(itemId) {
    const uid = localStorage.getItem('my_uid');
    
    // 1. 내 가방에서 아이템 찾기 (소유 확인)
    const myInv = (window.myInfo && window.myInfo.inventory) ? window.myInfo.inventory : [];
    const savedItem = myInv.find(i => i.id === itemId);
    
    if (!savedItem) {
        alert("오잉? 가방에 없는 아이템인데요? 👻");
        return;
    }

    // 2. 상점 목록에서 상세 정보(이름, 타입, 값) 가져오기
    const itemDetail = window.SHOP_ITEMS.find(s => s.id === itemId);
    if (!itemDetail) return;

    // ----------------------------------------------------
    // ★ 핵심 수정: 값이 아니라 '타입'이 테마인지 확인!
    // ----------------------------------------------------
    if (itemDetail.type === 'theme') {
        
        // (1) 화면에 즉시 적용 (applyTheme 함수 재활용)
        if (window.applyTheme) {
            window.applyTheme(itemDetail.value);
        }

        // (2) DB에 저장
        try {
            await window.db.collection('users').doc(uid).update({
                equippedTheme: itemDetail.value
            });
            
            // (3) 로컬 정보 업데이트
            window.myInfo.equippedTheme = itemDetail.value;

            // (4) 성공 메시지 (토스트 or 알림)
            const msg = `🎨 [${itemDetail.name}] 적용 완료!`;
            if(window.showToast) window.showToast(msg); else alert(msg);
            
            // (5) 가방 화면 새로고침 (버튼 상태 갱신)
            if (window.renderInventory) window.renderInventory();

        } catch(e) {
            console.error(e);
            alert("저장 실패: " + e.message);
        }
    } else {
        // 테마가 아닌 아이템 (예: 랜덤박스 등)
        if (itemDetail.type === 'gacha') {
            alert("랜덤박스는 곧 오픈 예정입니다! 🎁");
        } else {
            alert("이 아이템은 사용할 수 없습니다. (소장용)");
        }
    }
};

// [logic.js] 댓글 저장 (즉시 반영 패치)
window.submitComment = async function(targetUid, text) {
    const myUid = localStorage.getItem('my_uid');
    const myName = (window.myInfo && window.myInfo.nickname) ? window.myInfo.nickname : '익명';
    
    try {
        // 1. DB에 저장
        await window.db.collection('comments').add({
            from_uid: myUid,
            from_name: myName,
            to_uid: targetUid,
            content: text,
            date: new Date().toISOString(),
            timestamp: new Date()
        });
        
        // 2. 토스트 메시지
        if (window.showToast) window.showToast("성공적으로 등록되었습니다! 💌");
        else alert("등록 완료!");

        // ★ [핵심 추가] 화면 즉시 갱신 로직
        // 지금 열려있는 방명록이 방금 글 쓴 그 사람 거라면?
        const container = document.getElementById(`gb-${targetUid}`);
        if (container) {
            // "이미 로딩됨" 태그를 떼버려서 강제로 다시 불러오게 만듦
            delete container.dataset.loaded; 
            
            // 다시 로딩! (그러면 방금 쓴 글까지 3개가 다시 촥- 뜸)
            window.loadUserGuestbook(targetUid);
        }
        
    } catch(e) {
        console.error(e);
        alert("저장 실패: " + e.message);
    }
};

// [logic.js] 📢 광장 & 우편함 데이터 로딩 (탭 구분 기능 추가)
window.refreshSquare = async function() {
    try {
        // 0. 현재 탭 확인 (기본값은 ALL)
        const mode = window.currentSquareTab || 'ALL'; 
        const myUid = localStorage.getItem('my_uid');

        // 1. 유저 정보 미리 가져오기 (닉네임 매칭용)
        // (성능을 위해 캐싱하면 좋지만, 일단 매번 가져옴)
        const userSnapshot = await window.db.collection('users').get();
        let usersMap = {};
        userSnapshot.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });

        // 2. DB 쿼리 분기 (여기가 핵심!)
        let query = window.db.collection('comments').orderBy('timestamp', 'desc').limit(30);

        if (mode === 'MY') {
            // ★ [내 소식]: 받는 사람이 '나'인 것만 필터링
            // (주의: 복합 인덱스 에러가 날 수 있으니, 에러 나면 콘솔 링크 클릭 필요)
            query = window.db.collection('comments')
                .where('to_uid', '==', myUid)
                .orderBy('timestamp', 'desc')
                .limit(50);
        }

        const commentSnapshot = await query.get();
        
        let feeds = [];
        commentSnapshot.forEach(doc => {
            let c = doc.data();
            // 보낸 사람 / 받는 사람 닉네임 찾기
            const fromUser = usersMap[c.from_uid];
            const toUser = usersMap[c.to_uid];
            
            c.from_name = fromUser ? fromUser.nickname : (c.from_name || '익명');
            c.to_name = toUser ? toUser.nickname : '알수없음';
            
            // 내 소식 탭에서는 '나에게' 보낸 거니까 굳이 @나 표시 안 해도 됨 (선택사항)
            
            feeds.push(c);
        });

        // 3. UI 그리기 (렌더링 함수 호출)
        if(window.renderSquareScreen) window.renderSquareScreen(Object.values(usersMap), feeds, mode);

    } catch(e) {
        console.error("광장 로딩 실패:", e);
        // ★ 중요: 인덱스 에러 처리
        if (e.code === 'failed-precondition') {
            alert("⚠️ 시스템 최적화가 필요합니다.\n개발자 콘솔(F12)의 링크를 눌러 인덱스를 생성해주세요.");
        }
    }
};

// [logic.js] 🎨 테마 적용 함수 (CSS 이름표 수정판)
window.applyTheme = function(themeValue) {
    // 1. 기존에 입고 있던 테마들 싹 벗기기 (style.css에 정의된 클래스명들)
    document.body.classList.remove('bg-dark', 'bg-gold', 'bg-pink'); 

    console.log(`🎨 테마 변경 요청: ${themeValue}`); // 확인용 로그

    // 2. 새 테마 입히기
    // (SHOP_ITEMS의 value가 'dark'일 때 -> CSS 클래스 'bg-dark'를 입힘)
    if (themeValue === 'dark' || themeValue === 'bg-dark') {
        document.body.classList.add('bg-dark'); 
    } 
    else if (themeValue === 'gold' || themeValue === 'bg-gold') {
        document.body.classList.add('bg-gold');
    } 
    else if (themeValue === 'pink' || themeValue === 'bg-pink') {
        document.body.classList.add('bg-pink');
    }
    
    // 'default'는 아무것도 안 붙이면 됨 (순정 상태)
};

// [logic.js] 1.구매 요청 (시스템 Alert 제거 버전)
window.requestBuy = function(itemId) {
    const myUid = localStorage.getItem('my_uid');
    if (!myUid) return alert("로그인 정보가 없습니다.");

    const item = window.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    // 1. 돈 부족 체크
    if ((window.myInfo.tokens || 0) < item.price) {
        // (여기도 나중에 예쁜 모달로 바꾸면 좋음)
        return alert("토큰이 부족합니다! 💎\n(운세나 투표로 벌어오세요!)");
    }

    // 2. [랜덤 박스]인 경우 -> 전용 구매 모달 띄우기!
    if (item.type === 'gacha') {
        // (1) 모달 찾기
        const overlay = document.getElementById('gachaBuyOverlay');
        const confirmBtn = document.getElementById('btnGachaConfirm');
        
        if (overlay && confirmBtn) {
            // (2) 확인 버튼에 '뽑기 함수' 연결
            // 기존 이벤트 제거를 위해 cloneNode 하거나, 그냥 덮어쓰기
            confirmBtn.onclick = function() {
                window.closePopup('gachaBuyOverlay'); // 창 닫고
                window.playGacha(item); // 뽑기 진행!
            };
            
            // (3) 모달 열기
            window.openPopup('gachaBuyOverlay');
        } else {
            // 혹시 모달 HTML이 없으면 비상용 confirm
            if(confirm(`💎 ${item.price} 토큰을 사용하여\n[${item.name}]를 여시겠습니까?`)) {
                window.playGacha(item);
            }
        }
        return; // 여기서 종료
    }

    // 3. [일반 아이템] 구매 로직 (기존 유지)
    const myInventory = window.myInfo.inventory || [];
    if (myInventory.some(saved => saved.id === item.id)) {
        return alert("이미 가지고 있는 아이템입니다.");
    }
    
    // 일반 아이템도 "살까요?" 묻고 싶으면 여기에 모달 추가 가능
    // 일단은 즉시 구매 처리
    window.buyItemProcess(item, myUid);
};

// [logic.js] 일반 구매 처리 함수 (분리됨)
window.buyItemProcess = async function(item, uid) {
    // 1. 메모리 갱신
    window.myInfo.tokens -= item.price;
    if (!window.myInfo.inventory) window.myInfo.inventory = [];
    
    // 저장할 값 (테마는 코드값, 일반은 아이콘)
    const saveValue = item.value || item.icon; 
    
    window.myInfo.inventory.push({ 
        id: item.id, 
        name: item.name, 
        type: item.type,
        value: saveValue,
        date: new Date().toISOString() 
    });

    // 2. DB 저장
    try {
        await window.db.collection('users').doc(uid).update({
            tokens: window.myInfo.tokens,
            inventory: window.myInfo.inventory
        });
        alert(`${item.name} 구매 완료! 🎉`);
        if (window.renderShop) window.renderShop();
    } catch(e) {
        console.error(e);
        alert("구매 중 오류가 발생했습니다.");
    }
};

// [logic.js] 2. 장착 요청 (DB ID 수정버전)
// [logic.js] 아이템 장착 요청 (상점 & 가방 공용)
window.requestEquip = function(itemId) {
    const myUid = localStorage.getItem('my_uid');
    if (!myUid) return alert("로그인 정보가 없습니다.");

    // 1. 아이템 정보 찾기 (상점 목록에서)
    const item = window.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || item.type !== 'theme') return; // 테마만 장착 가능

    // 2. 내 정보 업데이트 (메모리)
    window.myInfo.equippedTheme = item.value;

    // 3. DB 저장
    window.db.collection('users').doc(myUid).update({
        equippedTheme: item.value
    })
    .then(() => {
        // 4. ★ 화면 즉시 적용 (옷 갈아입기)
        if(window.applyTheme) window.applyTheme(item.value);
        // 혹시 ui.js의 applyActiveEffects를 쓴다면 아래 주석 해제
        // if(window.applyActiveEffects) window.applyActiveEffects();

        // 5. ★ UI 갱신 (여기가 핵심!)
        // 상점 화면이 켜져 있다면 -> 상점 버튼들 새로고침
        if (window.renderShop) window.renderShop();
        
        // 가방 화면이 켜져 있다면 -> 가방 리스트 새로고침
        if (window.renderInventory) window.renderInventory();
        
        // 안내 메시지
        const msg = `🎨 ${item.name} 적용 완료!`;
        if(window.showToast) window.showToast(msg); 
        else console.log(msg); // 알림이 너무 자주 뜨면 귀찮으니 콘솔로
    })
    .catch((error) => {
        console.error("장착 저장 실패:", error);
        alert("설정 저장에 실패했습니다.");
    });
};

// [logic.js] 3. 테마 CSS 적용 (세탁기)
window.applyTheme = function(themeValue) {
    // 기존 테마 클래스 제거
    document.body.classList.remove('theme-dark');
    
    // 새 테마 추가
    if (themeValue === 'dark') {
        document.body.classList.add('theme-dark');
    }
    // 'default'는 아무것도 안 붙이면 됨 (순정)
};

// ==========================================
// [logic.js] 📢 광장 (탭 전환 & 운세)
// ==========================================

// 0. 운세 메시지 데이터
const FORTUNE_MSGS = [
    "오늘은 생각지도 못한 행운이 찾아올 거예요! 🍀",
    "조금만 더 노력하면 목표를 이룰 수 있어요. 🔥",
    "지나친 걱정은 금물! 마음을 편하게 가지세요. ☕",
    "주변 사람에게 따뜻한 말 한마디를 건네보세요. 💖",
    "오늘은 새로운 도전을 하기에 완벽한 날입니다! 🚀",
    "뜻밖의 용돈이 생길지도 몰라요! 💰",
    "당신의 매력이 폭발하는 날! 자신감을 가지세요. ✨",
    "잠시 휴식을 취하며 재충전의 시간을 가지세요. 🔋"
];

// 1. 탭 전환 함수 (HTML에서 호출하는 그 녀석!)
window.switchSquareTab = function(mode) {
    window.currentSquareTab = mode; // 현재 탭 상태 저장 ('ALL', 'MY', 'LUCK')
    
    // (1) 버튼 스타일 초기화 (전부 회색으로)
    ['All', 'My', 'Luck'].forEach(k => {
        const btn = document.getElementById(`tabSquare${k}`);
        if(btn) btn.className = 'tab-toggle-btn';
    });
    
    // (2) 선택된 버튼만 활성화 (보라색 밑줄)
    // mode가 'ALL'이면 'All', 'LUCK'이면 'Luck' 찾기
    const idSuffix = mode.charAt(0) + mode.slice(1).toLowerCase(); 
    const activeBtn = document.getElementById(`tabSquare${idSuffix}`);
    if(activeBtn) activeBtn.className = 'tab-toggle-btn active';

    // (3) 화면 구역 보이기/숨기기
    const feedArea = document.getElementById('squareFeed');     // 댓글 리스트
    const fortuneArea = document.getElementById('squareFortune'); // 쿠키 화면
    const refreshBtn = document.getElementById('btnRefreshSquare'); // 새로고침 버튼
    const title = document.getElementById('squareListTitle');   // 제목 텍스트

    if (mode === 'LUCK') {
        // [🥠 운세 탭]
        if(feedArea) feedArea.style.display = 'none';
        if(fortuneArea) fortuneArea.style.display = 'block'; // 쿠키 등장
        if(refreshBtn) refreshBtn.style.display = 'none';    // 운세엔 새로고침 필요 없음
        if(title) title.innerText = "📅 오늘의 운세";
        
        // 오늘 이미 했는지 체크해서 화면 세팅
        window.checkDailyFortuneUI();
        
    } else {
        // [📢 전체 / 💌 내 소식 탭]
        if(feedArea) feedArea.style.display = 'flex'; // 리스트 등장
        if(fortuneArea) fortuneArea.style.display = 'none';
        if(refreshBtn) refreshBtn.style.display = 'block';
        if(title) title.innerText = (mode === 'ALL') ? "💬 실시간 톡" : "💌 나에게 온 메시지";
        
        // 데이터 불러오기 (전체 or 내 거)
        if(window.refreshSquare) window.refreshSquare();
    }
};

// [logic.js] 2. 오늘 쿠키 상태 확인 (UI 갱신용 - 무한리필 방지판 🚫)
window.checkDailyFortuneUI = function() {
    // 한국 시간 기준 날짜 문자열 (예: "2023. 12. 19.")
    const today = new Date().toLocaleDateString(); 
    const myUid = localStorage.getItem('my_uid');
    
    // 저장된 데이터 가져오기
    const savedDataStr = localStorage.getItem('dailyFortuneData_' + myUid);
    let savedData = null;
    
    if (savedDataStr) {
        try { savedData = JSON.parse(savedDataStr); } catch(e) {}
    }

    const emoji = document.getElementById('cookieEmoji');
    const msg = document.getElementById('cookieMsg');
    
    if (!emoji || !msg) return;

    // (A) 오늘 이미 했음 -> 결과 복원 & 클릭 금지
    if (savedData && savedData.date === today) {
        emoji.innerHTML = '🎊';
        emoji.onclick = null; // ★ 핵심: 클릭 이벤트 제거
        emoji.style.cursor = 'default';
        emoji.classList.remove('cookie-shake');
        
        msg.innerHTML = `
            <div class="fortune-result" style="animation:none;">
                <div style="font-size:16px; font-weight:bold; color:#333; margin-bottom:8px;">
                    "${savedData.msg}"
                </div>
                <div style="color:#6c5ce7; font-weight:bold;">
                    (획득 완료) 💎 ${savedData.reward} 토큰
                </div>
            </div>
            <div style="font-size:13px; color:#999; margin-top:15px; font-weight:normal;">
                🍪 오늘 운세를 확인했습니다. 내일 또 오세요! 👋
            </div>
        `;
    } 
    // (B) 아직 안 함 -> 클릭 허용
    else {
        emoji.innerHTML = '🥠';
        emoji.onclick = window.breakCookie; // ★ 핵심: 여기서만 클릭 부여
        emoji.style.cursor = 'pointer';
        emoji.classList.add('cookie-shake');
        msg.innerText = "터치해서 쿠키를 열어보세요!";
    }
};

// [logic.js] 3. 쿠키 깨기 액션! (저장 & 중복방지 & 🎉폭죽 추가판)
window.breakCookie = async function() {
    const emoji = document.getElementById('cookieEmoji');
    const msg = document.getElementById('cookieMsg');
    
    // 1. 누르자마자 클릭 기능 즉시 삭제 (따닥 방지)
    emoji.onclick = null; 
    emoji.style.cursor = 'default';
    emoji.classList.remove('cookie-shake');
    
    msg.innerText = "두근두근...";
    
    // 0.5초 딜레이
    await new Promise(r => setTimeout(r, 500));

    // 2. 결과 뽑기
    const randomMsg = FORTUNE_MSGS[Math.floor(Math.random() * FORTUNE_MSGS.length)];
    const reward = Math.floor(Math.random() * 41) + 10; 

    // 3. 데이터 저장 (한국 시간 기준)
    const today = new Date().toLocaleDateString();
    const myUid = localStorage.getItem('my_uid');

    // DB 및 로컬 업데이트
    window.myInfo.tokens = (window.myInfo.tokens || 0) + reward;
    window.db.collection('users').doc(myUid).update({
        tokens: window.myInfo.tokens
    });
    
    // 오늘 뽑은 데이터 저장
    const fortuneData = {
        date: today,
        msg: randomMsg,
        reward: reward
    };
    localStorage.setItem('dailyFortuneData_' + myUid, JSON.stringify(fortuneData));

    // 4. 결과 화면 보여주기
    emoji.innerHTML = '🎊';
    msg.innerHTML = `
        <div class="fortune-result">
            <div style="font-size:16px; font-weight:bold; color:#333; margin-bottom:8px;">
                "${randomMsg}"
            </div>
            <div style="color:#6c5ce7; font-weight:bold;">
                + 💎 ${reward} 토큰 획득!
            </div>
        </div>
        <div style="font-size:13px; color:#999; margin-top:15px; font-weight:normal;">
            🍪 오늘 운세를 확인했습니다. 내일 또 오세요! 👋
        </div>
    `;
    
    // 상단 토큰 UI 갱신
    if(window.updateTokenUI) window.updateTokenUI(); 
    if(window.updateMyInfoUI) window.updateMyInfoUI();

    // ★ 핵심 추가: 축하 폭죽 발사! 🎉
    // (우승 화면과 동일한 설정: 적당한 양, 중앙에서 약간 위에서 퍼짐)
    if (typeof confetti === 'function') {
        confetti({ 
            particleCount: 150, // 색종이 개수
            spread: 70,         // 퍼지는 각도
            origin: { y: 0.6 }  // 발사 위치 (0:상단, 1:하단, 0.6:중앙 약간 아래)
        });
    }
};

// [logic.js] 🎲 랜덤 박스 뽑기 (모달 버전)
window.playGacha = async function(boxItem) {
    const myUid = localStorage.getItem('my_uid');

    // 1. 토큰 차감
    window.myInfo.tokens -= boxItem.price;
    if(window.renderShop) window.renderShop();

    // 2. 확률 로직 (기존과 동일)
    const rand = Math.random() * 100;
    let result = null;

    // ★ UI에 보여줄 아이콘과 텍스트 분리
    let displayIcon = '';
    let displayName = '';
    let displaySub = '';

// ▼▼▼ 확률 조정 (매운맛) ▼▼▼
    // [비용: 20 토큰]
    
    if (rand < 50) { 
        // 50%확률: 10 토큰 (10원 손해 📉)
        result = { type: 'token', amount: 10 };
        displayIcon = '🪙';
        displayName = '10 토큰';
        displaySub = '아쉽네요.. 다음 기회에! 🥲';
    } 
    else if (rand < 80) { 
        // 30%확률: 30 토큰 (10원 이득 📈)
        result = { type: 'token', amount: 30 };
        displayIcon = '💎';
        displayName = '30 토큰';
        displaySub = '소소한 이득입니다! 👍';
    } 
    else if (rand < 95) { 
        // 15%확률: 티켓 1장 (80원 이득 🔥) - 이제 잘 안 나옴!
        result = { type: 'ticket', amount: 1 };
        displayIcon = '🎫';
        displayName = '티켓 1장';
        displaySub = '나이스! 토너먼트 한 판 고? 🎉';
    } 
    else { 
        // 5%확률: 대박 (네온 스킨 or 300토큰)
        const hasNeon = window.myInfo.inventory.some(i => i.id === 'theme_neon');
        if (hasNeon) {
            result = { type: 'token', amount: 300 };
            displayIcon = '💰';
            displayName = '300 토큰';
            displaySub = '전설 스킨 중복! (환불금) 🤑';
        } else {
            result = { type: 'item', id: 'theme_neon' };
            displayIcon = '👾';
            displayName = '✨ [전설] 네온 모드 ✨';
            displaySub = '와우! 극악의 확률을 뚫으셨군요! 🔥';
        }
    }
    // ▲▲▲▲▲▲
	
    // 3. 데이터 저장 & 지급 처리
    try {
        let updates = { tokens: window.myInfo.tokens };

        if (result.type === 'ticket') {
            window.myInfo.tickets = (window.myInfo.tickets || 0) + result.amount;
            updates.tickets = window.myInfo.tickets;
        } 
        else if (result.type === 'token') {
            window.myInfo.tokens += result.amount;
            updates.tokens = window.myInfo.tokens;
        }
        else if (result.type === 'item') {
            const neonItem = window.SHOP_ITEMS.find(i => i.id === result.id);
            if(neonItem) {
                window.myInfo.inventory.push({
                    id: neonItem.id,
                    name: neonItem.name,
                    type: neonItem.type,
                    value: neonItem.value,
                    date: new Date().toISOString()
                });
                updates.inventory = window.myInfo.inventory;
            }
        }

        await window.db.collection('users').doc(myUid).update(updates);

        // 4. ★ 폭죽 터뜨리기 (모달 뜨기 직전!)
        if (typeof confetti === 'function') {
            // 중앙에서 펑!
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        
        // 5. ★ 모달 띄우기 (Alert 대체)
        const overlay = document.getElementById('gachaResultOverlay');
        const iconEl = document.getElementById('gachaResultIcon');
        const nameEl = document.getElementById('gachaResultName');
        const subEl = document.getElementById('gachaResultSub');

        if(overlay && iconEl && nameEl) {
            iconEl.innerText = displayIcon;
            nameEl.innerText = displayName;
            subEl.innerText = displaySub;
            
            // 모달 열기
            overlay.classList.add('open');
        } else {
            // 혹시 모달 HTML 안 넣었을 경우 대비
            alert(`🎁 [${displayName}]\n${displaySub}`);
        }

        // 화면 갱신
        if (window.renderShop) window.renderShop();
        if (window.updateTicketUI) window.updateTicketUI();

    } catch(e) {
        console.error(e);
        alert("오류가 발생했습니다. (토큰 롤백)");
        window.myInfo.tokens += boxItem.price; 
    }
};

// [logic.js] 랭킹 상세 토글 & 방명록 로딩
window.toggleRankDetail = function(element, targetUid) {
    const isOpen = element.classList.contains('expanded');
    
    // 1. 다른 거 다 닫기
    const allItems = document.querySelectorAll('#rankListContainer .list-item');
    allItems.forEach(item => item.classList.remove('expanded'));

    // 2. 열기 & 데이터 로딩
    if (!isOpen) {
        element.classList.add('expanded');
        // ★ 열릴 때 서버에서 댓글 가져오기!
        if(targetUid) window.loadUserGuestbook(targetUid);
    }
};

// [logic.js] 방명록 데이터 가져오기 (최신 3개)
window.loadUserGuestbook = async function(targetUid) {
    const container = document.getElementById(`gb-${targetUid}`);
    if(!container) return;

    try {
        // 이미 로딩된 적 있으면 패스 (데이터 절약)
        if(container.dataset.loaded === "true") return;

        container.innerHTML = '<div class="empty-guestbook">로딩 중... ⏳</div>';

        // DB 조회: to_uid가 targetUid인 댓글 중 최신 3개
        const snapshot = await window.db.collection('comments')
            .where('to_uid', '==', targetUid)
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-guestbook">아직 받은 메시지가 없어요 🕸️</div>';
        } else {
            let html = '';
            snapshot.forEach(doc => {
                const c = doc.data();
                html += `
                    <div class="guestbook-msg">
                        <span class="from">${c.from_name || '익명'}:</span> ${c.content}
                    </div>
                `;
            });
            container.innerHTML = html;
        }
        
        // 로딩 완료 표시
        container.dataset.loaded = "true";

    } catch(e) {
        console.error("방명록 로딩 실패:", e);
        // 인덱스 에러일 수 있으니 콘솔 확인 필요 (복합 쿼리 시)
        if(e.code === 'failed-precondition') {
             container.innerHTML = '<div class="empty-guestbook">시스템 준비 중 (인덱스 필요)</div>';
        } else {
             container.innerHTML = '<div class="empty-guestbook">로딩 실패 😢</div>';
        }
    }
};
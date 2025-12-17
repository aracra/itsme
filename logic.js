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
window.initGame = function() {
    const myUid = localStorage.getItem('my_uid');
    
    // 1. 로그인 체크
    if (!myUid) {
        console.log("로그인 필요");
        if(window.updateStatus) window.updateStatus("로그인 필요", "wait");
        return;
    }

    // 2. 내 정보 실시간 감시
    window.db.collection('users').doc(myUid).onSnapshot((doc) => {
        if (doc.exists) {
            window.myInfo = doc.data();
            // 티켓이 undefined면 0으로 처리
            if(window.myInfo.tickets === undefined) window.myInfo.tickets = 0;
            
            if(window.updateMyInfoUI) window.updateMyInfoUI();
            if(window.updateStatus) window.updateStatus("🟢 준비 완료", "ok");

            // 3. 후보자 데이터 로딩 (없으면)
            if (!window.candidates || window.candidates.length === 0) {
                window.loadCandidatesFromDB();
            }
        }
    });
};

// 후보자 불러오기
window.loadCandidatesFromDB = async function() {
    if (!window.db) return;
    const myUid = localStorage.getItem('my_uid');
    try {
        const snapshot = await window.db.collection('users').get();
        const list = [];
        snapshot.forEach(doc => {
            if (doc.id !== myUid) { // 나는 제외
                list.push({ id: doc.id, ...doc.data() });
            }
        });
        window.candidates = list;
        console.log(`📦 후보자 ${list.length}명 로드됨`);
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
window.renderInventory = function() {
    // 1. 그릴 위치 찾기
    const container = document.getElementById('inventoryListArea'); 
    // (주의: index.html의 가방 모달 안에 <div id="inventoryListArea"></div> 가 있어야 함!)
    if (!container) return;
    
    container.innerHTML = '';
    
    // 2. 내 가방 데이터 가져오기 (없으면 빈 배열)
    const myInv = (window.myInfo && window.myInfo.inventory) ? window.myInfo.inventory : [];
    
    // 현재 장착 중인 테마 (변수명 통일: equippedTheme)
    const currentTheme = window.myInfo.equippedTheme || 'default'; 

    if (myInv.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">가방이 텅 비었어요 🕸️</div>';
        return;
    }

    // 3. 목록 그리기 (최신순)
    [...myInv].reverse().forEach(savedItem => {
        // ★ 핵심: 저장된 ID(savedItem.id)로 원본 정보(이름, 아이콘) 찾기!
        // (SHOP_ITEMS는 ui.js에 전역변수로 있으므로 접근 가능)
        const itemDetail = window.SHOP_ITEMS.find(s => s.id === savedItem.id);

        // 아이템 정보가 없으면(상점에서 삭제된 아이템 등) 건너뜀
        if (!itemDetail) return;

        // 장착 여부 확인 (테마인 경우만)
        const isEquipped = (itemDetail.type === 'theme' && itemDetail.value === currentTheme);
        
        let btnHtml = '';

        if (itemDetail.type === 'theme') {
            if (isEquipped) {
                // 이미 착용 중
                btnHtml = `<button disabled style="background:#4cd137; color:white; border:none; padding:6px 12px; border-radius:5px; font-size:12px;">착용중 ✅</button>`;
            } else {
                // 착용 가능 -> equipItem 호출
                btnHtml = `<button onclick="window.equipItem('${itemDetail.id}')" style="background:#6c5ce7; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-size:12px;">착용</button>`;
            }
        } else {
            // 소모품 등
            btnHtml = `<span style="font-size:12px; color:#aaa;">소장용</span>`;
        }

        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; margin-bottom:8px; border-bottom:1px solid #eee;';
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size:24px;">${itemDetail.icon || '📦'}</div>
                <div>
                    <div style="font-weight:bold; font-size:14px; color:#333;">${itemDetail.name}</div>
                    <div style="font-size:11px; color:#888;">${itemDetail.desc || itemDetail.type}</div>
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

// [logic.js] 댓글 DB 저장 함수
window.submitComment = async function(targetUid, text) {
    const myUid = localStorage.getItem('my_uid');
    const myName = (window.myInfo && window.myInfo.nickname) ? window.myInfo.nickname : '익명';
    
	try {
        await window.db.collection('comments').add({
            from_uid: myUid,
            from_name: myName,
            to_uid: targetUid,
            content: text,
            date: new Date().toISOString(),
            timestamp: new Date()
        });
        
        // [수정] alert 대신 토스트 사용! 🍞
        if (window.showToast) {
            window.showToast("성공적으로 등록되었습니다! 💌");
        } else {
            alert("성공적으로 등록되었습니다! 💌");
        }
        
    } catch(e) {
        console.error(e);
        alert("저장 실패: " + e.message);
    }
};


// [logic.js] 📢 광장 데이터 가져오기
window.refreshSquare = async function() {
    try {
        // 1. 랭킹 데이터 (users)
        const userSnapshot = await window.db.collection('users').get();
        let users = [];
        userSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        
        // 점수 내림차순 정렬
        users.sort((a, b) => {
            const scoreA = Object.values(a.stats || {}).reduce((sum, v) => sum + v, 0);
            const scoreB = Object.values(b.stats || {}).reduce((sum, v) => sum + v, 0);
            return scoreB - scoreA;
        });

        // 2. 피드 데이터 (comments, 최신 30개)
        const commentSnapshot = await window.db.collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(30)
            .get();
        
        let feeds = [];
        // 댓글에 '받는 사람 닉네임' 매칭
        for (let doc of commentSnapshot.docs) {
            let c = doc.data();
            const targetUser = users.find(u => u.id === c.to_uid);
            c.to_name = targetUser ? targetUser.nickname : '알수없음';
            feeds.push(c);
        }

        // 3. UI 그리기
        if(window.renderSquareScreen) window.renderSquareScreen(users, feeds);

    } catch(e) {
        console.error("광장 로딩 실패:", e);
    }
};

// [logic.js] 🎨 테마 적용 함수 (기존 테마 벗기기 포함)
window.applyTheme = function(themeName) {
    // 1. 기존 테마 클래스 싹 지우기 (초기화)
    document.body.classList.remove('theme-dark', 'theme-mint', 'theme-pink'); 
    // (나중에 테마가 늘어나면 여기 리스트에도 추가해야 함)

    // 2. 새 테마 입히기
    if (themeName === 'dark') {
        document.body.classList.add('theme-dark');
    } else if (themeName === 'mint') {
        document.body.classList.add('theme-mint');
    } else if (themeName === 'pink') {
        document.body.classList.add('theme-pink');
    } 
    // 'default'일 경우 아무 클래스도 안 붙이면 그게 기본 테마!

    console.log(`🎨 테마 적용 완료: ${themeName || '기본'}`);
};

// [logic.js] 1. 구매 요청 (DB ID 수정버전)
window.requestBuy = function(itemId) {
    // ★ 확실한 내 ID 가져오기
    const myUid = localStorage.getItem('my_uid'); 
    if (!myUid) return alert("로그인 정보가 없습니다.");

    const item = window.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    // 돈 체크
    if ((window.myInfo.tokens || 0) < item.price) {
        alert("돈이 부족합니다! 💎");
        return;
    }

    // 1) 돈 차감 & 인벤토리 추가
    window.myInfo.tokens -= item.price;
    if (!window.myInfo.inventory) window.myInfo.inventory = [];
    window.myInfo.inventory.push({ id: item.id, date: new Date() });

    // 2) DB 저장 (여기가 핵심 수정!)
    window.db.collection('users').doc(myUid).update({
        tokens: window.myInfo.tokens,
        inventory: window.myInfo.inventory
    })
    .then(() => {
        // 성공해야만 UI 갱신
        alert(`${item.name} 구매 완료! 🎉`);
        if (window.renderShop) window.renderShop();
    })
    .catch((error) => {
        console.error("구매 저장 실패:", error);
        alert("저장에 실패했습니다.");
    });
};

// [logic.js] 2. 장착 요청 (DB ID 수정버전)
window.requestEquip = function(itemId) {
    const myUid = localStorage.getItem('my_uid');
    if (!myUid) return alert("로그인 정보가 없습니다.");

    const item = window.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || item.type !== 'theme') return;

    // 1) 내 정보 업데이트
    window.myInfo.equippedTheme = item.value;

    // 2) DB 저장
    window.db.collection('users').doc(myUid).update({
        equippedTheme: item.value
    })
    .then(() => {
        // 3) 화면 적용
        window.applyTheme(item.value);

        // 4) UI 갱신
        if (window.renderShop) window.renderShop();
        
        const msg = `🎨 ${item.name} 적용 완료!`;
        if(window.showToast) window.showToast(msg); else alert(msg);
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

// 2. 오늘 쿠키 상태 확인 (UI 갱신용)
window.checkDailyFortuneUI = function() {
    const today = new Date().toISOString().slice(0, 10); // "2023-12-18"
    const myUid = localStorage.getItem('my_uid');
    const lastDate = localStorage.getItem('lastFortuneDate_' + myUid);

    const emoji = document.getElementById('cookieEmoji');
    const msg = document.getElementById('cookieMsg');
    
    if (!emoji || !msg) return;

    if (lastDate === today) {
        // 이미 함 (오늘 날짜가 저장되어 있음)
        emoji.innerHTML = '🍪'; // 깨진 쿠키 모양
        emoji.onclick = null;   // 클릭 방지
        emoji.classList.remove('cookie-shake');
        msg.innerHTML = `<span style="color:#888;">오늘 운세를 확인했습니다.<br>내일 또 오세요! 👋</span>`;
    } else {
        // 아직 안 함
        emoji.innerHTML = '🥠';
        emoji.onclick = window.breakCookie; // 클릭하면 깨짐
        emoji.classList.add('cookie-shake'); // 흔들흔들 애니메이션
        msg.innerText = "터치해서 쿠키를 열어보세요!";
    }
};

// 3. 쿠키 깨기 액션! (보상 지급)
window.breakCookie = async function() {
    const emoji = document.getElementById('cookieEmoji');
    const msg = document.getElementById('cookieMsg');
    
    // (1) 두근두근 연출
    emoji.classList.remove('cookie-shake'); // 흔들림 멈춤
    msg.innerText = "두근두근...";
    
    // 0.5초 딜레이 (긴장감)
    await new Promise(r => setTimeout(r, 500));

    // (2) 결과 뽑기 (랜덤)
    const randomMsg = FORTUNE_MSGS[Math.floor(Math.random() * FORTUNE_MSGS.length)];
    const reward = Math.floor(Math.random() * 41) + 10; // 10 ~ 50 토큰 랜덤

    // (3) 데이터 저장
    const today = new Date().toISOString().slice(0, 10);
    const myUid = localStorage.getItem('my_uid');

    // 내 돈 올리기
    window.myInfo.tokens = (window.myInfo.tokens || 0) + reward;
    
    // DB 업데이트
    window.db.collection('users').doc(myUid).update({
        tokens: window.myInfo.tokens
    });
    
    // "오늘 함" 도장 찍기 (로컬스토리지)
    localStorage.setItem('lastFortuneDate_' + myUid, today);

    // (4) 결과 화면 보여주기
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
    `;
    
    // 상단 토큰 UI 갱신 (만약 함수가 있다면)
    if(window.updateTokenUI) window.updateTokenUI(); 
};
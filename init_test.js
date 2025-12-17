// init_test.js
// Version: v19.16.9 (Dev Button Fix & Auto Medic)

console.log("🚧 개발자 모듈 로드됨");

// 1. 개발자 버튼 연결 (이게 있어야 버튼이 눌림!)
window.initializeTestDB = async function() {
    if(!confirm("⚠️ 데이터를 초기화하고 NPC를 재생성하시겠습니까?")) return;
    if(!window.db) return alert("DB 연결 중...");
    
    // NPC 생성 로직...
    await window.createNPCs(); 
};

window.refillTickets = async function() {
    const uid = localStorage.getItem('my_uid');
    if(!uid) return;
    await window.db.collection('users').doc(uid).update({ tickets: 5 });
    if(window.myInfo) window.myInfo.tickets = 5;
    if(window.updateTicketUI) window.updateTicketUI();
    alert("🎫 티켓 충전 완료!");
};

window.addRichTokens = async function() {
    const uid = localStorage.getItem('my_uid');
    if(!uid) return;
    await window.db.collection('users').doc(uid).update({ tokens: firebase.firestore.FieldValue.increment(10000) });
    alert("💰 10,000 토큰 지급!");
};

window.createNPCs = async function() {
    const npcList = [
        { name: "개굴선배", mbti: "ENTP", icon: "🐸" },
        { name: "시니컬한 고양이", mbti: "INTJ", icon: "🐱" },
        { name: "열정맨 강아지", mbti: "ESFJ", icon: "🐶" },
        { name: "나무늘보", mbti: "ISFP", icon: "🦥" },
        { name: "똑똑한 부엉이", mbti: "INTP", icon: "🦉" },
        { name: "화려한 공작", mbti: "ENTJ", icon: "🦚" },
        { name: "수다쟁이 앵무새", mbti: "ESFP", icon: "🦜" },
        { name: "든든한 곰", mbti: "ISTJ", icon: "🐻" }
    ];

    const batch = window.db.batch();
    npcList.forEach((npc, i) => {
        const ref = window.db.collection('users').doc(`npc_${i+1}`);
        batch.set(ref, {
            nickname: npc.name, avatar: npc.icon, mbti: npc.mbti,
            stats: { strength: 50, speed: 50, intelligence: 80, luck: 50, charisma: 50, empathy: 50 },
            tickets: 5, tokens: 0, is_npc: true, createdAt: new Date().toISOString()
        });
    });
    await batch.commit();
    alert("✅ NPC 생성 및 개굴선배 치료 완료!");
    location.reload();
};


// 2. [자동 실행] NaN 환자 치료 & 자동 로그인
window.addEventListener('load', async () => {
    // (1) 자동 로그인
    const savedUid = localStorage.getItem('my_uid');
    const loginScreen = document.getElementById('screen-login');
    if (savedUid && loginScreen && loginScreen.classList.contains('active')) {
        console.log("🚀 자동 로그인...");
        document.getElementById('mainContainer').classList.add('logged-in');
        if(window.goTab) window.goTab('screen-main', document.querySelector('.nav-item:first-child'));
        if(window.initGame) window.initGame();
    }

    // (2) 개굴선배 및 NaN 환자 치료
    setTimeout(async () => {
        if(!window.candidates) return;
        // 스탯이 없거나 깨진(NaN) 친구 찾기
        const sickPatients = window.candidates.filter(u => !u.stats || isNaN(u.stats.intelligence));
        
        if (sickPatients.length > 0) {
            console.log(`🚑 ${sickPatients.length}명의 환자 발견! 치료 시작...`);
            const batch = window.db.batch();
            sickPatients.forEach(p => {
                const ref = window.db.collection('users').doc(p.id);
                batch.set(ref, {
                    stats: { strength: 50, speed: 50, intelligence: 50, luck: 50, charisma: 50, empathy: 50 }
                }, { merge: true });
            });
            await batch.commit();
            console.log("💉 전원 치료 완료! (랭킹 갱신 필요)");
            if(window.renderRankList) window.renderRankList();
        }
    }, 2000); // 2초 뒤 실행
});
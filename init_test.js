// [init_test.js] 개발자 모드 전용 스크립트
// Version: v19.16.0
console.log("🚧 개발자 테스트 모듈(init_test.js) 로드됨");

// 1. 🔄 DB 리셋 및 초기화 (HTML의 'initializeTestDB'와 연결됨)
window.initializeTestDB = async function() {
    if (!confirm("🚨 [개발자 모드] 경고!\n\n데이터가 초기화됩니다:\n- 내 지갑: 1000토큰 지급\n- 내 가방: 초기화\n- 친구: 8명 봇 생성\n\n진행하시겠습니까?")) return;

    const db = window.db;
    const myUid = localStorage.getItem('my_uid');
    
    console.log("🧹 DB 대청소 및 초기 세팅 시작...");

    try {
        // (1) 🐯 '나(Player)' 다시 만들기 (지갑 두둑하게!)
        const myData = {
            nickname: "개굴선배", // 닉네임 (필요시 변경)
            mbti: "ENTP",      // MBTI (필요시 변경)
            stats: {           
                strength: 20, speed: 20, intelligence: 20, 
                luck: 20, charisma: 20, empathy: 20
            },
            tokens: 1000,      // 💎 테스트 자금 (1000원)
            inventory: [],     // 🎒 빈 가방
            avatar: "🐸",
            bgEffect: null,    // 배경 초기화
            joinedAt: new Date()
        };

        await db.collection('users').doc(myUid).set(myData);
        console.log("✅ 내 데이터 생성 완료!");

        // (2) 🤖 '토너먼트용 친구 8명' 만들기
        const botNames = ["알파고", "베타고", "감마고", "델타고", "오메가", "제타", "시그마", "파이"];
        const botMbtis = ["INTJ", "ENFP", "ISTJ", "ESFJ", "INTP", "ENTJ", "ISFP", "ESTP"];

        for (let i = 0; i < 8; i++) {
            const botId = `bot_${i+1}`;
            const botData = {
                nickname: botNames[i],
                mbti: botMbtis[i],
                stats: { // 랜덤 스탯
                    strength: Math.floor(Math.random() * 30),
                    speed: Math.floor(Math.random() * 30),
                    intelligence: Math.floor(Math.random() * 30),
                    luck: Math.floor(Math.random() * 30),
                    charisma: Math.floor(Math.random() * 30),
                    empathy: Math.floor(Math.random() * 30)
                },
                tokens: 0,
                inventory: [],
                avatar: "🤖",
                bgEffect: null,
                isBot: true
            };
            await db.collection('users').doc(botId).set(botData);
        }
        console.log("✅ 봇 8명 생성 완료!");

        alert("🎉 개발자 리셋 완료! (새로고침 됩니다)");
        location.reload();

    } catch (error) {
        console.error("❌ 리셋 중 오류 발생:", error);
        alert("리셋 실패! 콘솔을 확인하세요.");
    }
};

// 2. 💰 돈복사 (HTML의 'addRichTokens'와 연결)
window.addRichTokens = async function() {
    const myUid = localStorage.getItem('my_uid');
    // 현재 돈 + 10000원 추가
    await window.db.collection('users').doc(myUid).update({
        tokens: firebase.firestore.FieldValue.increment(10000)
    });
    alert("💰 10,000 토큰이 입금되었습니다!");
    location.reload(); // 화면 갱신을 위해 새로고침
};

// 3. 🎫 티켓 충전 (HTML의 'refillTickets'와 연결 - 필요하면 구현)
window.refillTickets = function() {
    alert("🎫 티켓 충전 기능은 아직 구현 중입니다! (DB 필드 확인 필요)");
};
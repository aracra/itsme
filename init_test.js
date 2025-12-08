// init_test.js 파일 (Full Code: Patch v3.5)

console.log("======================================");
console.log("🚀 DB 초기화 스크립트 로드 중... (자체 초기화)");
console.log("======================================");

// [🔥 v3.1 수정: Firebase 앱 강제 초기화 로직 안전화]
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    if (window.firebaseConfig) { 
        // logic.js에서 노출된 config를 사용하여 강제 초기화
        firebase.initializeApp(window.firebaseConfig);
        console.log("Firebase 앱 (DEFAULT) 강제 초기화 완료.");
    } else {
        console.warn("Firebase Config를 logic.js에서 로드하지 못했습니다. 초기화 스크립트 실행 불가.");
    }
} 

// ========================================
// 1. 초기 데이터 정의 (Firebase 종속성이 없는 데이터만 상단에 유지)
// ========================================
const TEST_USERS = [
    { 
        id: 'user_friend_1', nickname: '판교 불주먹', avatar: '👊', mbti: 'ESTP', 
        desc: '말보다 행동이 앞서는 리더!', stats: [95, 80, 70, 60, 90, 50], 
        tokens: 100, achievedIds: ['ach_01'], login_count: 5, vote_count: 12, comment_count: 3, purchase_count: 0
    },
    { 
        id: 'user_friend_2', nickname: '시크릿 가든', avatar: '🐰', mbti: 'INFJ', 
        desc: '고요함 속에서 강한 멘탈을 가졌어요.', stats: [70, 50, 95, 90, 40, 30], 
        tokens: 50, achievedIds: ['ach_01', 'ach_08'], login_count: 3, vote_count: 8, comment_count: 1, purchase_count: 0
    },
    { 
        id: 'user_friend_3', nickname: 'AI 개발자', avatar: '🤖', mbti: 'INTP', 
        desc: '모든 것을 논리로 해결하는 논리 괴물.', stats: [90, 60, 80, 50, 40, 70], 
        tokens: 70, achievedIds: ['ach_01', 'ach_05'], login_count: 10, vote_count: 20, comment_count: 5, purchase_count: 1
    }
];

const TEST_QUESTIONS = [
    { text: "프로젝트 마감일이 당겨지면 어떻게 반응하나요?", type: 2 }, 
    { text: "회의 중 뜬금없는 아이디어를 낼 때가 있나요?", type: 5 }, 
    { text: "처음 보는 사람과도 어색함 없이 대화하나요?", type: 4 }, 
    { text: "복잡한 문제도 차분하게 분석하나요?", type: 0 }, 
    { text: "주변 사람의 감정 변화를 잘 알아차리나요?", type: 3 }, 
    { text: "갑작스러운 돌발 상황에 재치있게 대처하나요?", type: 1 }  
];

// ========================================
// 2. DB 삽입 로직
// ========================================
window.initializeTestDB = async function() { 
    // [🔥 v3.4 수정: window에서 db와 FieldValue를 가져옴과 동시에 유효성 검사 강화]
    const db = window.db;
    const FieldValue = window.FieldValue;

    if (!db || !FieldValue || typeof firebase === 'undefined' || !firebase.firestore || !firebase.firestore.Timestamp) {
        alert("Firebase SDK가 완전히 로드되지 않았습니다. 잠시 후 다시 시도하거나, 콘솔 오류를 확인하세요.");
        console.error("DB/FieldValue/Timestamp 중 하나 이상 미정의! logic.js와 Firebase SDK 로드 상태를 확인하세요."); 
        return;
    }

    if (!confirm("🚨 경고: Firestore에 테스트 데이터를 덮어쓰시겠습니까?")) {
        console.log("테스트 DB 초기화 취소.");
        return;
    }
    
    // [🔥 v3.2 수정: Firebase 종속 데이터를 함수 호출 시점에 정의]
    const TEST_LOGS = [
        { 
            target_uid: 'user_friend_1', sender_uid: 'user_me', action_type: 'VOTE', stat_type: 4, score_change: 20, 
            message: "나(Me)님이 투표하여 [텐션] 점수를 받았습니다.", is_read: false, 
            timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-06T14:00:00'))
        },
        { 
            target_uid: 'user_friend_1', sender_uid: 'anonymous', action_type: 'VOTE', stat_type: 0, score_change: 20, 
            message: "익명 투표로 [지성] 점수를 받았습니다.", is_read: false, 
            timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-06T14:05:00'))
        },
        { 
            target_uid: 'user_friend_1', sender_uid: 'user_me', action_type: 'ACHIEVE', stat_type: -1, score_change: 10, 
            message: "업적 [소중한 한 표]를 달성했습니다. 토큰 10개 획득!", is_read: false, 
            timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-06T14:10:00'))
        }
    ];

    const TEST_ROLLING_VOTES = [
         { stat_type: 4, score_change: 20, timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-06T14:00:00')) },
         { stat_type: 0, score_change: 20, timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-06T14:05:00')) },
         { stat_type: 5, score_change: 10, timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-05T10:00:00')) },
         { stat_type: 1, score_change: 10, timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-04T10:00:00')) },
         { stat_type: 4, score_change: 10, timestamp: firebase.firestore.Timestamp.fromDate(new Date('2025-12-03T10:00:00')) }
    ];
    // [🔥 v3.2 수정 끝]


    console.log("--- DB 초기화 시작 ---");
    const batch = db.batch();

    // 1. Questions 컬렉션 삽입 (기존 데이터 삭제)
    const qSnap = await db.collection("questions").get();
    qSnap.forEach(doc => batch.delete(doc.ref));
    TEST_QUESTIONS.forEach(q => {
        batch.set(db.collection("questions").doc(), q);
    });

    // 2. Users 컬렉션 삽입 (테스트 친구들)
    TEST_USERS.forEach(user => {
        batch.set(db.collection("users").doc(user.id), user);
    });
    
    // 3. Logs 컬렉션 삽입
    const logSnap = await db.collection("logs").get();
    logSnap.forEach(doc => batch.delete(doc.ref));
    TEST_LOGS.forEach(log => {
        batch.set(db.collection("logs").doc(), log);
    });
    
    // 4. Received Votes 서브 컬렉션 삽입 (Rolling Window 테스트용)
    TEST_ROLLING_VOTES.forEach(vote => {
         batch.set(db.collection("users").doc('user_friend_1').collection("received_votes").doc(), vote);
    });
    
    await batch.commit();
    
    console.log("--- DB 초기화 성공! 🎉 ---");
    alert("테스트 DB 초기화 성공! 앱을 새로고침하여 확인하세요.");

    if(window.initGame) {
         window.initGame();
    } else {
         location.reload(); 
    }
}
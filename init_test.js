// init_test.js (Full Code: Patch v13.2 - Default Avatar Reset)

console.log("======================================");
console.log("🚀 DB 초기화 스크립트 (v13.2)");
console.log("======================================");

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    if (window.firebaseConfig) { 
        firebase.initializeApp(window.firebaseConfig);
    }
} 

// [🔥 v13.2] 모든 유저의 아바타를 '👤'로 초기화하여 상점 기능 테스트 유도
const TEST_USERS = [
    { 
        id: 'user_test_a', nickname: '테스트 A (나)', avatar: '👤', mbti: 'ENTP', 
        desc: '이 구역의 실험 대상 A입니다.', stats: [50, 50, 50, 50, 50, 50], 
        tokens: 100, achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: []
    },
    { 
        id: 'user_test_b', nickname: '테스트 B (너)', avatar: '👤', mbti: 'INFJ', 
        desc: '조용하지만 강한 B입니다.', stats: [30, 90, 80, 70, 30, 30], 
        tokens: 0, achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: []
    },
    { 
        id: 'user_test_c', nickname: '판교 불주먹', avatar: '👤', mbti: 'ESTP', 
        desc: '말보다 행동이 앞서는 리더!', stats: [80, 80, 60, 50, 90, 40], 
        tokens: 50, achievedIds: [], login_count: 0, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: []
    },
    { 
        id: 'user_test_d', nickname: 'AI 개발자', avatar: '👤', mbti: 'INTP', 
        desc: '감정 없는 논리 기계입니다.', stats: [95, 40, 90, 20, 20, 80], 
        tokens: 200, achievedIds: [], login_count: 0, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: []
    },
    { 
        id: 'user_test_e', nickname: '디자인 요정', avatar: '👤', mbti: 'ISFP', 
        desc: '세상을 아름답게 만들고 싶어요.', stats: [40, 95, 30, 80, 50, 60], 
        tokens: 10, achievedIds: [], login_count: 0, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: []
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

window.initializeTestDB = async function() { 
    const db = window.db;
    const FieldValue = window.FieldValue;

    if (!db || !FieldValue || typeof firebase === 'undefined' || !firebase.firestore) {
        alert("Firebase SDK 로딩 실패. 잠시 후 다시 시도하세요.");
        return;
    }

    if (!confirm("🚨 DB 초기화: 모든 유저를 '👤 기본 아바타' 상태로 리셋합니다.")) {
        return;
    }
    
    console.log("--- DB 초기화 시작 ---");
    const batch = db.batch();

    const uSnap = await db.collection("users").get();
    uSnap.forEach(doc => batch.delete(doc.ref));
    
    const qSnap = await db.collection("questions").get();
    qSnap.forEach(doc => batch.delete(doc.ref));

    const lSnap = await db.collection("logs").get();
    lSnap.forEach(doc => batch.delete(doc.ref));

    TEST_QUESTIONS.forEach(q => batch.set(db.collection("questions").doc(), q));
    TEST_USERS.forEach(user => batch.set(db.collection("users").doc(user.id), user));
    
    await batch.commit();
    localStorage.clear();

    console.log("--- DB 초기화 성공! ---");
    alert("초기화 완료! 모든 아바타가 기본형(👤)으로 변경되었습니다.");
    location.reload();
}
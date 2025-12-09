// init_test.js
// Version: v19.0.0
// Description: Database Initialization Script for Development

console.log("🚀 DB 초기화 스크립트 로드됨 (v19.0.0)");

const TEST_USERS = [
    { 
        id: 'user_test_a', nickname: '테스트 A (나)', avatar: '🦊', mbti: 'ENTP', 
        desc: '이 구역의 실험 대상 A입니다.', stats: [60, 50, 40, 70, 80, 90], 
        tokens: 1000, 
        achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(),
        inventory: [] 
    },
    { 
        id: 'user_test_b', nickname: '테스트 B (너)', avatar: '🐰', mbti: 'INFJ', 
        desc: '조용하지만 강한 B입니다.', stats: [80, 70, 90, 60, 20, 10], 
        tokens: 0, achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(),
        inventory: []
    }
];

const TEST_QUESTIONS = [
    { text: "프로젝트 마감일이 당겨지면 어떻게 반응하나요?", type: 2 }, // 멘탈
    { text: "회의 중 뜬금없는 아이디어를 낼 때가 있나요?", type: 5 }, // 광기
    { text: "처음 보는 사람과도 어색함 없이 대화하나요?", type: 4 }, // 텐션
    { text: "복잡한 문제도 차분하게 분석하나요?", type: 0 }, // 지성
    { text: "주변 사람의 감정 변화를 잘 알아차리나요?", type: 1 }, // 센스
    { text: "곤란한 상황의 친구를 먼저 도와주나요?", type: 3 } // 인성
];

window.initializeTestDB = async function() { 
    const db = window.db;
    
    if (!db || typeof firebase === 'undefined' || !firebase.firestore) {
        alert("Firebase SDK가 아직 로드되지 않았습니다.");
        return;
    }

    if (!confirm("🚨 정말 초기화하시겠습니까?\n모든 유저 데이터가 삭제되고 [테스트 A/B] 계정이 생성됩니다.")) {
        return;
    }
    
    console.log("--- DB 초기화 시작 ---");
    const batch = db.batch();

    // 1. Delete Collections
    const deleteCollection = async (col) => {
        const snap = await db.collection(col).get();
        snap.forEach(doc => batch.delete(doc.ref));
    };

    await deleteCollection("users");
    await deleteCollection("questions");
    await deleteCollection("logs");
    await deleteCollection("achievements"); // 업적도 초기화

    // 2. Insert Test Data
    TEST_QUESTIONS.forEach(q => batch.set(db.collection("questions").doc(), q));
    TEST_USERS.forEach(user => batch.set(db.collection("users").doc(user.id), user));
    
    // 업적 마스터 데이터 재주입 (logic.js에서 정의됨)
    if(window.ACHIEVEMENTS_MASTER_DATA) {
        window.ACHIEVEMENTS_MASTER_DATA.forEach(a => batch.set(db.collection("achievements").doc(a.id), a));
    }
    
    await batch.commit();
    localStorage.clear();

    console.log("--- DB 초기화 성공! ---");
    alert("초기화 완료! 앱을 재시작합니다.");
    location.reload();
}
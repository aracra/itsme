// init_test.js
// Version: v19.10.0
// Description: Database Initialization Script (Mock Users included)

console.log("🚀 DB 초기화 스크립트 로드됨 (v19.10.0)");

const TEST_USERS = [
    { id: 'user_test_a', nickname: '테스트 A (나)', avatar: '🦊', mbti: 'ENTP', desc: '이 구역의 실험 대상 A입니다.', stats: [60, 50, 40, 70, 80, 90], tokens: 1000, achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_b', nickname: '테스트 B (너)', avatar: '🐰', mbti: 'INFJ', desc: '조용하지만 강한 B입니다.', stats: [80, 70, 90, 60, 20, 10], tokens: 0, achievedIds: [], login_count: 1, vote_count: 0, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_c', nickname: '판교 불주먹', avatar: '🔥', mbti: 'ESTP', desc: '일단 저지르고 보는 행동파!', stats: [30, 80, 90, 40, 95, 70], tokens: 50, achievedIds: [], login_count: 3, vote_count: 10, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_d', nickname: 'AI 개발자', avatar: '🤖', mbti: 'INTP', desc: '분석 중... (말 걸지 마세요)', stats: [95, 40, 60, 30, 20, 50], tokens: 200, achievedIds: [], login_count: 5, vote_count: 2, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_e', nickname: '디자인 요정', avatar: '🎨', mbti: 'ISFP', desc: '침대에 누워있고 싶어요...', stats: [40, 90, 30, 80, 40, 20], tokens: 120, achievedIds: [], login_count: 2, vote_count: 5, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_f', nickname: '주말 등산러', avatar: '🌲', mbti: 'ESTJ', desc: '계획대로 움직입시다. 빨리요.', stats: [70, 50, 85, 60, 70, 30], tokens: 300, achievedIds: [], login_count: 10, vote_count: 20, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_g', nickname: '감성 타로', avatar: '🔮', mbti: 'INFJ', desc: '너의 미래가 보여... (아마도)', stats: [60, 95, 70, 90, 30, 60], tokens: 80, achievedIds: [], login_count: 4, vote_count: 8, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] },
    { id: 'user_test_h', nickname: '새벽 코딩', avatar: '🧟', mbti: 'ISTP', desc: '밤에는 깨어있고 낮에는 잡니다.', stats: [85, 60, 50, 40, 30, 80], tokens: 10, achievedIds: [], login_count: 1, vote_count: 1, tickets: 5, lastTicketDate: new Date().toLocaleDateString(), inventory: [] }
];

const TEST_QUESTIONS = [
    { text: "프로젝트 마감일이 당겨지면 어떻게 반응하나요?", type: 2 },
    { text: "회의 중 뜬금없는 아이디어를 낼 때가 있나요?", type: 5 },
    { text: "처음 보는 사람과도 어색함 없이 대화하나요?", type: 4 },
    { text: "복잡한 문제도 차분하게 분석하나요?", type: 0 },
    { text: "주변 사람의 감정 변화를 잘 알아차리나요?", type: 1 },
    { text: "곤란한 상황의 친구를 먼저 도와주나요?", type: 3 }
];

window.initializeTestDB = async function() { 
    const db = window.db;
    if (!db || typeof firebase === 'undefined' || !firebase.firestore) { alert("Firebase SDK가 아직 로드되지 않았습니다."); return; }
    if (!confirm("🚨 정말 초기화하시겠습니까?\n모든 데이터가 삭제되고 [친구 8명]이 생성됩니다.")) { return; }
    
    console.log("--- DB 초기화 시작 ---");
    const batch = db.batch();
    const deleteCollection = async (col) => { const snap = await db.collection(col).get(); snap.forEach(doc => batch.delete(doc.ref)); };

    await deleteCollection("users"); await deleteCollection("questions"); await deleteCollection("logs"); await deleteCollection("achievements");
    TEST_QUESTIONS.forEach(q => batch.set(db.collection("questions").doc(), q));
    TEST_USERS.forEach(user => batch.set(db.collection("users").doc(user.id), user));
    if(window.ACHIEVEMENTS_MASTER_DATA) { window.ACHIEVEMENTS_MASTER_DATA.forEach(a => batch.set(db.collection("achievements").doc(a.id), a)); }
    
    await batch.commit();
    localStorage.clear();
    console.log("--- DB 초기화 성공! ---");
    alert("친구 8명 입주 완료! 🏠\n앱을 재시작합니다.");
    location.reload();
}
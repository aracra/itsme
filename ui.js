// ========================================
// 전역 변수 초기화 (UI용)
// ========================================
let myMbti = "";
let tempTestResult = [];
let myChart = null;

// ========================================
// MBTI UI 설정 (화면 전환 핵심 로직)
// ========================================
function setMyTypeUI(mbti) {
    console.log("UI 전환 시작: ", mbti); // 디버깅용 로그
    myMbti = mbti;
    const badge = document.getElementById('myMbtiBadge');
    if(badge) badge.innerText = "#" + mbti;
    
    // 이전 화면들 끄기
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-mbti').classList.remove('active');
    
    // 네비게이션바 보이기
    document.getElementById('mainContainer').classList.add('logged-in');
    
    // 메인 화면으로 이동
    goTab('screen-main', document.querySelector('.nav-item:first-child'));
}

// ========================================
// 로그인/로그아웃
// ========================================
function logout() {
    localStorage.clear();
    location.reload();
}

function loginWithServer() {
    // [수정] 바로 MBTI로 안 가고 닉네임 설정부터!
    goScreen('screen-nickname');
}

// ========================================
// 테스트 로직
// ========================================
function nextTest(val, nextScreenId) {
    tempTestResult.push(val);
    goScreen(nextScreenId);
}

function finishTest(lastVal) {
    tempTestResult.push(lastVal);
    
    // 임시 MBTI 계산 (간소화)
    let finalMbti = "ENFP";
    if (tempTestResult.filter(v => v === 'I').length >= 1) finalMbti = finalMbti.replace('E', 'I');
    if (tempTestResult.filter(v => v === 'S').length >= 1) finalMbti = finalMbti.replace('N', 'S');
    if (tempTestResult.filter(v => v === 'T').length >= 1) finalMbti = finalMbti.replace('F', 'T');
    if (tempTestResult.filter(v => v === 'J').length >= 1) finalMbti = finalMbti.replace('P', 'J');
    
    alert("분석 완료! 당신은 " + finalMbti + " 유형입니다.");
    
    // [수정] 안전하게 저장 함수 호출
    if(window.saveMbtiToServer) {
        window.saveMbtiToServer(finalMbti);
    } else {
        // 로직 파일이 없어도 강제로 UI 전환
        console.warn("로직 파일 없음. UI 강제 전환");
        setMyTypeUI(finalMbti);
    }
    
    tempTestResult = []; // 테스트 결과 초기화
}

// ========================================
// [수정] 닉네임 저장 후 MBTI 화면으로 이동
// ========================================
window.saveNicknameAndNext = function() {
    const input = document.getElementById('inputNickname');
    const nickname = input.value.trim();
    
    if (!nickname) {
        alert("닉네임을 입력해주세요!");
        return;
    }
    
    // [핵심 수정] myInfo가 없으면 임시로 만들기 (안전장치)
    if (!window.myInfo) {
        window.myInfo = { nickname: "" };
    }
    
    // 전역 변수에 저장
    window.myInfo.nickname = nickname;
    
    // 다음 화면(MBTI)으로 이동
    goScreen('screen-mbti');
}

// ========================================
// 바텀 시트 및 팝업
// ========================================
function openSheet(icon, title, desc, sub="") {
    document.getElementById('sheetIcon').innerText = icon;
    document.getElementById('sheetTitle').innerText = title;
    document.getElementById('sheetDesc').innerHTML = desc;
    document.getElementById('sheetSub').innerText = sub;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}

function closeSheet() {
    document.querySelectorAll('.sheet-overlay').forEach(el => el.classList.remove('open'));
}

// ========================================
// 화면 전환 (Tab & Screen)
// ========================================
function goTab(screenId, navEl) {
    // 모든 화면 숨기기
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // 타겟 화면 보이기
    const target = document.getElementById(screenId);
    if(target) target.classList.add('active');
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navEl) navEl.classList.add('active');

    // 차트 그리기 (메인 화면일 때만)
    if(screenId === 'screen-main') setTimeout(drawChart, 100);
    
    // [핵심 추가] 탭 이동할 때마다 프로필 정보(닉네임 등) 최신화!
    // logic.js에 있는 updateProfileUI 함수를 빌려 씁니다.
    if (window.updateProfileUI) {
        window.updateProfileUI();
    }
}

// [핵심 수정] 서브 탭 이동 로직
function goSubTab(contentId, tabEl) {
    document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
    document.getElementById(contentId).classList.add('active');
    
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    if(tabEl) tabEl.classList.add('active');
    
    if(contentId === 'tab-prism') {
        setTimeout(drawChart, 50);
    } 
    // [핵심 수정] '발자취' 탭 선택 시 렌더링 로직 호출 (logic.js의 함수)
    else if (contentId === 'tab-history') {
        if (window.renderHistoryList) {
            window.renderHistoryList();
        }
    } 
    // [핵심 수정] '업적' 탭 선택 시 렌더링 로직 호출 (logic.js의 함수)
    else if (contentId === 'tab-trophy') {
        if (window.renderAchievementsList) {
            window.renderAchievementsList();
        }
    }
}

function goScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ========================================
// 차트 그리기 (Chart.js)
// ========================================
function drawChart() {
    const ctx = document.getElementById('myRadarChart');
    if(!ctx) return;
    
    // 기존 차트가 있으면 삭제 후 다시 그리기
    if(myChart) {
        myChart.destroy();
        myChart = null;
    }
    
    // [수정] 실제 데이터 로드 (logic.js의 window.myInfo를 사용하거나 기본값 설정)
    let chartData = [50, 50, 50, 50, 50, 50]; // 기본값
    if (window.myInfo && window.myInfo.stats) {
        chartData = window.myInfo.stats;
    }

	myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            // [수정] 차트 라벨 업데이트 (순서 중요! 0~5번)
            labels: ['지성', '센스', '멘탈', '인성', '텐션', '광기'],
            datasets: [{
                label: '내 점수',
                data: chartData, // 실제 데이터를 반영합니다.
                backgroundColor: 'rgba(108, 92, 231, 0.2)',
                borderColor: '#6c5ce7',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: { 
                    suggestedMin: 0, 
                    suggestedMax: 100,
                    pointLabels: { font: { size: 12 } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ========================================
// [중요] 안전장치 (Fallback) - Patch v2.8 수정 및 신규 함수 추가
// logic.js가 로드되지 않아도 UI가 작동하도록 가짜 함수 생성
// ========================================

// 1. UI 함수들 전역 노출
window.setMyTypeUI = setMyTypeUI;
window.logout = logout;
window.loginWithServer = loginWithServer;
window.nextTest = nextTest;
window.finishTest = finishTest;
window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.goTab = goTab;
window.goSubTab = goSubTab;
window.goScreen = goScreen;
window.purchaseItem = window.purchaseItem || function() { alert('서버 연결 확인 필요'); };

// 2. logic.js가 없어서 함수가 없을 경우를 대비한 대타 함수들
if (typeof window.saveMbtiToServer === 'undefined') {
    window.saveMbtiToServer = function(mbti) {
        console.warn("⚠️ 서버 로직 파일(logic.js) 로드 지연. 데이터는 임시 저장됩니다.");
    };
}

// [신규] 업적/발자취 렌더링 함수가 logic.js에 없는 경우를 위한 안전장치
if (typeof window.renderAchievementsList === 'undefined') {
    window.renderAchievementsList = function() { 
        console.warn("⚠️ 업적 렌더링: 로직 파일(logic.js) 로드 확인 필요"); 
        const container = document.querySelector('.achieve-grid');
        if(container) container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">로딩 실패</div>';
    };
}

if (typeof window.renderHistoryList === 'undefined') {
    window.renderHistoryList = function() { 
        console.warn("⚠️ 발자취 렌더링: 로직 파일(logic.js) 로드 확인 필요"); 
        const container = document.querySelector('#tab-history .list-wrap');
        if(container) container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">로딩 실패</div>';
    };
}
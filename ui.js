// ui.js (Full Code: Patch v33.0)

let myMbti="",tempTestResult=[],myChart=null;
function updateTicketUI(){const e=document.getElementById('ticketDisplay');if(e&&window.myInfo)e.innerText=`🎫 남은 티켓: ${window.myInfo.tickets||0}/5`;}
function updateProfileUI(){if(!window.myInfo)return;const d={mainMsg:`"${window.myInfo.msg||'상태 메시지'}"`,settingMsg:`"${window.myInfo.msg||'상태 메시지'}"`,shopTokenDisplay:window.myInfo.tokens,myAvatar:window.myInfo.avatar,settingsAvatar:window.myInfo.avatar,myNicknameDisplay:window.myInfo.nickname,settingsNickname:window.myInfo.nickname,myMbtiBadge:`#${window.myInfo.mbti}`};for(const k in d){const e=document.getElementById(k);if(e)e.innerText=d[k];}if(document.getElementById('tab-prism')?.classList.contains('active')&&window.drawChart)window.drawChart(); if(window.applyActiveEffects)window.applyActiveEffects();}
function setMyTypeUI(m){myMbti=m;if(document.getElementById('myMbtiBadge'))document.getElementById('myMbtiBadge').innerText=`#${m}`;document.getElementById('screen-login').classList.remove('active');document.getElementById('screen-mbti').classList.remove('active');document.getElementById('mainContainer').classList.add('logged-in');if(window.goTab)window.goTab('screen-main',document.querySelector('.nav-item:first-child'));}
function goTab(s,n){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(s).classList.add('active');document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));if(n)n.classList.add('active');if(s==='screen-main')window.goSubTab('tab-prism',document.querySelector('.sub-tab:first-child'));else if(s==='screen-rank'&&window.renderRankList)window.renderRankList(window.currentFilter);else if(s==='screen-vote'&&window.startTournament)window.startTournament();if(updateProfileUI)updateProfileUI();}
function goSubTab(c,t){document.querySelectorAll('.sub-content').forEach(x=>x.classList.remove('active'));document.getElementById(c).classList.add('active');document.querySelectorAll('.sub-tab').forEach(x=>x.classList.remove('active'));if(t)t.classList.add('active');if(c==='tab-prism'&&window.drawChart)setTimeout(window.drawChart,50);else if(c==='tab-history'&&window.renderHistoryList)window.renderHistoryList();else if(c==='tab-trophy'&&window.renderAchievementsList)window.renderAchievementsList();}
function goScreen(s){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(s).classList.add('active');}
function logout(){localStorage.clear();location.reload();}
function loginWithServer(){goScreen('screen-nickname');}
window.debugLogin=function(u){if(!u)return;localStorage.setItem('my_uid',u);location.reload();}
function nextTest(v,n){tempTestResult.push(v);goScreen(n);}
function finishTest(l){tempTestResult.push(l);const c={E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0};tempTestResult.forEach(v=>c[v]++);let m=(c['E']>=c['I']?'E':'I')+(c['S']>=c['N']?'S':'N')+(c['T']>=c['F']?'T':'F')+(c['J']>=c['P']?'J':'P');if(window.saveMbtiToServer)window.saveMbtiToServer(m);else setMyTypeUI(m);tempTestResult=[];}
function saveNicknameAndNext(){const n=document.getElementById('inputNickname').value.trim();if(!n){alert("닉네임 입력!");return;}if(!window.myInfo)window.myInfo={nickname:""};window.myInfo.nickname=n;if(window.saveNicknameToDB)window.saveNicknameToDB(n);goScreen('screen-mbti');}
window.editProfileMsg=async function(){if(!window.myInfo){alert("로드 전");return;}const m=prompt("한마디",window.myInfo.msg==='상태 메시지'?'':window.myInfo.msg);if(m===null)return;if(window.saveProfileMsgToDB&&await window.saveProfileMsgToDB(m.trim().substring(0,50)))window.openSheet('📝','완료','저장됨',m);}

// [🔥 v29.0] 팝업 생성 시 아이콘 프레임 적용
function openSheet(i,t,d,s=""){
    const h=`
    <div class="sheet-header-area">
        <div class="sheet-header-icon-frame">${i}</div>
        <div class="sheet-title">${t}</div>
    </div>
    <div class="sheet-body-area">
        <div class="sheet-message-box">${d}</div>
        ${s}
    </div>
    <div class="sheet-footer-area">
        <button class="btn btn-primary" onclick="closeSheet()">확인</button>
    </div>`;
    document.querySelector('.bottom-sheet').innerHTML=h;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}

function closeSheet(){document.querySelectorAll('.sheet-overlay').forEach(x=>x.classList.remove('open'));}
function disableVoteScreen(){const ids=['voteWrapper','passBtn','winnerContainer','roundBadge'];ids.forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='none';});if(document.getElementById('noTicketMsg'))return;const s=document.getElementById('screen-vote');if(s){const d=document.createElement('div');d.id='noTicketMsg';d.style.cssText='flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-size:18px;color:#636e72;padding:20px;';d.innerHTML=`<div style="font-size:60px;margin-bottom:15px;">😴</div><h2>티켓 소진!</h2><p>내일 만나요.</p><button class="btn btn-primary" onclick="goTab('screen-main',document.querySelector('.nav-item:first-child'))">메인으로</button>`;s.appendChild(d);}}
let currentWinnerId=null;
window.openCommentPopup=function(id,n){currentWinnerId=id;document.getElementById('commentTargetName').innerText=`${n}님에게`;document.getElementById('commentInput').value='';document.getElementById('commentOverlay').classList.add('open');}
window.closeCommentPopup=function(){document.getElementById('commentOverlay').classList.remove('open');}
window.submitComment=function(){const t=document.getElementById('commentInput').value.trim();if(!t){alert("내용 입력!");return;}if(window.sendCommentToDB)window.sendCommentToDB(currentWinnerId,t);closeCommentPopup();}

// [🔥 v29.0] 인벤토리 아이콘 프레임 적용
window.openInventory=function(){
    const l=window.myInfo.inventory||[], def={id:'def',type:'avatar',value:'👤',name:'기본'};
    const all=[def,...l];
    let listHtml = '';
    if(all.length===0) listHtml = `<p>비어있음</p>`;
    else all.forEach(i=>{
        const eq=(i.type==='avatar'&&i.value===window.myInfo.avatar),ac=i.isActive,bt=i.type==='avatar'?(eq?'착용 중':'착용'):(ac?'OFF':'ON'),bc=(eq||ac)?'btn-secondary':'btn-outline',fn=i.type==='avatar'?(eq?'':`onclick="equipAvatar('${i.value}')"`):`onclick="toggleEffect('${i.id}')"`;
        listHtml+=`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #eee;">
            <div style="display:flex;align-items:center;">
                <div class="common-circle-frame">${i.value.startsWith('bg')?'✨':i.value}</div>
                <div>
                    <div style="font-weight:bold;font-size:14px;">${i.name}</div>
                    <div style="font-size:12px;color:#aaa;">${i.type==='avatar'?'소장':(i.expiresAt?'기간제':'효과')}</div>
                </div>
            </div>
            <button class="btn ${bc}" style="width:auto;padding:6px 12px;font-size:12px;margin:0;" ${fn}>${bt}</button>
        </div>`;
    });

    const h=`
    <div class="sheet-header-area">
        <div class="sheet-header-icon-frame">🎒</div>
        <div class="sheet-title">내 아이템 보관함</div>
    </div>
    <div class="sheet-body-area">
        ${listHtml}
    </div>
    <div class="sheet-footer-area">
        <button class="btn btn-primary" onclick="closeSheet()">닫기</button>
    </div>`;
    document.querySelector('.bottom-sheet').innerHTML=h;
    document.getElementById('bottomSheetOverlay').classList.add('open');
}

window.applyActiveEffects=function(){
    const b=document.body;
    // 모든 테마 클래스를 제거
    b.classList.remove('bg-gold','bg-dark', 'bg-pink'); // [🔥 v33.0] 핑크 모드 클래스 추가
    
    if(!window.myInfo?.inventory)return;
    const e=window.myInfo.inventory.find(i=>i.type==='effect'&&i.isActive);
    
    // 활성화된 테마 클래스를 적용
    if(e)b.classList.add(e.value);
}

// [🔥 v32.0] 업데이트 순서를 명시적으로 정리했습니다.
const _ou=updateProfileUI;
window.updateProfileUI=function(){
    if(_ou)_ou();
    // Profile UI가 업데이트된 후, 가장 마지막에 이펙트를 적용하여 덮어씌울 수 있도록 보장
    applyActiveEffects();
}

window.updateTicketUI=updateTicketUI;window.updateProfileUI=window.updateProfileUI;window.setMyTypeUI=setMyTypeUI;window.goTab=goTab;window.goSubTab=goSubTab;window.goScreen=goScreen;window.logout=logout;window.loginWithServer=loginWithServer;window.nextTest=nextTest;window.finishTest=finishTest;window.saveNicknameAndNext=saveNicknameAndNext;window.openSheet=openSheet;window.closeSheet=closeSheet;window.editProfileMsg=editProfileMsg;window.disableVoteScreen=disableVoteScreen;window.debugLogin=debugLogin;
function init(){if(typeof window.loadDataFromServer==='function')window.loadDataFromServer();else console.warn("logic.js fail");}window.addEventListener('DOMContentLoaded',init);
// logic.js (Full Code: v22.0)

// 1. Firebase
window.firebaseConfig = { apiKey: "AIzaSyCZJB72jkS2rMgM213Wu9fEuW4Q4jN1scc", authDomain: "it-s-me-96d66.firebaseapp.com", projectId: "it-s-me-96d66", storageBucket: "it-s-me-96d66.firebasestorage.app", messagingSenderId: "950221311348", appId: "1:950221311348:web:43c851b6a4d7446966f021", measurementId: "G-J3SYEX4SYW" };
window.db=null; window.FieldValue=null;
function updateStatus(m,t='wait'){const e=document.getElementById('dbStatus');if(e){e.innerText=m;e.className='db-status';if(t==='error')e.classList.add('error');if(t==='ok')e.classList.add('on');if(t==='error'){e.onclick=()=>location.reload();e.style.cursor='pointer';}}console.log(`[Sys] ${m}`);}
function initFirebase(){if(typeof firebase!=='undefined'){if(!firebase.apps.length)firebase.initializeApp(window.firebaseConfig);window.db=firebase.firestore();window.FieldValue=firebase.firestore.FieldValue;return true;}return false;}

// 2. Data
window.ACHIEVEMENTS_MASTER_DATA = [
    {id:'ach_01',icon:'👶',title:'응애 나 아기 유저',desc:'가입을 환영합니다!',type:'System',condition_key:'login_count',condition_value:1,reward:10},
    {id:'ach_02',icon:'👋',title:'똑똑, 누구 없소?',desc:'첫 번째 그룹 생성.',type:'Group',condition_key:'group_count',condition_value:1,reward:30},
    {id:'ach_03',icon:'🗳️',title:'소중한 한 표',desc:'첫 투표 참여.',type:'Vote',condition_key:'vote_count',condition_value:1,reward:10},
    {id:'ach_04',icon:'🔥',title:'불타는 투표권',desc:'티켓 소진.',type:'System',condition_key:'tickets',condition_value:0,reward:20},
    {id:'ach_05',icon:'💎',title:'육각형 인간',desc:'모든 스탯이 평균 50점 이상입니다.',type:'Stat',condition_key:'stats_average',condition_value:50,reward:100},
    {id:'ach_06',icon:'🎤',title:'확신의 센터상',desc:'친구 랭킹에서 1위를 달성했습니다.',type:'Stat',condition_key:'rank',condition_value:1,reward:150},
    {id:'ach_07',icon:'🤪',title:'이 구역의 미친X',desc:'[광기] 스탯이 압도적으로 높습니다.',type:'Stat',condition_key:'stats_mania_ratio',condition_value:2,reward:50},
    {id:'ach_08',icon:'🧊',title:'시베리아 벌판',desc:'[멘탈] 점수가 높아 냉철해 보입니다.',type:'Stat',condition_key:'stats_mentality',condition_value:80,reward:40},
    {id:'ach_09',icon:'💬',title:'투머치 토커',desc:'코멘트 10개 이상 받았습니다.',type:'Comment',condition_key:'comment_count',condition_value:10,reward:20},
    {id:'ach_10',icon:'💰',title:'자본주의의 맛',desc:'상점에서 아이템을 1회 구매했습니다.',type:'Shop',condition_key:'purchase_count',condition_value:1,reward:10}
];
window.questions=[]; window.candidates=[]; window.tournamentRound=[]; window.nextRound=[];
window.currentQ=null; window.currentFilter=-1; window.isVoting=false; window.isGamePaid=false; window.currentRoundMax=0;
window.myInfo={tickets:5,lastTicketDate:"",msg:"",tokens:0,avatar:"👤",nickname:"",achievedIds:[],inventory:[],stats:[50,50,50,50,50,50]};
window.achievementsList=[]; window.achievedDateMap={};
const STAT_MAP=['지성','센스','멘탈','인성','텐션','광기'];
function getUserId(){let u=localStorage.getItem('my_uid');if(!u){u='user_'+Math.random().toString(36).substr(2,9);localStorage.setItem('my_uid',u);}return u;}

// 3. Init
window.initGame = async function() {
    updateStatus("● SDK 확인...");
    if(!initFirebase()){updateStatus("● SDK 오류",'error');return;}
    updateStatus("● DB 연결...");
    try {
        const db=window.db;
        try { 
            const batch=db.batch();
            window.ACHIEVEMENTS_MASTER_DATA.forEach(a=>batch.set(db.collection("achievements").doc(a.id),a));
            await batch.commit().catch(()=>{});
            const as=await db.collection("achievements").get();
            window.achievementsList=[]; as.forEach(d=>window.achievementsList.push(d.data()));
        } catch(e){window.achievementsList=window.ACHIEVEMENTS_MASTER_DATA;}

        updateStatus("● 데이터 로드..");
        const qs=await db.collection("questions").get(); window.questions=[]; qs.forEach(d=>window.questions.push(d.data()));
        const us=await db.collection("users").get(); window.candidates=[]; us.forEach(d=>{let u=d.data(); u.id=d.id; u.stats=u.stats||[50,50,50,50,50,50]; if(!u.avatar)u.avatar='👤'; if(u.id!==getUserId()&&u.nickname) window.candidates.push(u);});

        await window.checkAndResetTickets();
        const myDoc=await db.collection("users").doc(getUserId()).get().catch(()=>null);
        if(myDoc&&myDoc.exists){
            const d=myDoc.data();
            if(d.inventory) window.myInfo.inventory=d.inventory;
            await loadAchievementDates(getUserId());
            checkAchievements(d, d.achievedIds);
        }

        updateStatus("● 렌더링..");
        if(window.myInfo.mbti && document.getElementById('screen-login').classList.contains('active')){
            if(window.setMyTypeUI) window.setMyTypeUI(window.myInfo.mbti);
        } else if(window.candidates.length>=2 && window.renderRankList) {
            window.renderRankList(window.currentFilter);
        }
        if(window.updateProfileUI) window.updateProfileUI();
        
        // [🔥 v22.0] DB 상태 강제 초록불 (UI 안심용)
        setTimeout(() => updateStatus("● DB OK", 'ok'), 500);

    } catch(e){console.error(e);updateStatus("● 로딩 실패",'error');}
};
window.loadDataFromServer = function(){window.initGame();}

// 4. Ticket
window.checkAndResetTickets=async function(){
    const uid=getUserId(); if(!window.db)return;
    try{
        const doc=await window.db.collection("users").doc(uid).get();
        if(doc.exists){
            const d=doc.data(); window.myInfo={...window.myInfo,...d};
            if(!window.myInfo.inventory) window.myInfo.inventory=[];
            const t=new Date().toLocaleDateString();
            if(d.lastTicketDate!==t){
                window.myInfo.tickets=5; window.myInfo.lastTicketDate=t;
                window.db.collection("users").doc(uid).update({tickets:5,lastTicketDate:t});
            }
        }else{ window.db.collection("users").doc(uid).set(window.myInfo); }
    }catch(e){}
    if(window.updateTicketUI)window.updateTicketUI();
}
window.refillTickets=function(){
    if(!window.myInfo)return;
    window.myInfo.tickets=5;
    if(window.db)window.db.collection("users").doc(getUserId()).update({tickets:5});
    if(window.updateTicketUI)window.updateTicketUI();
    if(document.getElementById('screen-vote').classList.contains('active')){
        const m=document.getElementById('noTicketMsg');
        if(m){m.remove();window.startTournament();}
    }
    alert("충전 완료!");
}
window.addRichTokens=function(){
    if(!window.myInfo)return;
    window.myInfo.tokens+=10000;
    if(window.db)window.db.collection("users").doc(getUserId()).update({tokens:window.FieldValue.increment(10000)});
    if(window.updateProfileUI)window.updateProfileUI();
    alert("부자가 되었습니다! (+10,000💎)");
}
window.saveProfileMsgToDB = async function(msg) {
    if(!window.db) return false;
    try {
        await window.db.collection("users").doc(getUserId()).update({ msg: msg });
        window.myInfo.msg = msg;
        if(window.updateProfileUI) window.updateProfileUI();
        return true;
    } catch(e) { console.error(e); return false; }
}

// 5. Achievement
async function checkAchievements(stats,dbIds=[]){
    if(!window.db)return; const uid=getUserId();
    if(!window.myInfo.achievedIds)window.myInfo.achievedIds=[];
    const set=new Set([...window.myInfo.achievedIds,...dbIds]);
    window.myInfo.achievedIds=Array.from(set);
    const newIds=[];

    window.achievementsList.forEach(ach=>{
        if(set.has(ach.id))return;
        let ok=false; const k=ach.condition_key, v=ach.condition_value;
        if(stats[k]!==undefined && stats[k]>=v) ok=true;
        if(k==='stats_average' && (stats.stats.reduce((a,b)=>a+b,0)/6>=v)) ok=true;
        if(k==='stats_mentality' && stats.stats[2]>=v) ok=true;
        if(ok){
            newIds.push(ach.id); set.add(ach.id);
            window.myInfo.tokens+=ach.reward;
            window.db.collection("logs").add({
                target_uid:uid, sender_uid:'system', action_type:'ACHIEVE', stat_type:-1,
                score_change:ach.reward, message:`업적 [${ach.title}] 달성`, ach_id:ach.id, is_read:false, timestamp:window.FieldValue.serverTimestamp()
            });
        }
    });
    if(newIds.length>0){
        const t=new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\./g,'').slice(0,10);
        newIds.forEach(id=>window.achievedDateMap[id]=t);
        window.myInfo.achievedIds.push(...newIds);
        if(window.renderAchievementsList)window.renderAchievementsList(window.myInfo.achievedIds);
        await window.db.collection("users").doc(uid).update({achievedIds:window.FieldValue.arrayUnion(...newIds), tokens:window.myInfo.tokens});
    }
}
async function loadAchievementDates(uid){
    if(!window.db)return;
    try{
        const s=await window.db.collection("logs").where("target_uid","==",uid).where("action_type","==","ACHIEVE").get();
        window.achievedDateMap={};
        s.forEach(d=>{
            const l=d.data();
            if(l.ach_id&&l.timestamp)window.achievedDateMap[l.ach_id]=l.timestamp.toDate().toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\./g,'').slice(0,10);
        });
    }catch(e){}
}
window.sendCommentToDB=function(uid,txt){
    if(!window.db)return;
    const name=window.myInfo.nickname||'익명';
    window.db.collection("logs").add({target_uid:uid,sender_uid:getUserId(),action_type:'COMMENT',stat_type:-1,score_change:0,message:`${name}: ${txt}`,is_read:false,timestamp:window.FieldValue.serverTimestamp()});
    window.db.collection("users").doc(uid).update({comment_count:window.FieldValue.increment(1)});
    alert("전송 완료! 💌");
}

// 6. Shop
window.purchaseItem=async function(cost,type,val,name){
    if(!window.db)return;
    if(!window.myInfo.inventory)window.myInfo.inventory=[];
    if(window.myInfo.tokens<cost){window.openSheet('❌','토큰 부족',`보유: ${window.myInfo.tokens}💎 / 필요: ${cost}💎`,'충전 필요');return;}
    if(window.myInfo.inventory.some(i=>i.value===val)){alert("이미 보유 중입니다.");return;}
    if(!confirm(`${name} 구매 (${cost}💎)?`))return;

    const item={id:`i_${Date.now()}`,type,value:val,name,purchasedAt:new Date().toISOString(),isActive:false};
    if(type==='effect'){const d=new Date();d.setDate(d.getDate()+7);item.expiresAt=d.toISOString();}

    try{
        const uid=getUserId();
        await window.db.collection("users").doc(uid).update({
            tokens:window.FieldValue.increment(-cost), inventory:window.FieldValue.arrayUnion(item), purchase_count:window.FieldValue.increment(1)
        });
        window.db.collection("logs").add({target_uid:uid,sender_uid:'system',action_type:'PURCHASE',stat_type:-1,score_change:-cost,message:`${name} 구매`,is_read:false,timestamp:window.FieldValue.serverTimestamp()});
        
        window.myInfo.tokens-=cost; window.myInfo.inventory.push(item);
        if(window.updateProfileUI)window.updateProfileUI();
        checkAchievements(window.myInfo.stats,window.myInfo.achievedIds);
        window.openSheet('🎉','구매 성공',`${name} 획득!`,'설정 > 보관함에서 확인하세요.');
    }catch(e){console.error(e);alert("구매 오류");}
}
window.equipAvatar=async function(val){
    if(!window.db)return;
    try{
        const uid=getUserId();
        await window.db.collection("users").doc(uid).update({avatar:val});
        window.myInfo.avatar=val;
        if(window.updateProfileUI)window.updateProfileUI();
        window.closeSheet(); alert(`아바타 변경: ${val}`);
    }catch(e){}
}
window.toggleEffect=async function(id){
    if(!window.db)return;
    const idx=window.myInfo.inventory.findIndex(i=>i.id===id); if(idx===-1)return;
    const newState=!window.myInfo.inventory[idx].isActive;
    const newInv=window.myInfo.inventory.map(i=>{
        if(i.type==='effect'){
            if(i.id===id)return{...i,isActive:newState};
            if(newState)return{...i,isActive:false};
        } return i;
    });
    try{
        await window.db.collection("users").doc(getUserId()).update({inventory:newInv});
        window.myInfo.inventory=newInv;
        if(window.applyActiveEffects)window.applyActiveEffects();
        if(window.openInventory)window.openInventory();
    }catch(e){}
}

// 7. Render
window.filterRank=function(el,t){document.querySelectorAll('.stat-pill').forEach(p=>p.classList.remove('active'));el.classList.add('active');window.currentFilter=t;if(window.renderRankList)window.renderRankList(t);}
window.renderRankList=function(f){
    const c=document.getElementById('rankListContainer');if(!c)return;c.innerHTML='';
    let d=window.candidates.map(u=>({...u,s:f===-1?u.stats.reduce((a,b)=>a+b,0):u.stats[f]}));
    d.sort((a,b)=>b.s-a.s);
    d.forEach((u,i)=>{
        const li=document.createElement('li');li.className='list-item';
        let sc=f===-1?`${u.s}점`:`${u.s}점`, 
            rcClass = i===0?'rank-gold':(i===1?'rank-silver':(i===2?'rank-bronze':'')),
            rcStyle = i===0?'#ffc107':(i===1?'#adb5bd':(i===2?'#cd7f32':'#636e72')),
            rt=i<3?`🥇🥈🥉`.charAt(i):i+1;
        li.onclick=()=>window.openSheet(u.avatar,u.nickname,`"${u.desc||''}"`,`MBTI: #${u.mbti}`);
        
        li.innerHTML=`
            <div class="list-item-icon-area ${rcClass}" style="width:30px;font-size:18px;color:${rcStyle};font-weight:bold;">${rt}</div>
            <div class="list-item-icon-area">
                <div class="rank-avatar">${u.avatar}</div>
            </div>
            <div class="list-item-text"><div class="history-title">${u.nickname}</div><div class="history-date">#${u.mbti}</div></div>
            <div class="list-item-score" style="background:none;color:#2d3436;">${sc}</div>`;
        c.appendChild(li);
    });
}
window.renderHistoryList=async function(){
    const c=document.getElementById('tab-history').querySelector('.list-wrap');if(!c||!window.db)return;c.innerHTML='';
    try{
        const s=await window.db.collection("logs").where("target_uid","==",getUserId()).orderBy("timestamp","desc").limit(30).get();
        if(s.empty){c.innerHTML='<li style="text-align:center;padding:30px;">기록 없음</li>';return;}
        const seen=new Set();
        s.forEach(doc=>{
            const l=doc.data(), k=l.ach_id?`ach_${l.ach_id}`:`msg_${l.message}_${l.timestamp?.seconds}`;
            if(seen.has(k))return;seen.add(k);
            const li=document.createElement('li');li.className='list-item';
            let i,lT,sT,sM,sc='',ss='',d=l.timestamp?l.timestamp.toDate().toLocaleDateString('ko-KR').slice(0,11):'방금';
            
            if(l.action_type==='VOTE'){i='📈';lT=l.message;sT="스탯 점수 획득!";sM=l.message;sc=`+${l.score_change}점`;ss='score-red';}
            else if(l.action_type==='ACHIEVE'){
                i='🎁';
                const achData = window.achievementsList.find(a=>a.id === l.ach_id);
                const title = achData ? achData.title : '업적 달성';
                const desc = achData ? achData.desc : l.message;
                lT=`업적 [${title}] 달성!`; sT=title; sM=desc; sc=`+${l.score_change}💎`; ss='score-gold';
            }
            else if(l.action_type==='PURCHASE'){i='🛍️';lT='아이템 구매';sT="구매 완료";sM=l.message;sc=`${l.score_change}💎`;ss='score-blue';}
            else if(l.action_type==='COMMENT'){i='💬';const p=l.message.split(': ');lT=`${p[0]} "${p.slice(1).join(': ')}"`;sT=`${p[0]}님의 한마디`;sM=`"${p.slice(1).join(': ')}"`;sc='New';ss='score-gray';}
            else{i='📋';lT='알림';sT='알림';sM=l.message;}
            
            li.onclick=()=>{
                const meta = `
                    <div class="sheet-meta-row">
                        <span>${d}</span>
                        ${sc?`<span class="info-badge" style="${ss?ss.replace('background','background'):''}">${sc}</span>`:''}
                    </div>`;
                window.openSheet(i, sT, sM, meta);
            };
            li.innerHTML=`
                <div class="list-item-icon-area">
                    <div class="common-circle-frame" style="width:40px;height:40px;font-size:24px;">${i}</div>
                </div>
                <div class="list-item-text"><div class="history-title">${lT}</div><div class="history-date">${d}</div></div>
                <div class="list-item-score ${ss}">${sc}</div>`;
            c.appendChild(li);
        });
    }catch(e){}
}
window.renderAchievementsList=async function(ids){
    const c=document.querySelector('.achieve-grid');if(!c)return;c.innerHTML='';
    const my=ids||window.myInfo.achievedIds||[];
    window.achievementsList.forEach(a=>{
        const u=my.includes(a.id), el=document.createElement('div'); el.className=`achieve-item ${u?'':'locked'}`;
        const d=window.achievedDateMap[a.id], rb=`<span class="info-badge score-gold" style="margin:0;">+${a.reward}💎</span>`;
        
        el.onclick=()=>{
            const meta = `
                <div class="sheet-meta-row">
                    <span>${u?(d||'오늘'):'-'}</span>
                    ${rb}
                </div>`;
            // [🔥 v22.0] 업적 팝업 아이콘도 둥근 프레임 적용
            window.openSheet(a.icon, a.title, a.desc, meta);
        };
        el.innerHTML=`<div class="achieve-icon">${a.icon}</div><div class="achieve-title">${a.title}</div>`; c.appendChild(el);
    });
}
window.drawChart=function(){const c=document.getElementById('myRadarChart');if(!c)return;if(window.myChart)window.myChart.destroy();window.myChart=new Chart(c,{type:'radar',data:{labels:STAT_MAP,datasets:[{label:'나',data:window.myInfo.stats,fill:true,backgroundColor:'rgba(108,92,231,0.2)',borderColor:'rgb(108,92,231)',pointBackgroundColor:'rgb(108,92,231)',pointBorderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{angleLines:{color:'#dfe6e9'},grid:{color:'#dfe6e9'},pointLabels:{color:'#636e72',font:{size:14,weight:'bold'}},suggestedMin:0,suggestedMax:100,ticks:{display:false,stepSize:25}}},plugins:{legend:{display:false}}}});};
window.startTournament=function(){
    if(window.myInfo.tickets<=0){if(window.disableVoteScreen)window.disableVoteScreen();return;}
    if(window.candidates.length<2){alert("후보 부족");return;}
    window.isGamePaid=false;
    if(document.getElementById('noTicketMsg'))document.getElementById('noTicketMsg').remove();
    document.getElementById('winnerContainer').style.display='none';
    const vw=document.getElementById('voteWrapper');if(vw)vw.style.display='flex';
    const vs=document.getElementById('vsContainer');if(vs)vs.style.display='flex';
    document.getElementById('passBtn').style.display='block';
    if(document.getElementById('roundBadge'))document.getElementById('roundBadge').style.display='inline-block';
    if(window.questions.length>0) window.currentQ=window.questions[Math.floor(Math.random()*window.questions.length)];
    if(document.getElementById('voteTitle')) document.getElementById('voteTitle').innerText=window.currentQ.text;
    window.tournamentRound=[...window.candidates].sort(()=>Math.random()-0.5).slice(0,8);
    if(window.tournamentRound.length>4)window.tournamentRound=window.tournamentRound.slice(0,4);
    else if(window.tournamentRound.length>2)window.tournamentRound=window.tournamentRound.slice(0,2);
    window.nextRound=[]; window.currentRoundMax=window.tournamentRound.length;
    updateRoundTitle(); showMatch();
}
function updateRoundTitle(){const b=document.getElementById('roundBadge');if(b&&window.currentRoundMax){const t=window.currentRoundMax/2,c=(window.currentRoundMax-window.tournamentRound.length)/2+1;b.innerText=window.currentRoundMax===2?"👑 결승전":`🏆 ${window.currentRoundMax}강전 (${c}/${t})`;}}
function showMatch(){if(window.tournamentRound.length<2){if(window.nextRound.length===1){showWinner(window.nextRound[0]);return;}window.tournamentRound=window.nextRound;window.nextRound=[];window.tournamentRound.sort(()=>Math.random()-0.5);window.currentRoundMax=window.tournamentRound.length;updateRoundTitle();fireRoundEffect(window.currentRoundMax);}if(window.tournamentRound.length<2)return;updateRoundTitle();updateCard('A',window.tournamentRound[0]);updateCard('B',window.tournamentRound[1]);}
function fireRoundEffect(r){const b=document.getElementById('roundBadge');if(b){b.classList.remove('pulse-anim');void b.offsetWidth;b.classList.add('pulse-anim');}if(typeof confetti==='function')confetti({particleCount:100,spread:80,origin:{y:0.2},colors:r===2?['#ffd700','#ffa500']:['#6c5ce7','#00b894'],disableForReducedMotion:true});}
function updateCard(p,u){if(!u)return;document.getElementById('name'+p).innerText=u.nickname;document.getElementById('desc'+p).innerText=u.desc||'';document.getElementById('avatar'+p).innerText=u.avatar;}
window.vote=function(idx){if(window.isVoting)return;if(!window.tournamentRound||window.tournamentRound.length<2)return;if(!window.isGamePaid&&window.myInfo.tickets<=0){alert("티켓 소진");return;}window.isVoting=true;if(!window.isGamePaid){window.myInfo.tickets=Math.max(0,window.myInfo.tickets-1);window.isGamePaid=true;if(window.db)window.db.collection("users").doc(getUserId()).update({tickets:window.FieldValue.increment(-1)});}window.myInfo.tokens+=10;if(window.db)window.db.collection("users").doc(getUserId()).update({vote_count:window.FieldValue.increment(1),tokens:window.FieldValue.increment(10)});const w=idx===0?window.tournamentRound.shift():(window.tournamentRound.splice(0,1),window.tournamentRound.shift());window.tournamentRound.shift();window.nextRound.push(w);if(window.updateTicketUI)window.updateTicketUI();if(window.updateProfileUI)window.updateProfileUI();showMatch();setTimeout(()=>window.isVoting=false,500);}
function showWinner(w){saveScore(w,20);(async()=>{const uid=getUserId();if(window.db){const d=await window.db.collection("users").doc(uid).get();if(d.exists)checkAchievements(d.data(),d.data().achievedIds);const s=window.myInfo.nickname||'익명',st=STAT_MAP[window.currentQ?.type||0];window.db.collection("logs").add({target_uid:w.id,sender_uid:uid,action_type:'VOTE',stat_type:window.currentQ?.type||0,score_change:20,message:`[${st}] ${s}님의 투표!`,is_read:false,timestamp:window.FieldValue.serverTimestamp()});}})();
document.getElementById('vsContainer').style.display='none';document.getElementById('passBtn').style.display='none';if(document.getElementById('roundBadge'))document.getElementById('roundBadge').style.display='none';document.getElementById('winnerContainer').style.display='flex';document.getElementById('winnerName').innerText=w.nickname;document.getElementById('winnerAvatar').innerText=w.avatar;
const wb=document.querySelector('.winner-box');wb.querySelectorAll('.btn-action').forEach(b=>b.remove());const bc=document.createElement('div');bc.className='btn-action';bc.style.marginTop='20px';bc.style.width='100%';
const cb=document.createElement('button');cb.className='btn btn-outline';cb.innerText="💬 한줄평 남기기";cb.onclick=()=>window.openCommentPopup(w.id,w.nickname);bc.appendChild(cb);
const nb=document.createElement('button');nb.className='btn btn-primary';
if(window.myInfo.tickets<=0){document.getElementById('winnerText').innerHTML=`점수 전달 완료!<br><span style="color:#e74c3c;font-weight:bold;">🎫 티켓 소진!</span>`;nb.innerText="메인으로 돌아가기";nb.onclick=()=>{if(window.disableVoteScreen)window.disableVoteScreen();window.goTab('screen-main',document.querySelector('.nav-item'));};}else{document.getElementById('winnerText').innerText="이 친구에게 점수가 전달되었습니다.";nb.innerText="다음 토너먼트 시작하기";nb.onclick=window.startTournament;}bc.appendChild(nb);wb.appendChild(bc);if(typeof confetti==='function')confetti({particleCount:100,spread:70,origin:{y:0.6}});}
async function saveScore(w,s){w.stats[window.currentQ?.type||0]=Math.min(100,w.stats[window.currentQ?.type||0]+s);const i=window.candidates.findIndex(c=>c.id===w.id);if(i!==-1)window.candidates[i].stats=w.stats;if(window.renderRankList)window.renderRankList(window.currentFilter);if(window.db){window.db.collection("users").doc(w.id).collection("received_votes").add({stat_type:window.currentQ?.type||0,score_change:s,timestamp:window.FieldValue.serverTimestamp()});window.db.collection("users").doc(w.id).update({stats:w.stats});}}
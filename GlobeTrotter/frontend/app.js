const pageNames={dashboard:"Dashboard",trips:"My Trips",explore:"Explore",favorites:"Favorites",budget:"Budget",itinerary:"Itinerary",messages:"Messages",settings:"Settings"};
const destinationAssets={
  Bali:"assets/bali.jpg",Santorini:"assets/santorini.jpg",Paris:"assets/paris.jpg",Tokyo:"assets/tokyo.jpg",
  Goa:"assets/goa.jpg",Manali:"assets/manali.jpg","Amalfi Coast":"assets/amalfi.jpg"
};

document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.addEventListener("click",()=>showPage(btn.dataset.page));
});

function showPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+name)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="favorites") renderFavorites();
}

function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open")}
function toggleNotifications(){document.getElementById("notificationPanel").classList.toggle("show")}

document.addEventListener("click",e=>{
  const panel=document.getElementById("notificationPanel");
  const btn=e.target.closest(".round-btn");
  if(panel.classList.contains("show")&&!panel.contains(e.target)&&!btn) panel.classList.remove("show");
});

function openTripModal(){document.getElementById("tripModal").classList.add("show")}
function openExpenseModal(){document.getElementById("expenseModal").classList.add("show")}
function closeModal(id){document.getElementById(id).classList.remove("show")}

function createTrip(){
  const destination=document.getElementById("newDestination").value.trim();
  if(!destination){showToast("Tell us where you're going first ✈");return}
  closeModal("tripModal");
  showToast(`${destination} trip created successfully ✨`);
  setTimeout(()=>showPage("trips"),500);
}

function openTripDetails(name){
  const data={
    "Goa Getaway":["assets/goa.jpg","Goa Getaway","A sunny 4-day escape with beaches, cafés, a sunset cruise and plenty of slow mornings."],
    "Dubai Adventure":["assets/dubai.jpg","Dubai Adventure","Five days of skyline views, desert adventures, great food and city lights."],
    "Manali Escape":["assets/manali.jpg","Manali Escape","A refreshing mountain trip with snow, cafés, scenic drives and adventure."]
  }[name];
  if(!data)return;
  document.getElementById("detailImage").src=data[0];
  document.getElementById("detailTitle").textContent=data[1];
  document.getElementById("detailCopy").textContent=data[2];
  document.getElementById("detailsModal").classList.add("show");
}

function toggleFavorite(el,name){
  event?.stopPropagation?.();
  let list=JSON.parse(localStorage.getItem("gt_favorites")||"[]");
  const exists=list.includes(name);
  if(exists) list=list.filter(x=>x!==name);
  else list.push(name);
  localStorage.setItem("gt_favorites",JSON.stringify(list));
  if(el.classList.contains("heart")||el.classList.contains("rec-heart")) el.classList.toggle("liked",!exists);
  const button=el.querySelector?.(".heart");
  if(button)button.classList.toggle("liked",!exists);
  showToast(exists?`${name} removed from favorites`:`${name} saved to favorites ♥`);
  renderFavorites();
}

function renderFavorites(){
  const box=document.getElementById("favoriteList");if(!box)return;
  const list=JSON.parse(localStorage.getItem("gt_favorites")||"[]");
  if(!list.length){
    box.innerHTML=`<div class="settings-card" style="grid-column:1/-1;text-align:center;padding:55px"><div style="font-size:45px">♡</div><h3>Your favorites are waiting</h3><p style="color:var(--muted)">Explore destinations and save the ones that make you want to pack a bag.</p><button class="primary" onclick="showPage('explore')">Explore destinations</button></div>`;
    return;
  }
  box.innerHTML=list.map(name=>`<article class="favorite-card"><img src="${destinationAssets[name]||destinationAssets.Paris}"><div><h3>${name}</h3><p>Saved destination · Ready for your next adventure</p><button class="outline" onclick="removeFavorite('${name}')">Remove</button></div></article>`).join("");
}
function removeFavorite(name){
  let list=JSON.parse(localStorage.getItem("gt_favorites")||"[]").filter(x=>x!==name);
  localStorage.setItem("gt_favorites",JSON.stringify(list));renderFavorites();showToast(`${name} removed`);
}

function filterExplore(){
  const q=document.getElementById("destinationSearch").value.toLowerCase();
  document.querySelectorAll("#exploreGrid article").forEach(card=>{
    card.style.display=card.dataset.name.includes(q)?"block":"none";
  });
}

function globalSearch(){
  const q=document.getElementById("globalSearch").value.toLowerCase().trim();
  if(q.length<2)return;
  const map={goa:"Goa",dubai:"Dubai",manali:"Manali",paris:"Paris",bali:"Bali",tokyo:"Tokyo",santorini:"Santorini",budget:"budget",itinerary:"itinerary"};
  const hit=Object.keys(map).find(k=>k.includes(q)||map[k].toLowerCase().includes(q));
  if(hit){
    if(["budget","itinerary"].includes(hit))showPage(hit);
    else{showPage("explore");document.getElementById("destinationSearch").value=map[hit];filterExplore()}
  }
}

function addExpense(){
  const name=document.getElementById("expenseName").value.trim();
  const amount=document.getElementById("expenseAmount").value;
  const category=document.getElementById("expenseCategory").value;
  if(!name||!amount){showToast("Add an expense name and amount");return}
  const row=document.createElement("tr");
  row.innerHTML=`<td>${escapeHtml(name)}</td><td>${category}</td><td>Today</td><td>₹${Number(amount).toLocaleString("en-IN")}</td>`;
  document.getElementById("expenseRows").prepend(row);
  closeModal("expenseModal");
  document.getElementById("expenseName").value="";
  document.getElementById("expenseAmount").value="";
  showToast("Expense added to your trip budget 💳");
}

function sendMessage(input){
  const text=input.value.trim();if(!text)return;
  const bubble=document.createElement("div");bubble.className="bubble mine";bubble.textContent=text;
  document.querySelector(".conversation").insertBefore(bubble,document.querySelector(".composer"));
  input.value="";
  setTimeout(()=>{const reply=document.createElement("div");reply.className="bubble theirs";reply.textContent="Sounds great! I'll add that to the plan 😊";document.querySelector(".conversation").insertBefore(reply,document.querySelector(".composer"))},700);
}

function toggleCompact(){
  document.body.classList.toggle("compact",document.getElementById("compactToggle").checked);
  showToast(document.body.classList.contains("compact")?"Compact dashboard enabled":"Comfortable dashboard enabled");
}

function showToast(message){
  const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");
  clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2600);
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

window.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();document.getElementById("globalSearch").focus()}
  if(e.key==="Escape")document.querySelectorAll(".overlay.show").forEach(x=>x.classList.remove("show"));
});

document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{
  if(e.target===o)o.classList.remove("show");
}));

renderFavorites();

/* ===== INTERACTION ENHANCEMENTS ===== */
const searchItems=[
  {name:'Goa',type:'Destination · India',page:'explore',icon:'🏝️'},
  {name:'Dubai',type:'Upcoming trip · UAE',page:'trips',icon:'🏙️'},
  {name:'Bali',type:'Destination · Indonesia',page:'explore',icon:'🌴'},
  {name:'Paris',type:'Destination · France',page:'explore',icon:'🗼'},
  {name:'Budget',type:'Your travel budget',page:'budget',icon:'₹'},
  {name:'Itinerary',type:'Goa getaway plan',page:'itinerary',icon:'🗓️'}
];

function renderSearchSuggestions(query=''){
  const box=document.getElementById('searchSuggestions'); if(!box)return;
  const q=query.toLowerCase().trim();
  const matches=(q?searchItems.filter(x=>(x.name+' '+x.type).toLowerCase().includes(q)):searchItems.slice(0,4));
  if(!matches.length){box.classList.remove('show');return}
  box.innerHTML=matches.slice(0,5).map(x=>`<button class="suggestion" onclick="selectSearch('${x.name}','${x.page}')"><span class="s-icon">${x.icon}</span><span><b>${x.name}</b><small>${x.type}</small></span></button>`).join('');
  box.classList.add('show');
}
function selectSearch(name,page){
  document.getElementById('globalSearch').value=name;
  document.getElementById('searchSuggestions')?.classList.remove('show');
  showPage(page);
  if(page==='explore'){
    const input=document.getElementById('destinationSearch');
    if(input){input.value=name;filterExplore();}
  }
}
const originalGlobalSearch=globalSearch;
globalSearch=function(){
  const input=document.getElementById('globalSearch');
  renderSearchSuggestions(input.value);
  const q=input.value.toLowerCase().trim();
  if(q.length<2)return;
  const hit=searchItems.find(x=>x.name.toLowerCase().includes(q)||x.type.toLowerCase().includes(q));
  if(hit && q===hit.name.toLowerCase()) selectSearch(hit.name,hit.page);
};

document.getElementById('globalSearch')?.addEventListener('focus',()=>renderSearchSuggestions(document.getElementById('globalSearch').value));
document.addEventListener('click',e=>{
  const search=e.target.closest('.search');
  if(!search)document.getElementById('searchSuggestions')?.classList.remove('show');
});

function syncFavoriteButtons(){
  const list=JSON.parse(localStorage.getItem('gt_favorites')||'[]');
  document.querySelectorAll('.destination-card').forEach(card=>{
    const name=card.querySelector('b')?.textContent.trim();
    card.querySelector('.heart')?.classList.toggle('liked',list.includes(name));
    if(card.querySelector('.heart')) card.querySelector('.heart').textContent=list.includes(name)?'♥':'♡';
  });
  document.querySelectorAll('.rec-heart').forEach(btn=>{
    btn.classList.toggle('liked',list.includes('Amalfi Coast')); btn.textContent=list.includes('Amalfi Coast')?'♥':'♡';
  });
}

const oldRenderFavorites=renderFavorites;
renderFavorites=function(){oldRenderFavorites();syncFavoriteButtons();};

const oldToggleFavorite=toggleFavorite;
toggleFavorite=function(el,name){
  if(window.event) window.event.stopPropagation();
  let list=JSON.parse(localStorage.getItem('gt_favorites')||'[]');
  const exists=list.includes(name);
  list=exists?list.filter(x=>x!==name):[...list,name];
  localStorage.setItem('gt_favorites',JSON.stringify(list));
  syncFavoriteButtons();
  renderFavorites();
  showToast(exists?`${name} removed from favorites`:`${name} saved to favorites ♥`);
};

/* Trip filter pills */
document.querySelectorAll('.filter-row .filter').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.filter-row .filter').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  const label=btn.textContent.toLowerCase();
  document.querySelectorAll('.wide-trip').forEach((card,i)=>{
    if(label.includes('draft')) card.style.display='none';
    else card.style.display='grid';
  });
  showToast(`${btn.textContent.replace(/\d/g,'').trim()} trips selected`);
}));

function toggleGlow(){
  const enabled=document.getElementById('glowToggle')?.checked;
  document.body.classList.toggle('no-glow',!enabled);
  localStorage.setItem('gt_glow',enabled?'1':'0');
}
function loadPreferences(){
  const glow=localStorage.getItem('gt_glow');
  if(glow!==null){const on=glow==='1';document.getElementById('glowToggle').checked=on;document.body.classList.toggle('no-glow',!on);}
  const compact=localStorage.getItem('gt_compact')==='1';
  const toggle=document.getElementById('compactToggle');
  if(toggle){toggle.checked=compact;document.body.classList.toggle('compact',compact);}
}
const oldToggleCompact=toggleCompact;
toggleCompact=function(){
  const enabled=document.getElementById('compactToggle').checked;
  document.body.classList.toggle('compact',enabled);localStorage.setItem('gt_compact',enabled?'1':'0');
  showToast(enabled?'Compact dashboard enabled':'Comfortable dashboard enabled');
};

/* gentle reveal for cards as pages open */
function animatePageCards(){
  document.querySelectorAll('.page.active .trip-card,.page.active .destination-card,.page.active .recommendation,.page.active .wide-trip,.page.active .settings-card,.page.active .expense-card').forEach((el,i)=>{
    el.style.animation=`cardIn .42s ${Math.min(i*45,240)}ms both`;
  });
}
const oldShowPage=showPage;
showPage=function(name){oldShowPage(name);setTimeout(animatePageCards,10);};

const revealStyle=document.createElement('style');
revealStyle.textContent='@keyframes cardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
document.head.appendChild(revealStyle);

loadPreferences();
syncFavoriteButtons();
animatePageCards();

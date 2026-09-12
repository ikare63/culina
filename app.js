function getInitialTheme(){
  const saved=localStorage.getItem("culina-theme");
  if(saved==="light"||saved==="dark")return saved;
  return window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem("culina-theme",theme);
  const b=document.getElementById("themeBtn");
  if(b){b.textContent=theme==="dark"?"☀":"☾";b.title=theme==="dark"?"Passer en mode clair":"Passer en mode sombre"}
  const meta=document.getElementById("themeColor");
  if(meta)meta.setAttribute("content",theme==="dark"?"#121713":"#fbf7ef");
}
function toggleTheme(){applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
applyTheme(getInitialTheme());

const state={
  recipes:[],category:"Toutes",query:"",favOnly:false,stockMode:false,
  prefs:JSON.parse(localStorage.getItem("culina-prefs")||"{}"),
  stock:JSON.parse(localStorage.getItem("culina-stock-v1")||"{}"),
  shopping:JSON.parse(localStorage.getItem("culina-shopping-v1")||"[]"),
  history:JSON.parse(localStorage.getItem("culina-history-v1")||"[]"),
  matchPrefs:JSON.parse(localStorage.getItem("culina-match-prefs-v1")||'{"mood":"any","time":999,"missing":99,"repeat":"on"}'),
  leftovers:JSON.parse(localStorage.getItem("culina-leftovers-v1")||"[]"),
  weekPlan:JSON.parse(localStorage.getItem("culina-week-v1")||"[]"),
  planned:JSON.parse(localStorage.getItem("culina-planned-v1")||"[]"),
  pendingCooked:null
};

const categories=["Toutes","Salé","Sucré","Petit-déjeuner","Snack","Boisson","Sauce & base"];
const emoji={"Salé":"🍝","Sucré":"🍪","Petit-déjeuner":"🥞","Boisson":"☕","Sauce & base":"🥣","Snack":"🍿"};
const days=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const stockCatalog={
  proteine:[
    "Poulet","Blanc de poulet","Escalope de poulet","Poulet pané","Dinde","Escalope de dinde",
    "Bœuf","Bœuf haché","Steak haché","Steak de bœuf","Veau","Escalope de veau","Porc","Côte de porc",
    "Jambon","Lardons","Bacon","Chorizo","Merguez","Saucisses","Pancetta","Canard",
    "Saumon","Thon","Cabillaud","Crevettes","Œufs","Blancs d’œufs","Tofu"
  ],
  feculent:[
    "Pâtes","Pâtes protéinées","Spaghetti","Riz","Riz basmati","Riz complet","Semoule","Pommes de terre","Patate douce",
    "Quinoa","Boulgour","Polenta","Blé précuit","Orge perlé","Gnocchis","Tortillas","Pain","Pains pita","Flocons d’avoine",
    "Lentilles vertes","Lentilles corail","Pois chiches","Haricots rouges","Haricots blancs"
  ],
  legume:[
    "Haricots verts","Poivron rouge","Poivron vert","Courgette","Carotte","Brocoli","Chou-fleur","Champignons","Tomates",
    "Tomates cerises","Concombre","Épinards","Oignon","Oignon rouge","Poireaux","Aubergine","Avocat","Petits pois","Maïs",
    "Salade verte","Céleri","Navet","Butternut","Potimarron"
  ],
  basique:[
    "Beurre","Crème fraîche","Crème entière","Lait","Fromage blanc","Skyr","Yaourt nature",
    "Sauce tomate","Tomates concassées","Concentré de tomate","Béchamel",
    "Moutarde","Sauce soja","Bouillon","Huile d’olive","Huile","Farine","Maïzena","Levure chimique","Sucre","Miel",
    "Ail","Citron","Paprika","Curry","Herbes de Provence","Sel","Poivre"
  ]
};
const groupLabels={
  proteine:"🥩 Viandes / protéines",
  feculent:"🍚 Féculents & légumineuses",
  legume:"🥕 Légumes",
  basique:"🧈 Frais & basiques"
};

function normalize(s){return(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function savePrefs(){localStorage.setItem("culina-prefs",JSON.stringify(state.prefs))}
function saveStock(){localStorage.setItem("culina-stock-v1",JSON.stringify(state.stock))}
function saveShopping(){localStorage.setItem("culina-shopping-v1",JSON.stringify(state.shopping))}
function saveHistory(){localStorage.setItem("culina-history-v1",JSON.stringify(state.history))}
function saveLeftovers(){localStorage.setItem("culina-leftovers-v1",JSON.stringify(state.leftovers))}
function saveWeek(){localStorage.setItem("culina-week-v1",JSON.stringify(state.weekPlan))}
function savePlanned(){localStorage.setItem("culina-planned-v1",JSON.stringify(state.planned))}
function localDateTimeValue(ts){const d=new Date(ts);const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function defaultPlanValue(){const d=new Date();if(d.getHours()<19){d.setHours(19,0,0,0)}else{d.setDate(d.getDate()+1);d.setHours(19,0,0,0)}return localDateTimeValue(d.getTime())}
function formatPlannedDate(ts){return new Date(ts).toLocaleString("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
function purgeCheeseStocks(){const banned=["parmesan","mozzarella","cheddar","feta","fromage rape","fromage frais","gruyere","emmental","mascarpone"];let changed=false;Object.keys(state.stock).forEach(k=>{const n=normalize(state.stock[k]?.name||k);if(!n.includes("fromage blanc")&&banned.some(x=>n.includes(x))){delete state.stock[k];changed=true}});if(changed)saveStock()}

function pref(r){return state.prefs[r.id]||{}}
function isFav(r){return pref(r).favori??r.favori??false}
function statusOf(r){return pref(r).statut??r.statut??"À tester"}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800)}

function ingredientAliases(n){
  const variants=[n];
  const pairs=[
    ["pates proteinees","pates"],["oeufs","oeuf"],["blancs d oeufs","oeuf"],["boeuf hache","boeuf"],["steak hache","boeuf"],["steak de boeuf","boeuf"],
    ["blanc de poulet","poulet"],["escalope de poulet","poulet"],["poulet pane","poulet"],["escalope de dinde","dinde"],
    ["pommes de terre","pomme de terre"],["riz basmati","riz"],["riz complet","riz"],["spaghetti","pates"],
    ["petits pois","petit pois"],["pois chiches","pois chiche"],["haricots verts","haricot vert"],["haricots rouges","haricot rouge"],["haricots blancs","haricot blanc"],
    ["champignons","champignon"],["tomates cerises","tomate"],["tomates","tomate"],["poivron rouge","poivron"],["poivron vert","poivron"],
    ["semoule de couscous","semoule"],["lentilles vertes","lentilles"],["lentilles corail","lentilles"],["ble precuit","ble"],["pains pita","pain pita"],
    ["creme fraiche","creme"],["creme entiere","creme"],["fromage rape","fromage"]
  ];
  pairs.forEach(([a,b])=>{if(n.includes(a))variants.push(b);if(n.includes(b))variants.push(a)});
  return variants;
}
function availableNames(){
  const fromStock=Object.values(state.stock).filter(Boolean).map(x=>normalize(x.name));
  const fromLeftovers=state.leftovers.filter(x=>x.type==="ingredient").map(x=>normalize(x.name));
  return [...fromStock,...fromLeftovers];
}
function isInStock(name){
  const variants=ingredientAliases(normalize(name)),names=availableNames();
  return names.some(s=>variants.some(v=>s.includes(v)||v.includes(s)));
}
function groupForName(name){
  const n=normalize(name),hit=arr=>arr.some(x=>{const a=normalize(x);return n.includes(a)||a.includes(n)});
  if(hit(stockCatalog.proteine))return"proteine";if(hit(stockCatalog.feculent))return"feculent";if(hit(stockCatalog.legume))return"legume";if(hit(stockCatalog.basique))return"basique";return"autre";
}
function migrateStockGroups(){
  let changed=false;
  Object.values(state.stock).filter(Boolean).forEach(x=>{const g=groupForName(x.name);if(g!=="autre"&&x.group!==g){x.group=g;changed=true}});
  if(changed)saveStock();
}
function principalIngredients(r){return(r.ingredients||[]).filter(i=>i.type_stock==="principal")}
function matchInfo(r){
  const p=principalIngredients(r);if(!p.length)return{have:0,total:0,missing:[],score:0};
  const missing=p.filter(i=>!isInStock(i.ingredient)),have=p.length-missing.length;
  return{have,total:p.length,missing,score:Math.round(have/p.length*100)};
}
function primaryIngredient(r,group){return(r.ingredients||[]).find(i=>i.groupe_stock===group&&i.type_stock==="principal")}
function recentRecipeIds(limit=10){return new Set(state.history.slice(0,limit).map(x=>x.id))}
function lastCookedIndex(id){return state.history.findIndex(x=>x.id===id)}

const LEGACY_RECIPE_ID_MAP={"pates-poulet-parmesan": "pates-poulet-creme-et-paprika", "pates-gratinees-jambon-fromage": "pates-jambon-creme-au-four", "mac-cheese": "macaroni-cremeux-au-poulet", "pates-aux-champignons-et-parmesan": "pates-cremeuses-aux-champignons", "pates-citron-parmesan": "pates-cremeuses-citron-ail", "risotto-champignons-parmesan": "risotto-aux-champignons", "poulet-parmesan-au-four": "poulet-tomate-au-four", "escalope-parmesan": "escalope-aux-herbes", "cheeseburger-smash": "smash-burger-aux-oignons", "grilled-cheese": "toast-chaud-jambon-tomate", "quesadillas-poulet-fromage": "quesadillas-poulet-poivron", "pizza-jambon-mozzarella": "pizza-jambon-poivron", "gratin-de-pates-jambon-fromage": "gratin-de-pates-jambon-tomate-sans-fromage", "salade-tomate-mozzarella": "salade-tomate-avocat", "cheesecake": "cheesecake-au-fromage-blanc", "cheesecake-caramel": "cheesecake-au-fromage-blanc-et-caramel", "yaourt-facon-cheesecake": "dessert-au-fromage-blanc-facon-cheesecake", "omelette-jambon-fromage": "omelette-jambon-oignon", "sauce-creme-parmesan": "sauce-creme-ail", "mini-quesadilla-fromage": "mini-quesadilla-poulet-tomate", "pommes-de-terre-farcies-jambon-fromage": "pommes-de-terre-farcies-jambon-creme", "polenta-legumes-rotis-feta": "polenta-aux-legumes-rotis", "bruschettas-buf-tomate-mozzarella": "bruschettas-buf-tomate", "pois-chiches-rotis-patate-douce-et-feta": "pois-chiches-rotis-et-patate-douce"};
function migrateRecipeIds(){
  let changedPrefs=false;for(const [oldId,newId] of Object.entries(LEGACY_RECIPE_ID_MAP)){if(state.prefs[oldId]&&!state.prefs[newId]){state.prefs[newId]=state.prefs[oldId];delete state.prefs[oldId];changedPrefs=true}}
  if(changedPrefs)savePrefs();
  let h=false;state.history.forEach(x=>{if(LEGACY_RECIPE_ID_MAP[x.id]){x.id=LEGACY_RECIPE_ID_MAP[x.id];h=true}});if(h)saveHistory();
  let w=false;state.weekPlan.forEach(x=>{if(LEGACY_RECIPE_ID_MAP[x.recipeId]){x.recipeId=LEGACY_RECIPE_ID_MAP[x.recipeId];w=true}});if(w)saveWeek();
  let p=false;state.planned.forEach(x=>{if(LEGACY_RECIPE_ID_MAP[x.recipeId]){x.recipeId=LEGACY_RECIPE_ID_MAP[x.recipeId];p=true}});if(p)savePlanned();
  let l=false;state.leftovers.forEach(x=>{if(x.recipeId&&LEGACY_RECIPE_ID_MAP[x.recipeId]){x.recipeId=LEGACY_RECIPE_ID_MAP[x.recipeId];l=true}});if(l)saveLeftovers();
}
async function boot(){
  let base;
  try{const r=await fetch("recettes.json",{cache:"no-store"});if(!r.ok)throw 0;base=await r.json()}
  catch(e){base=JSON.parse(document.getElementById("culinaFallback").textContent)}
  state.recipes=base.recettes;
  migrateStockGroups();
  drawChips();setupTabs();wireEvents();renderAll();
}
function activateView(view){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===view));
  if(view==="forYou")renderForYou();
  if(view==="recipes")renderRecipes();
  if(view==="stocks")renderStocks();
  if(view==="shopping")renderShopping();
  if(view==="culinaMatch")renderCulinaMatch();
  if(view==="week")renderWeek();
  window.scrollTo({top:0,behavior:"smooth"});
}
function goView(view){activateView(view)}
function setupTabs(){
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>activateView(b.dataset.view));
}
function homeMatch(mood,time){
  state.matchPrefs={...state.matchPrefs,mood,time,missing:2,repeat:"on"};
  localStorage.setItem("culina-match-prefs-v1",JSON.stringify(state.matchPrefs));
  goView("culinaMatch");
}
function drawChips(){
  const c=document.getElementById("chips");c.innerHTML="";
  categories.forEach(cat=>{const b=document.createElement("button");b.className="chip"+(state.category===cat?" active":"");b.textContent=cat;b.onclick=()=>{state.category=cat;drawChips();renderRecipes()};c.appendChild(b)});
}
function filteredRecipes(){
  const q=normalize(state.query);
  let a=state.recipes.filter(r=>{
    if(state.category!=="Toutes"&&r.categorie!==state.category)return false;
    if(state.favOnly&&!isFav(r))return false;
    if(q){
      const hay=normalize([r.nom,r.categorie,r.sous_categorie,...(r.tags||[]),...(r.ingredients||[]).map(i=>i.ingredient)].join(" "));
      if(!hay.includes(q))return false;
    }
    return true;
  });
  if(state.stockMode)a.sort((a,b)=>matchInfo(b).score-matchInfo(a).score||matchInfo(a).missing.length-matchInfo(b).missing.length);
  return a;
}
function matchBadge(r,force=false){
  if(!state.stockMode&&!force)return"";
  const m=matchInfo(r);
  if(!m.total)return`<div class="match low">Peu lié à tes stocks actuels</div>`;
  if(!m.missing.length)return`<div class="match ok">✓ Tous les ingrédients principaux sont là</div>`;
  if(m.missing.length===1)return`<div class="match near">Il manque seulement ${esc(m.missing[0].ingredient)}</div>`;
  return`<div class="match low">Il manque ${m.missing.length} ingrédients principaux</div>`;
}
function recipeCard(r,force=false,reasons=[]){
  const n=r.nutrition_par_portion_estimee||{},el=document.createElement("article");el.className="card";
  el.innerHTML=`<button class="fav">${isFav(r)?"♥":"♡"}</button><div class="emoji">${emoji[r.categorie]||"🍴"}</div>
    <h4>${esc(r.nom)}</h4><div class="meta"><span>⏱ ${r.temps_minutes||"—"} min</span><span>👥 ${r.portions||"—"}</span></div>
    ${n.kcal!=null?`<div class="nutrition-line"><b>Par portion</b> · ${n.kcal} kcal · P ${n.proteines_g} g · G ${n.glucides_g} g · L ${n.lipides_g} g</div>`:""}
    ${matchBadge(r,force)}${reasons.length?`<div class="reasonbox">${reasons.map(esc).join(" · ")}</div>`:""}
    <div class="tags">${(r.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`;
  el.querySelector(".fav").onclick=e=>{e.stopPropagation();toggleFav(r.id)};
  el.onclick=()=>openDetail(r.id);return el;
}
function renderRecipes(){
  const list=filteredRecipes(),grid=document.getElementById("grid");grid.innerHTML="";
  list.forEach(r=>grid.appendChild(recipeCard(r)));
  document.getElementById("recipeEmpty").style.display=list.length?"none":"block";
  document.getElementById("count").textContent=list.length+" recette"+(list.length>1?"s":"");
  document.getElementById("sectionName").textContent=state.stockMode?"Classées selon mes stocks":(state.category==="Toutes"?"Toutes les recettes":state.category);
  document.getElementById("totalStat").textContent=state.recipes.length;
  document.getElementById("stockStat").textContent=Object.values(state.stock).filter(Boolean).length;
  document.getElementById("favStat").textContent=state.recipes.filter(isFav).length;
  document.getElementById("stockMode").textContent=state.stockMode?"✓ Classées selon mes stocks":"🧺 Avec ce que j’ai";
}
function toggleFav(id){
  const r=state.recipes.find(x=>x.id===id);if(!r)return;
  state.prefs[id]={...pref(r),favori:!isFav(r)};savePrefs();renderAll();
}

function renderStocks(){
  const grid=document.getElementById("stockGrid");grid.innerHTML="";
  const filter=normalize(document.getElementById("stockSearch")?.value||"");
  ["proteine","feculent","legume","basique"].forEach(group=>{
    const box=document.createElement("div");box.className="stock-group";
    box.innerHTML=`<h4>${groupLabels[group]}</h4><div class="stockchips"></div><div class="addline"><input placeholder="Ajouter un produit…"><button class="btn small">＋</button></div>`;
    const chips=box.querySelector(".stockchips");
    const customs=Object.values(state.stock).filter(x=>x&&x.group===group&&!stockCatalog[group].some(c=>normalize(c)===normalize(x.name))).map(x=>x.name);
    const all=[...new Set([...stockCatalog[group],...customs])].filter(name=>!filter||normalize(name).includes(filter));
    if(!all.length)chips.innerHTML=`<span style="font-size:10px;color:var(--muted)">Aucun résultat dans cette catégorie</span>`;
    all.forEach(name=>{
      const key=normalize(name),on=!!state.stock[key],b=document.createElement("button");b.className="stockchip"+(on?" on":"");b.textContent=(on?"✓ ":"")+name;
      b.onclick=()=>toggleStock(name,group);chips.appendChild(b);
    });
    const input=box.querySelector("input"),add=()=>{const name=input.value.trim();if(name){setStock(name,group,true);input.value="";renderAll()}};
    box.querySelector(".addline button").onclick=add;input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add()}});
    grid.appendChild(box);
  });
  const counts={proteine:0,feculent:0,legume:0,basique:0};Object.values(state.stock).filter(Boolean).forEach(x=>counts[x.group]=(counts[x.group]||0)+1);
  document.getElementById("stockSummary").innerHTML=`<span class="summary-pill">🥩 ${counts.proteine||0} protéines</span><span class="summary-pill">🍚 ${counts.feculent||0} féculents/légumineuses</span><span class="summary-pill">🥕 ${counts.legume||0} légumes</span><span class="summary-pill">🧈 ${counts.basique||0} basiques</span><span class="summary-pill">♻️ ${state.leftovers.filter(x=>x.type==="ingredient").length} restes</span>`;
  renderStockSuggestions();
}
function setStock(name,group,on){const key=normalize(name);if(on)state.stock[key]={name,group};else delete state.stock[key];saveStock();updateBadges()}
function toggleStock(name,group){
  const key=normalize(name),was=!!state.stock[key];
  if(was){delete state.stock[key];saveStock();addShopping(name,group,"Stock épuisé",false);toast(name+" ajouté aux courses")}
  else{state.stock[key]={name,group};saveStock();removeShoppingByName(name);toast(name+" ajouté aux stocks")}
  renderAll();
}
function renderStockSuggestions(){
  const g=document.getElementById("stockSuggestions");g.innerHTML="";
  personalizedRanking({maxTime:999,maxMissing:99,limit:8,stockHeavy:true}).forEach(x=>g.appendChild(recipeCard(x.r,true,x.reasons)));
}

function addShopping(name,group="autre",source="Ajout manuel",rerender=true){
  if(!name.trim())return;const n=normalize(name);
  if(state.shopping.some(x=>normalize(x.name)===n)){if(rerender)renderShopping();return}
  state.shopping.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),name:name.trim(),group,source,checked:false});saveShopping();updateBadges();if(rerender)renderShopping();
}
function removeShoppingByName(name){const n=normalize(name);state.shopping=state.shopping.filter(x=>normalize(x.name)!==n);saveShopping();updateBadges()}
function renderShopping(){
  const list=document.getElementById("shoppingList");list.innerHTML="";
  document.getElementById("shoppingEmpty").style.display=state.shopping.length?"none":"block";
  state.shopping.forEach(item=>{
    const row=document.createElement("div");row.className="shopitem"+(item.checked?" done":"");
    row.innerHTML=`<input class="shopcheck" type="checkbox" ${item.checked?"checked":""}><div><div class="shopname"><b>${esc(item.name)}</b></div><div class="shopmeta">${esc(item.source||"")}</div></div><button class="iconbtn">×</button>`;
    row.querySelector("input").onchange=e=>{item.checked=e.target.checked;saveShopping();renderShopping()};
    row.querySelector(".iconbtn").onclick=()=>{state.shopping=state.shopping.filter(x=>x.id!==item.id);saveShopping();renderShopping();updateBadges()};
    list.appendChild(row);
  });updateBadges();
}
function updateBadges(){document.getElementById("shopBadge").textContent=state.shopping.filter(x=>!x.checked).length}
function restockChecked(){
  const checked=state.shopping.filter(x=>x.checked);
  checked.forEach(x=>{const group=x.group&&x.group!=="autre"?x.group:groupForName(x.name);if(["proteine","feculent","legume","basique"].includes(group))state.stock[normalize(x.name)]={name:x.name,group}});
  state.shopping=state.shopping.filter(x=>!x.checked);saveStock();saveShopping();renderAll();toast("Achats rangés dans tes stocks");
}

function ingredientStatus(i){
  if(i.type_stock==="basique")return isInStock(i.ingredient)?`<span class="ing-have">✓ dispo</span>`:`<span class="ing-basic">basique</span>`;
  if(i.type_stock==="principal")return isInStock(i.ingredient)?`<span class="ing-have">✓ dispo</span>`:`<span class="ing-miss">manque</span>`;
  return"";
}
function fmtQty(q){if(q===null||q===undefined||q==="")return"";if(typeof q!=="number")return q;return String(Math.round(q*100)/100).replace(".",",")}
function ingredientHTML(r,factor){return(r.ingredients||[]).map(i=>`<li><b>${fmtQty(typeof i.quantite==="number"?i.quantite*factor:i.quantite)} ${esc(i.unite||"")}</b><span>${esc(i.ingredient)}</span>${ingredientStatus(i)}</li>`).join("")}
function preparationHTML(r,simple=false){
  const source=(simple&&r.version_simplifiee?.etapes?.length)?r.version_simplifiee.etapes:(r.etapes||[]);
  return source.map(s=>`<li>${esc(s)}</li>`).join("");
}
function toggleSimpleRecipe(){
  const d=document.getElementById("detailContent"),r=state.recipes.find(x=>x.id===d.dataset.id);if(!r||!r.version_simplifiee)return;
  const simple=d.dataset.simple!=="1";d.dataset.simple=simple?"1":"0";
  const list=document.getElementById("recipeSteps"),btn=document.getElementById("simpleRecipeBtn"),note=document.getElementById("simpleRecipeNote");
  if(list)list.innerHTML=preparationHTML(r,simple);
  if(btn)btn.textContent=simple?"↩ Version détaillée":"⚡ Version simple";
  if(note){note.style.display=simple?"block":"none";note.textContent=r.version_simplifiee.note||"Étapes regroupées pour aller à l’essentiel."}
}
function openDetail(id){
  const r=state.recipes.find(x=>x.id===id);if(!r)return;const m=matchInfo(r),n=r.nutrition_par_portion_estimee||{},d=document.getElementById("detailContent");
  d.dataset.id=id;d.dataset.basePortions=r.portions||1;d.dataset.portions=r.portions||1;d.dataset.simple="0";
  let stockNotice="";
  if(m.total)stockNotice=!m.missing.length?`<div class="notice good">✓ Tu as tous les ingrédients principaux nécessaires.</div>`:`<div class="notice">Il te manque : <b>${m.missing.map(x=>esc(x.ingredient)).join(", ")}</b>. Les basiques comme crème, sauces et épices ne bloquent pas la proposition.</div>`;
  d.innerHTML=`<div class="modal-head"><div><div class="subtitle">${esc(r.categorie)} · ${esc(r.sous_categorie||"Recette")}</div><h2>${esc(r.nom)}</h2><div class="meta"><span>⏱ ${r.temps_minutes||"—"} min</span><span>· ${esc(r.difficulte||"—")}</span></div></div><button class="close" onclick="detailDialog.close()">×</button></div>
  <div class="modal-body">${stockNotice}
    <div class="nutrition-title">Nutrition par portion · estimation</div>
    <div class="nutrition"><div class="nut"><b>${n.kcal??"—"}</b><span>kcal</span></div><div class="nut"><b>${n.proteines_g??"—"} g</b><span>protéines</span></div><div class="nut"><b>${n.glucides_g??"—"} g</b><span>glucides</span></div><div class="nut"><b>${n.lipides_g??"—"} g</b><span>lipides</span></div></div>
    <div class="portionbox"><b>Portions</b><button onclick="changePortions(-1)">−</button><span id="portionVal">${r.portions}</span><button onclick="changePortions(1)">+</button></div>
    <div class="detail-grid"><div><h3>Ingrédients</h3><ul class="ingredients" id="ingredientsList">${ingredientHTML(r,1)}</ul></div><div><h3>Préparation</h3>${r.version_simplifiee?`<button class="btn small" id="simpleRecipeBtn" onclick="toggleSimpleRecipe()">⚡ Version simple</button><div class="simple-note" id="simpleRecipeNote" style="display:none"></div>`:""}<ol class="steps" id="recipeSteps">${preparationHTML(r,false)}</ol></div></div>
    <div class="planner"><h3>⏰ Faire cette recette plus tard</h3><p>Choisis une date et une heure. Culina l’enregistre et te rappelle quand l’heure arrive.</p><div class="planner-row"><input type="datetime-local" id="recipePlanDate" value="${defaultPlanValue()}" min="${localDateTimeValue(Date.now())}"><button class="btn primary" onclick="scheduleRecipe('${r.id}')">Programmer</button></div></div>
    <div class="statusbar"><button class="btn" onclick="toggleFav('${r.id}');openDetail('${r.id}')">${isFav(r)?"♥ Favori":"♡ Favori"}</button>
      ${m.missing.length?`<button class="btn primary" onclick="addMissingFromRecipe('${r.id}')">🛒 Ajouter les manquants</button>`:""}
      <button class="btn good" onclick="markCooked('${r.id}')">🍽 Je l’ai cuisinée</button>
      <select onchange="setStatus('${r.id}',this.value)"><option ${statusOf(r)==="À tester"?"selected":""}>À tester</option><option ${statusOf(r)==="Validée"?"selected":""}>Validée</option><option ${statusOf(r)==="À refaire"?"selected":""}>À refaire</option><option ${statusOf(r)==="Bof"?"selected":""}>Bof</option></select>
    </div>
  </div>`;
  document.getElementById("detailDialog").showModal();
}
function changePortions(delta){
  const d=document.getElementById("detailContent"),r=state.recipes.find(x=>x.id===d.dataset.id);
  let p=Math.max(1,Number(d.dataset.portions)+delta);d.dataset.portions=p;document.getElementById("portionVal").textContent=p;
  document.getElementById("ingredientsList").innerHTML=ingredientHTML(r,p/Number(d.dataset.basePortions));
}
function setStatus(id,v){const r=state.recipes.find(x=>x.id===id);if(!r)return;state.prefs[id]={...pref(r),statut:v};savePrefs();renderAll()}
function addMissingFromRecipe(id){
  const r=state.recipes.find(x=>x.id===id),missing=matchInfo(r).missing;
  missing.forEach(i=>addShopping(i.ingredient,i.groupe_stock||groupForName(i.ingredient),"Pour "+r.nom,false));saveShopping();updateBadges();
  toast(missing.length+" ingrédient"+(missing.length>1?"s":"")+" ajouté"+(missing.length>1?"s":"")+" aux courses");
}

async function requestReminderPermission(){
  if(!("Notification" in window))return "unsupported";
  if(Notification.permission==="granted")return "granted";
  if(Notification.permission==="denied")return "denied";
  try{return await Notification.requestPermission()}catch(e){return "denied"}
}
async function scheduleRecipe(id){
  const r=state.recipes.find(x=>x.id===id),input=document.getElementById("recipePlanDate");if(!r||!input)return;
  const at=new Date(input.value).getTime();if(!Number.isFinite(at)||at<=Date.now()){toast("Choisis une heure dans le futur");return}
  const permission=await requestReminderPermission();
  state.planned.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),recipeId:r.id,name:r.nom,at,notified:false,createdAt:Date.now()});
  savePlanned();renderPlanned();renderForYou();document.getElementById("detailDialog").close();
  if(permission==="granted")toast("Recette programmée · rappel navigateur activé");
  else toast("Recette programmée dans Culina");
  armNearestReminder();
}
function cancelPlanned(id){state.planned=state.planned.filter(x=>x.id!==id);savePlanned();renderPlanned();renderForYou();toast("Recette déprogrammée")}
function completePlanned(id){const p=state.planned.find(x=>x.id===id);if(!p)return;state.planned=state.planned.filter(x=>x.id!==id);savePlanned();markCooked(p.recipeId)}
function renderPlanned(){
  const panel=document.getElementById("plannedPanel"),list=document.getElementById("plannedList"),count=document.getElementById("plannedCount");if(!panel||!list)return;
  const items=state.planned.slice().sort((a,b)=>a.at-b.at);panel.style.display=items.length?"block":"none";list.innerHTML="";if(count)count.textContent=items.length?items.length+" prévue"+(items.length>1?"s":""):"";
  items.forEach(p=>{const row=document.createElement("div"),due=p.at<=Date.now();row.className="planned-item"+(due?" planned-due":"");row.innerHTML=`<div><b>${due?"⏰ ":""}${esc(p.name)}</b><small>${due?"C’est l’heure · ":""}${esc(formatPlannedDate(p.at))}</small></div><div class="planned-actions"><button class="btn small" onclick="openDetail('${p.recipeId}')">Voir</button><button class="btn small good" onclick="completePlanned('${p.id}')">Fait</button><button class="btn small" onclick="cancelPlanned('${p.id}')">×</button></div>`;list.appendChild(row)});
}
async function fireRecipeReminder(p){
  const title="Culina — c’est l’heure";const body=`Prépare : ${p.name}`;
  let shown=false;
  try{
    if("Notification" in window&&Notification.permission==="granted"){
      if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:"img/icon-192.png",badge:"img/favicon-32.png",tag:"culina-"+p.id,data:{recipeId:p.recipeId}});shown=true}
      else{new Notification(title,{body,icon:"img/icon-192.png",tag:"culina-"+p.id});shown=true}
    }
  }catch(e){}
  if(document.visibilityState==="visible"){toast("⏰ "+body);if(navigator.vibrate)navigator.vibrate([180,80,180]);shown=true}
  return shown;
}
async function checkRecipeReminders(){
  let changed=false;for(const p of state.planned){if(!p.notified&&p.at<=Date.now()){const shown=await fireRecipeReminder(p);if(shown){p.notified=true;changed=true}}}
  if(changed)savePlanned();renderPlanned();
}
let reminderTimer=null;
function armNearestReminder(){
  if(reminderTimer)clearTimeout(reminderTimer);const next=state.planned.filter(p=>!p.notified&&p.at>Date.now()).sort((a,b)=>a.at-b.at)[0];if(!next)return;
  const delay=Math.min(2147480000,Math.max(500,next.at-Date.now()));reminderTimer=setTimeout(()=>{checkRecipeReminders();armNearestReminder()},delay)
}
function markCooked(id){
  const r=state.recipes.find(x=>x.id===id);if(!r)return;
  state.history.unshift({id:r.id,nom:r.nom,at:Date.now()});state.history=state.history.slice(0,60);saveHistory();
  state.prefs[id]={...pref(r),statut:statusOf(r)==="À tester"?"Validée":statusOf(r)};savePrefs();
  state.pendingCooked=r.id;document.getElementById("cookedDialogText").textContent=`Tu viens d’enregistrer « ${r.nom} ». Culina peut aussi mémoriser une portion restante.`;
  document.getElementById("detailDialog").close();document.getElementById("cookedDialog").showModal();renderAll();
}
function finishCookedNoLeftover(){state.pendingCooked=null;document.getElementById("cookedDialog").close();toast("Repas mémorisé")}
function finishCookedPortion(qty){
  const r=state.recipes.find(x=>x.id===state.pendingCooked);if(!r)return finishCookedNoLeftover();
  state.leftovers.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),type:"portion",recipeId:r.id,name:r.nom,group:"plat",quantity:qty,unit:"portion",createdAt:Date.now(),source:"Plat cuisiné"});
  saveLeftovers();state.pendingCooked=null;document.getElementById("cookedDialog").close();renderAll();toast(qty+" portion"+(qty>1?"s":"")+" restante"+(qty>1?"s":"")+" mémorisée"+(qty>1?"s":""));
}

function addLeftoverIngredient(){
  const name=document.getElementById("leftoverName").value.trim();if(!name)return;
  const q=Number(document.getElementById("leftoverQty").value)||1,unit=document.getElementById("leftoverUnit").value,group=groupForName(name);
  state.leftovers.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),type:"ingredient",name,group,quantity:q,unit,createdAt:Date.now(),source:"Reste"});
  saveLeftovers();document.getElementById("leftoverName").value="";document.getElementById("leftoverQty").value="";renderAll();toast(name+" ajouté aux restes");
}
function removeLeftover(id){
  state.leftovers=state.leftovers.filter(x=>x.id!==id);saveLeftovers();renderAll();toast("Reste retiré");
}
function eatLeftoverPortion(id){
  const x=state.leftovers.find(v=>v.id===id);if(!x)return;
  x.quantity=Number(x.quantity||1)-1;
  if(x.quantity<=0)state.leftovers=state.leftovers.filter(v=>v.id!==id);
  saveLeftovers();renderAll();toast("Bon appétit — reste mis à jour");
}
function renderLeftovers(){
  const list=document.getElementById("leftoverList");list.innerHTML="";
  if(!state.leftovers.length){list.innerHTML='<div class="empty" style="padding:18px 6px">Aucun reste enregistré.</div>';return}
  state.leftovers.forEach(x=>{
    const row=document.createElement("div");row.className="leftover-item";
    const when=new Date(x.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
    row.innerHTML=`<div><b>${x.type==="portion"?"🍽 ":"♻️ "}${esc(x.name)}</b><small>${esc(fmtQty(x.quantity))} ${esc(x.unit)} · ajouté le ${when}</small></div><button class="btn small">Terminé</button>`;
    row.querySelector("button").onclick=()=>removeLeftover(x.id);list.appendChild(row);
  });
}
function leftoverIngredientNames(){return state.leftovers.filter(x=>x.type==="ingredient").map(x=>normalize(x.name))}
function recipeUsesLeftover(r){
  const l=leftoverIngredientNames();if(!l.length)return 0;
  return principalIngredients(r).filter(i=>{const n=normalize(i.ingredient);return l.some(x=>n.includes(x)||x.includes(n))}).length;
}
function renderLeftoverSuggestions(){
  const g=document.getElementById("leftoverSuggestions");g.innerHTML="";
  const ranked=state.recipes.filter(r=>r.categorie==="Salé"&&recipeUsesLeftover(r)>0)
    .map(r=>({r,hits:recipeUsesLeftover(r),info:personalizedInfo(r,{maxTime:999,maxMissing:99,stockHeavy:true})}))
    .sort((a,b)=>b.hits-a.hits||b.info.score-a.info.score).slice(0,8);
  ranked.forEach(x=>g.appendChild(recipeCard(x.r,true,["utilise "+x.hits+" de tes restes",...x.info.reasons].slice(0,3))));
  document.getElementById("leftoverSuggestionCount").textContent=ranked.length?ranked.length+" idée"+(ranked.length>1?"s":""):"";
  document.getElementById("leftoverSuggestionsEmpty").style.display=ranked.length?"none":"block";
}

function tasteProfile(){
  const tagScores={},proteinScores={},starchScores={},negativeScores={};
  const add=(obj,key,val)=>{if(!key)return;obj[key]=(obj[key]||0)+val};
  state.recipes.forEach(r=>{
    let w=0;const st=statusOf(r);
    if(isFav(r))w+=4;if(st==="À refaire")w+=4;else if(st==="Validée")w+=2;else if(st==="Bof")w-=6;
    if(!w)return;
    (r.tags||[]).forEach(t=>{const k=normalize(t);if(["favori","rapide","classique","facile","familial"].includes(k))return;if(w>0)add(tagScores,t,w);else add(negativeScores,t,-w)});
    const p=primaryIngredient(r,"proteine"),s=primaryIngredient(r,"feculent");
    if(p&&w>0)add(proteinScores,p.ingredient,w);if(s&&w>0)add(starchScores,s.ingredient,w);
  });
  state.history.slice(0,30).forEach((h,idx)=>{
    const r=state.recipes.find(x=>x.id===h.id);if(!r)return;const w=Math.max(0.4,1.8-idx*.05);
    (r.tags||[]).forEach(t=>{const k=normalize(t);if(!["favori","rapide","classique","facile","familial"].includes(k))add(tagScores,t,w)});
    const p=primaryIngredient(r,"proteine"),s=primaryIngredient(r,"feculent");if(p)add(proteinScores,p.ingredient,w);if(s)add(starchScores,s.ingredient,w);
  });
  const top=obj=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  return{tags:top(tagScores).slice(0,6),proteins:top(proteinScores).slice(0,5),starches:top(starchScores).slice(0,5),negative:top(negativeScores).slice(0,5),raw:{tagScores,proteinScores,starchScores,negativeScores}};
}
function renderTasteProfile(){
  const p=tasteProfile(),fill=(id,arr,neg=false)=>{
    const el=document.getElementById(id);el.innerHTML="";
    if(!arr.length){el.innerHTML='<span class="taste">Pas assez de recul</span>';return}
    arr.forEach(x=>{const s=document.createElement("span");s.className="taste"+(neg?" negative":"");s.textContent=x;el.appendChild(s)});
  };
  fill("tasteTags",p.tags);fill("tasteProteins",p.proteins);fill("tasteStarches",p.starches);fill("tasteNegative",p.negative,true);
  document.getElementById("tasteNegativeWrap").style.display=p.negative.length?"block":"none";
}
function tasteAffinity(r){
  const p=tasteProfile().raw;let score=0,reasons=[];
  (r.tags||[]).forEach(t=>{score+=(p.tagScores[t]||0)*.55;score-=(p.negativeScores[t]||0)*.9});
  const pr=primaryIngredient(r,"proteine"),st=primaryIngredient(r,"feculent");
  if(pr)score+=(p.proteinScores[pr.ingredient]||0)*.45;
  if(st)score+=(p.starchScores[st.ingredient]||0)*.35;
  const liked=[...(r.tags||[])].filter(t=>(p.tagScores[t]||0)>=5);
  if(liked.length)reasons.push("dans tes goûts");
  return{score,reasons};
}

function moodScore(r,mood){
  const n=r.nutrition_par_portion_estimee||{},txt=normalize([r.nom,...(r.tags||[])].join(" "));
  if(mood==="any")return{score:0,reason:""};
  if(mood==="protein"){const s=Math.min(22,Math.max(0,((n.proteines_g||0)-20)*1.1))+(txt.includes("proteine")?4:0);return{score:s,reason:(n.proteines_g||0)>=30?"bien protéiné":""}}
  if(mood==="light"){const s=(n.kcal&&n.kcal<=500?18:n.kcal&&n.kcal<=600?8:0)+(txt.match(/salade|frais|legume/)?4:0);return{score:s,reason:n.kcal&&n.kcal<=500?"plutôt léger":""}}
  if(mood==="gourmand"){const s=(txt.match(/gourmand|creme|cremeux|fromage|gratin|comfort|caramel/)?18:4)+(n.kcal&&n.kcal>=600?4:0);return{score:s,reason:txt.match(/creme|fromage|gratin|gourmand/)?"bien gourmand":""}}
  if(mood==="comfort"){const s=txt.match(/familial|comfort|reconfort|gratin|creme|fromage|parmentier/)?22:3;return{score:s,reason:s>10?"réconfortant":""}}
  if(mood==="spicy"){const s=txt.match(/curry|epice|paprika|mexicain|chorizo|ras el hanout|jambalaya/)?22:0;return{score:s,reason:s?"saveurs relevées":""}}
  return{score:0,reason:""};
}
function personalizedInfo(r,opts={}){
  const maxTime=opts.maxTime??999,maxMissing=opts.maxMissing??99,m=matchInfo(r);
  if((r.categorie!=="Salé"&&r.categorie!=="Petit-déjeuner")||r.temps_minutes>maxTime||m.missing.length>maxMissing)return null;
  let score=20,reasons=[];
  if(m.total){score+=m.score*(opts.stockHeavy?.62:.46);if(!m.missing.length)reasons.push("tout le principal est disponible");else if(m.missing.length===1)reasons.push("un seul ingrédient principal manque")}
  const ta=tasteAffinity(r);score+=ta.score;reasons.push(...ta.reasons);
  const ms=moodScore(r,opts.mood||"any");score+=ms.score;if(ms.reason)reasons.push(ms.reason);
  if(r.temps_minutes<=15){score+=10;reasons.push("très rapide")}else if(r.temps_minutes<=30){score+=7;reasons.push(r.temps_minutes+" min")}else if(r.temps_minutes<=45)score+=3;
  if(isFav(r)){score+=10;reasons.push("favori")}
  const st=statusOf(r);if(st==="Validée")score+=6;if(st==="À refaire")score+=10;if(st==="Bof")score-=35;
  const idx=lastCookedIndex(r.id);if((opts.antiRepeat??true)&&idx>=0){score-=Math.max(4,22-idx*3);if(idx<3)reasons.push("mangé récemment")}
  const leftoverHits=recipeUsesLeftover(r);if(leftoverHits){score+=leftoverHits*14;reasons.unshift("utilise tes restes")}
  return{score,reasons:[...new Set(reasons)].slice(0,3)};
}
function personalizedRanking(opts={}){
  return state.recipes.map(r=>({r,info:personalizedInfo(r,opts)})).filter(x=>x.info)
    .sort((a,b)=>b.info.score-a.info.score).slice(0,opts.limit||8)
    .map(x=>({r:x.r,reasons:x.info.reasons,score:x.info.score}));
}
function culinaScore(r){
  return personalizedInfo(r,{maxTime:Number(state.matchPrefs.time),maxMissing:Number(state.matchPrefs.missing),mood:state.matchPrefs.mood,antiRepeat:state.matchPrefs.repeat==="on",stockHeavy:true});
}
function renderCulinaMatch(){
  const g=document.getElementById("matchResults");if(!g)return;syncMatchControls();g.innerHTML="";
  const ranked=state.recipes.map(r=>({r,info:culinaScore(r)})).filter(x=>x.info).sort((a,b)=>b.info.score-a.info.score).slice(0,8);
  ranked.forEach(x=>g.appendChild(recipeCard(x.r,true,x.info.reasons)));
  document.getElementById("matchCount").textContent=ranked.length?ranked.length+" propositions":"";
  document.getElementById("matchEmpty").style.display=ranked.length?"none":"block";renderHistory();
}
function renderHistory(){
  const el=document.getElementById("historyList");el.innerHTML="";
  if(!state.history.length){el.innerHTML='<span class="history-item">Aucun plat enregistré pour l’instant</span>';return}
  state.history.slice(0,12).forEach(h=>{const d=new Date(h.at),x=document.createElement("span");x.className="history-item";x.textContent=`${h.nom} · ${d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}`;el.appendChild(x)});
}
function syncMatchControls(){
  document.getElementById("matchMood").value=state.matchPrefs.mood||"any";
  document.getElementById("matchTime").value=String(state.matchPrefs.time??999);
  document.getElementById("matchMissing").value=String(state.matchPrefs.missing??99);
  document.getElementById("matchRepeat").value=state.matchPrefs.repeat||"on";
}
function readMatchControls(){
  state.matchPrefs={mood:document.getElementById("matchMood").value,time:Number(document.getElementById("matchTime").value),missing:Number(document.getElementById("matchMissing").value),repeat:document.getElementById("matchRepeat").value};
  localStorage.setItem("culina-match-prefs-v1",JSON.stringify(state.matchPrefs));
}

function mealMomentLabel(){
  const h=new Date().getHours();
  if(h<9)return "Ce matin";
  if(h<14)return "Ce midi";
  return "Ce soir";
}
function updateMealMoment(){
  const title=document.getElementById("mealMomentTitle");
  if(title)title.textContent="🍽 "+mealMomentLabel();
}
function renderForYou(){
  updateMealMoment();
  renderPlanned();
  document.getElementById("fyStockStat").textContent=Object.values(state.stock).filter(Boolean).length;
  document.getElementById("fyLeftoverStat").textContent=state.leftovers.length;
  document.getElementById("fyHistoryStat").textContent=state.history.length;
  const stockItems=Object.values(state.stock).filter(Boolean);
  const cp=stockItems.filter(x=>x.group==="proteine").length;
  const cf=stockItems.filter(x=>x.group==="feculent").length;
  const cv=stockItems.filter(x=>x.group==="legume").length;
  document.getElementById("fyProteinCount").textContent=cp+" en stock";
  document.getElementById("fyStarchCount").textContent=cf+" en stock";
  document.getElementById("fyVegCount").textContent=cv+" en stock";
  document.getElementById("homeStockMini").textContent=stockItems.length+" produit"+(stockItems.length>1?"s":"");
  document.getElementById("homeWeekMini").textContent=state.weekPlan.length?state.weekPlan.length+" repas":"Aucun menu";
  const shopOpen=state.shopping.filter(x=>!x.checked).length;
  document.getElementById("homeShopMini").textContent=shopOpen?shopOpen+" à acheter":"Rien à acheter";
  const pp=document.getElementById("portionPrompt"),portion=state.leftovers.find(x=>x.type==="portion");
  pp.innerHTML=portion?`<div class="notice good"><b>♻️ À finir d’abord :</b> il reste ${esc(fmtQty(portion.quantity))} ${esc(portion.unit)} de <b>${esc(portion.name)}</b>. <button class="btn small good" style="margin-left:7px" onclick="eatLeftoverPortion('${portion.id}')">Je la mange</button></div>`:"";
  const tonight=document.getElementById("forYouTonight");tonight.innerHTML="";
  personalizedRanking({maxTime:60,maxMissing:2,limit:4,stockHeavy:true}).forEach(x=>tonight.appendChild(recipeCard(x.r,true,x.reasons)));
  renderLeftovers();renderLeftoverSuggestions();renderTasteProfile();
  const recent=recentRecipeIds(8),rediscover=document.getElementById("rediscoverGrid");rediscover.innerHTML="";
  const oldies=state.recipes.filter(r=>(isFav(r)||["Validée","À refaire"].includes(statusOf(r)))&&!recent.has(r.id)&&r.categorie==="Salé")
    .map(r=>({r,info:personalizedInfo(r,{maxTime:999,maxMissing:99,antiRepeat:false})})).filter(x=>x.info).sort((a,b)=>b.info.score-a.info.score).slice(0,4);
  if(!oldies.length)personalizedRanking({maxTime:999,maxMissing:99,limit:4}).forEach(x=>rediscover.appendChild(recipeCard(x.r,false,["à découvrir"])));
  else oldies.forEach(x=>rediscover.appendChild(recipeCard(x.r,false,["ça fait un moment"])));
  const quick=document.getElementById("quickGrid");quick.innerHTML="";
  personalizedRanking({maxTime:25,maxMissing:2,limit:4,stockHeavy:true}).forEach(x=>quick.appendChild(recipeCard(x.r,true,x.reasons)));
}

function recipeSignature(r){
  return{protein:normalize(primaryIngredient(r,"proteine")?.ingredient||""),starch:normalize(primaryIngredient(r,"feculent")?.ingredient||"")};
}
function weekCandidateScore(r,usedIds,lastSig,dayIndex){
  const info=personalizedInfo(r,{maxTime:60,maxMissing:3,stockHeavy:true,antiRepeat:true});if(!info)return null;
  let score=info.score;if(usedIds.has(r.id))score-=100;
  const sig=recipeSignature(r);
  if(lastSig.protein&&sig.protein&&(lastSig.protein.includes(sig.protein)||sig.protein.includes(lastSig.protein)))score-=22;
  if(lastSig.starch&&sig.starch&&(lastSig.starch.includes(sig.starch)||sig.starch.includes(lastSig.starch)))score-=18;
  if(dayIndex>=5&&r.temps_minutes>=40)score+=4;
  if(dayIndex<5&&r.temps_minutes<=35)score+=5;
  return{score,info};
}
function generateWeek(){
  const plan=[],used=new Set();let lastSig={protein:"",starch:""};
  for(let i=0;i<7;i++){
    const ranked=state.recipes.filter(r=>r.categorie==="Salé").map(r=>({r,x:weekCandidateScore(r,used,lastSig,i)})).filter(z=>z.x)
      .sort((a,b)=>b.x.score-a.x.score);
    const pool=ranked.slice(0,Math.min(4,ranked.length));const chosen=pool[Math.floor(Math.random()*pool.length)]||ranked[0];
    if(!chosen)break;plan.push({day:i,recipeId:chosen.r.id});used.add(chosen.r.id);lastSig=recipeSignature(chosen.r);
  }
  state.weekPlan=plan;saveWeek();renderWeek();toast("Semaine générée");
}
function changeWeekDay(day){
  const current=state.weekPlan.find(x=>x.day===day);if(!current)return;
  const used=new Set(state.weekPlan.map(x=>x.recipeId));used.delete(current.recipeId);
  const prev=state.weekPlan.find(x=>x.day===day-1),prevR=prev&&state.recipes.find(r=>r.id===prev.recipeId),lastSig=prevR?recipeSignature(prevR):{protein:"",starch:""};
  const ranked=state.recipes.filter(r=>r.categorie==="Salé"&&r.id!==current.recipeId).map(r=>({r,x:weekCandidateScore(r,used,lastSig,day)})).filter(z=>z.x).sort((a,b)=>b.x.score-a.x.score);
  const pick=ranked[Math.floor(Math.random()*Math.min(5,ranked.length))]||ranked[0];if(!pick)return;
  current.recipeId=pick.r.id;saveWeek();renderWeek();
}
function weekMissingUnique(){
  const map=new Map();
  state.weekPlan.forEach(p=>{const r=state.recipes.find(x=>x.id===p.recipeId);if(!r)return;matchInfo(r).missing.forEach(i=>{const k=normalize(i.ingredient);if(!map.has(k))map.set(k,i)})});
  return[...map.values()];
}
function renderWeek(){
  const grid=document.getElementById("weekGrid");grid.innerHTML="";
  document.getElementById("weekEmpty").style.display=state.weekPlan.length?"none":"block";
  state.weekPlan.sort((a,b)=>a.day-b.day).forEach(p=>{
    const r=state.recipes.find(x=>x.id===p.recipeId);if(!r)return;const m=matchInfo(r),card=document.createElement("div");card.className="day-card";
    card.innerHTML=`<div class="day-name">${days[p.day]}</div><div class="day-recipe">${esc(r.nom)}</div><div class="day-meta">⏱ ${r.temps_minutes} min${m.missing.length?` · ${m.missing.length} ${m.missing.length>1?"principaux":"principal"} à prévoir`:" · tout le principal est disponible"}</div>
      <div class="day-actions"><button class="btn">Voir</button><button class="btn">Changer</button></div>`;
    const bs=card.querySelectorAll("button");bs[0].onclick=()=>openDetail(r.id);bs[1].onclick=()=>changeWeekDay(p.day);grid.appendChild(card);
  });
  const missing=weekMissingUnique(),starches=new Set(state.weekPlan.map(p=>{const r=state.recipes.find(x=>x.id===p.recipeId);return normalize(primaryIngredient(r||{},"feculent")?.ingredient||"")}).filter(Boolean));
  document.getElementById("weekPlannedStat").textContent=state.weekPlan.length;
  document.getElementById("weekMissingStat").textContent=missing.length;
  document.getElementById("weekVarietyStat").textContent=starches.size;
}
function addWeekShopping(){
  const missing=weekMissingUnique();missing.forEach(i=>addShopping(i.ingredient,i.groupe_stock||groupForName(i.ingredient),"Menu de la semaine",false));
  saveShopping();renderShopping();updateBadges();toast(missing.length?missing.length+" produit"+(missing.length>1?"s":"")+" ajouté"+(missing.length>1?"s":"")+" aux courses":"Tout le principal est déjà disponible");
}

function renderAll(){renderRecipes();renderStocks();renderShopping();renderCulinaMatch();renderForYou();renderWeek();updateBadges()}
function wireEvents(){
  document.getElementById("themeBtn").onclick=toggleTheme;
  document.getElementById("search").oninput=e=>{state.query=e.target.value;renderRecipes()};
  document.getElementById("favOnly").onclick=()=>{state.favOnly=!state.favOnly;document.getElementById("favOnly").textContent=state.favOnly?"♥ Favoris":"♡ Favoris";renderRecipes()};
  document.getElementById("stockMode").onclick=()=>{state.stockMode=!state.stockMode;renderRecipes()};
  document.getElementById("randomBtn").onclick=()=>{const a=filteredRecipes();if(a.length)openDetail(a[Math.floor(Math.random()*a.length)].id)};
  document.getElementById("manualShopBtn").onclick=()=>{const i=document.getElementById("manualShop");addShopping(i.value,groupForName(i.value),"Ajout manuel");i.value=""};
  document.getElementById("manualShop").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();document.getElementById("manualShopBtn").click()}};
  document.getElementById("restockBtn").onclick=restockChecked;
  document.getElementById("clearDoneBtn").onclick=()=>{state.shopping=state.shopping.filter(x=>!x.checked);saveShopping();renderShopping()};
  document.getElementById("leftoverAddBtn").onclick=addLeftoverIngredient;
  document.getElementById("leftoverName").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addLeftoverIngredient()}};
  document.getElementById("matchBtn").onclick=()=>{readMatchControls();renderCulinaMatch()};
  ["matchMood","matchTime","matchMissing","matchRepeat"].forEach(id=>document.getElementById(id).onchange=()=>{readMatchControls();renderCulinaMatch()});
  document.getElementById("generateWeekBtn").onclick=generateWeek;
  document.getElementById("weekShoppingBtn").onclick=addWeekShopping;
  document.getElementById("exportBtn").onclick=()=>{
    const payload={meta:{nom:"Culina",version:"5.4"},recettes:state.recipes,stocks:state.stock,liste_courses:state.shopping,historique:state.history,culina_match:state.matchPrefs,restes:state.leftovers,menu_semaine:state.weekPlan,recettes_programmees:state.planned};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="culina-sauvegarde-v5.4.json";a.click();URL.revokeObjectURL(a.href);
  };
}
boot();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}))}
setInterval(updateMealMoment,60000);
setInterval(checkRecipeReminders,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){updateMealMoment();checkRecipeReminders();armNearestReminder()}});

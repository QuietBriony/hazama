let depthData = {};
let currentDepth = "A";
let lang = "jp";
let status = { tai:0, wave:0, silence:0, nam:0 };

function log(msg){
  document.getElementById("log").innerText += msg + "\n";
}

async function loadData(){
  const res = await fetch("depths.json");
  const json = await res.json();
  depthData = {};
  json.depths.forEach(d => depthData[d.id] = d);
  startDepth("A");
}

function startDepth(id){
  currentDepth = id;
  const d = depthData[id];

  document.getElementById("depth-display").textContent = "Depth: " + id;
  document.getElementById("text").textContent = d.text[lang];

  const optC = document.getElementById("options");
  optC.innerHTML = "";

  d.options.forEach(opt=>{
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt.label[lang];
    btn.onclick = ()=> chooseOption(opt);
    optC.appendChild(btn);
  });
}

function chooseOption(opt){
  for(const k in opt.effect){
    status[k] += opt.effect[k];
  }
  log("[" + currentDepth + "] " + opt.label[lang]);

  const next = String.fromCharCode(currentDepth.charCodeAt(0)+1);
  if(depthData[next]){
    startDepth(next);
  } else {
    document.getElementById("text").textContent = "深度最下層へ到達。";
    document.getElementById("options").innerHTML = "";
  }
}

document.getElementById("lang-switch").onclick = ()=>{
  lang = (lang === "jp") ? "en" : "jp";
  startDepth(currentDepth);
};

loadData();

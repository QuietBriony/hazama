async function load() {
 const d = await fetch('depths.json').then(r=>r.json());
 document.getElementById('question-section').textContent = JSON.stringify(d,null,2);
}
load();
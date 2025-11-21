async function main() {
  const el = document.getElementById('question-section');
  const resultEl = document.getElementById('result-block');
  try {
    const res = await fetch('depths.json');
    const data = await res.json();
    el.textContent = 'depths.json が読み込めました（深度数: ' + data.depths.length + '）';
    resultEl.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    el.textContent = 'depths.json の読み込みに失敗しました: ' + e;
  }
}
main();

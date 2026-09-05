// Production display-only localization: complete first Body path, fair echo
// choices, exact Japanese fallback, and no progress/storage side effects.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const source = read("slice.js"), html = read("index.html");
const pack = JSON.parse(read("locales/en.json"));
const data = JSON.parse(read("depths-shell.json"));
const locale = source.match(/  const Locale = \(\(\) => \{[\s\S]*?\n  \}\)\(\);/)?.[0];
assert.ok(locale, "production Locale is extractable");
export const localeSource = locale + "\nconst tr = (source, values) => Locale.text(source, values);";
const originalData = JSON.stringify(data);
const button = { textContent: "沈む", getAttribute() { return null; } };
const note = { hidden: true };
const context = vm.createContext({
  document: { documentElement: { lang: "ja" }, querySelectorAll: () => [button] },
  $: () => note,
  localStorage: new Proxy({}, { get() { throw new Error("locale must not access storage"); } }),
});
vm.runInContext(localeSource + "\nglobalThis.locale = Locale;", context);
const L = context.locale;
assert.equal(L.select("en"), false, "no English without a valid catalog");
for (const invalid of [null, {}, { version: 1, coveredNodes: [], strings: [] }, { version: 1, coveredNodes: ["zero"], strings: {} }, { version: 1, coveredNodes: [], strings: { x: "" } }]) {
  assert.throws(() => L.install(invalid), /catalog/);
}
L.install(pack); assert.equal(L.select("en"), true);
assert.equal(button.textContent, "Descend");
assert.equal(context.document.documentElement.lang, "en");
assert.equal(L.select("fr"), false);
assert.equal(L.english, true);
assert.equal(L.text("not cataloged"), "not cataloged", "missing translations remain exact source text");
assert.equal(L.line({ t: "未翻訳", who: "n" })._lang, "ja", "fallback uses Japanese speech language");
assert.equal(L.covers("below"), false, "infinite depths are not advertised as translated");
assert.equal(L.covers("__edge"), true);
assert.equal(L.text("まだ届かない（認識 {value}/{need}）", { value: 3, need: 6 }), "Not yet within reach (attunement 3/6)");
for (const id of pack.coveredNodes) {
  const node = data.nodes[id]; assert.ok(node, "catalog node exists: " + id);
  const fields = [node.title, ...node.lines.map(l => l.t), ...node.choices.flatMap(c => [c.t, c.sub].filter(Boolean))];
  for (const field of fields) assert.ok(L.translated(field), "missing Body-path translation: " + id + ": " + field);
  for (const item of node.lines) {
    const output = L.line(item);
    assert.equal(output._lang, "en"); assert.equal(output.who, item.who);
    assert.equal(output.gap, item.gap);
    assert.ok(L.rate(output, 50) > 0);
    assert.ok([...output.t].length * L.rate(output, 50) <= [...item.t].length * 50 + 0.001, "English does not inflate reveal wait");
  }
}
for (const item of [...data.edge.sankLines, ...data.edge.heldLines]) assert.ok(L.translated(item.t));
const echoBank = source.match(/  const ECHO_BANK = (\{[\s\S]*?\n  \});/)?.[1];
const echo = vm.runInNewContext("(" + echoBank + ")");
for (const phrase of Object.values(echo)) assert.ok(L.translated(phrase), "all true AND decoy fragments must be translated");
for (const tag of html.matchAll(/<([\w-]+)\b[^>]*\bdata-i18n(?=[\s>])[^>]*>([^<]+)<\/\1>/g)) {
  assert.ok(L.translated(tag[2]), "missing static UI translation: " + tag[2]);
}
L.notice([{ _lang: "ja" }]); assert.match(note.textContent, /untranslated Japanese/);
L.notice([{ _lang: "en" }]); assert.doesNotMatch(note.textContent, /untranslated/);
L.select("ja"); assert.equal(button.textContent, "沈む");
L.notice([]); assert.equal(note.hidden, true);
const originalLine = data.nodes.zero.lines[0];
assert.equal(L.line(originalLine), originalLine, "Japanese rendering preserves the original line object");
assert.equal(L.rate(originalLine, 50), 50);
assert.equal(JSON.stringify(data), originalData, "localization never mutates source/game data");
assert.ok(!/\b(?:state|Spiral|localStorage|fetch)\b/.test(locale), "Locale is display-only, not a game-state or network owner");
const version = source.match(/depths-shell\.json\?v=([a-z0-9.]+)/)[1];
assert.ok(source.includes("locales/en.json?v=" + version), "catalog fetch version matches runtime");
assert.ok(read("sw.js").includes('`locales/en.json?v=${RELEASE}`'), "optional catalog is offline-cached with its version");
console.log("reading-locale smoke PASS (Body path, all echo candidates, fallback, display-only, pacing, version)");

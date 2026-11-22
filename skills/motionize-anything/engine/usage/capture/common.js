// 캡처 공통 도구(짧게 다시 만든 것). run.sh 가 스크립트 앞에 붙인다.
const STICKY_HEADER = 'header';   // 긴 그림 조각에서 둘째 조각부터 숨길 제품의 sticky 머리줄 선택자. 제품에 맞게 고친다
const HELPERS = `
const Q=(s)=>document.querySelector(s);
const QA=(s)=>[...document.querySelectorAll(s)];
const T=(s,t,exact)=>QA(s).find(e=>exact?e.textContent.trim()===t:e.textContent.includes(t))||null;
const up=(e,n)=>{while(n-->0&&e)e=e.parentElement;return e};
const R=(e,doc)=>{if(!e)return null;if(!(e instanceof Element))return e;const r=e.getBoundingClientRect();const ox=doc?scrollX:0,oy=doc?scrollY:0;return {x:+(r.x+ox).toFixed(2),y:+(r.y+oy).toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}};
const RCl=(e,clip)=>{const a=e.getBoundingClientRect(),c=clip.getBoundingClientRect();const x0=Math.max(a.left,c.left),y0=Math.max(a.top,c.top),x1=Math.min(a.right,c.right),y1=Math.min(a.bottom,c.bottom);const f=n=>+n.toFixed(2);const o={x:f(x0),y:f(y0),w:f(Math.max(0,x1-x0)),h:f(Math.max(0,y1-y0))};if(Math.abs(o.w-a.width)>.5||Math.abs(o.h-a.height)>.5)o.unclipped={x:f(a.x),y:f(a.y),w:f(a.width),h:f(a.height)};return o};
`;
// defs: { 이름: "표현식(요소 또는 요소 배열)" }  → RECT <name> {요소:{x,y,w,h}}
const measure = async (name, defs, doc = false) => {
  const body = Object.entries(defs).map(([k, v]) => `try{const v=(${v});out[${JSON.stringify(k)}]=Array.isArray(v)?v.map(e=>R(e,${doc})):R(v,${doc});}catch(e){out[${JSON.stringify(k)}]='ERR '+e.message}`).join('\n');
  const res = await page.evaluate(`(()=>{${HELPERS}const out={};${body}return JSON.stringify(out)})()`);
  console.log('RECT ' + name + ' ' + res);
};
const STYLE_PROPS = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','borderTopWidth','borderTopStyle','borderTopColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','boxShadow','outlineStyle','outlineWidth','outlineColor','outlineOffset','textDecorationLine','cursor'];
// defs: { 이름: "표현식(요소)" } (pseudo 는 "표현식|::placeholder")
const styleOf = async (name, defs) => {
  const body = Object.entries(defs).map(([k, v]) => {
    const [expr, pseudo] = v.split('|');
    return `try{const el=(${expr});const cs=getComputedStyle(el,${pseudo ? JSON.stringify(pseudo) : 'null'});const o={};P.forEach(p=>o[p]=cs[p]);${pseudo ? '' : 'o.rect=R(el);'}out[${JSON.stringify(k)}]=o}catch(e){out[${JSON.stringify(k)}]='ERR '+e.message}`;
  }).join('\n');
  const res = await page.evaluate(`(()=>{${HELPERS}const P=${JSON.stringify(STYLE_PROPS)};const out={};${body}return JSON.stringify(out)})()`);
  console.log('STYLE ' + name + ' ' + res);
};
// 포커스 해제 + 마우스를 빈 곳(머리줄 오른쪽 빈 자리)으로
const neutral = async () => {
  await page.evaluate('document.activeElement&&document.activeElement.blur&&document.activeElement.blur()');
  await page.mouse.move(1100, 27);
  await sleep(300);
};
const waitFor = async (expr, tries = 40) => {
  for (let i = 0; i < tries; i++) { if (await page.evaluate(expr)) return true; await sleep(250); }
  return false;
};

// 긴 그림: 문서를 800px 간격으로 스크롤하며 조각을 찍는다(첫 조각만 sticky 머리줄 보임). 이어 붙이기는 stitch.py.
const tallShots = async (name) => {
  await page.evaluate('window.scrollTo(0,0)'); await sleep(300); await neutral();
  const total = await page.evaluate('document.documentElement.scrollHeight');
  const cw = await page.evaluate('document.documentElement.clientWidth');
  const tiles = [];
  for (let y = 0, i = 0; ; i++) {
    await page.evaluate(`window.scrollTo(0, ${y})`); await sleep(500);
    const sy = await page.evaluate('Math.round(scrollY)');
    if (i === 1) await page.evaluate(`document.querySelector('${STICKY_HEADER}').style.visibility='hidden'`);
    await neutral();
    const tile = `${name}__t${String(i).padStart(2, '0')}`;
    await page.screenshot({ path: tile + '.png' });
    tiles.push({ name: tile, scrollY: sy });
    if (sy + 900 >= total) break;
    y += 800;
  }
  await page.evaluate(`document.querySelector('${STICKY_HEADER}').style.visibility=''`);
  await page.evaluate('window.scrollTo(0,0)');
  console.log('SIZE ' + name + ' ' + JSON.stringify({ w: cw, h: total, tiles }));
};

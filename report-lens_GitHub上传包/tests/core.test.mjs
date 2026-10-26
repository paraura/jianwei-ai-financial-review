import test from 'node:test';import assert from 'node:assert/strict';import {compare,validate} from '../src/core.js';import worker from '../worker/index.js';
const a='营业收入：100亿元\n归母净利润：10亿元\n经营活动现金流净额：12亿元\n应收账款：20亿元';
const b='营业收入：120亿元\n归母净利润：8亿元\n经营活动现金流净额：5亿元\n应收账款：32亿元';
test('主链路：四项变化和出处',()=>{const r=compare(a,b);assert.equal(r.status,'complete');assert.deepEqual(r.rows.map(x=>Math.round(x.rate*100)/100),[20,-20,-58.33,60]);assert.equal(r.rows[1].before.line,2);});
test('统一单位',()=>{assert.equal(compare(a,b.replace('120亿元','1200000万元')).rows[0].rate,20);});
test('缺失字段显式部分失败',()=>{const r=compare(a,b.replace('归母净利润：8亿元',''));assert.equal(r.status,'partial');assert.equal(r.rows.length,3);assert.ok(r.errors.some(x=>x.includes('归母净利润')));});
test('冲突或重复字段拒绝计算',()=>{assert.equal(compare(a,b+'\n营业收入：130亿元').rows.length,3);});
test('零与负基数不计算常规同比',()=>{for(const n of [0,-10])assert.equal(compare(a.replace('100亿元',n+'亿元'),b).rows[0].rate,null);});
test('缺单位不能默认为元',()=>{assert.equal(compare(a,b.replace('120亿元','120')).rows.length,3);});
test('期间与口径校验',()=>{assert.throws(()=>validate({company:'A',oldYear:'2024',newYear:'2023'}));assert.throws(()=>validate({company:'A',oldYear:'2023',newYear:'2024',oldText:a,newText:b,comparable:false}));});
test('无模型时接口显式503',async()=>{const r=await worker.fetch(new Request('https://example.org/api/analyze',{method:'POST'}),{});assert.equal(r.status,503);});
test('配置接口不泄露密钥',async()=>{const r=await worker.fetch(new Request('https://example.org/api/config'),{MODEL_API_KEY:'secret',MODEL_ENDPOINT:'https://example.org',MODEL_NAME:'model'});assert.deepEqual(await r.json(),{llm:true});});
const m={company:'A',oldYear:'2023',newYear:'2024',oldText:a,newText:b,oldSource:'A',newSource:'B',comparable:true};const env={MODEL_API_KEY:'dummy',MODEL_ENDPOINT:'https://example.org',MODEL_NAME:'dummy'};
async function simulate(response){const original=globalThis.fetch;globalThis.fetch=async()=>response;try{return await worker.fetch(new Request('https://example.org/api/analyze',{method:'POST',body:JSON.stringify(m)}),env);}finally{globalThis.fetch=original;}}
test('模型接口失败不返回正常结果（模拟）',async()=>{assert.equal((await simulate(new Response('error',{status:500}))).status,502);});
test('伪造引文被拦截（模拟）',async()=>{const r=await simulate(Response.json({choices:[{message:{content:JSON.stringify({insights:[{hypothesis:'待核查',oldQuote:'根本不存在的引文',newQuote:'另一个不存在的引文',question:'原因是什么'}]})}}]}));assert.equal(r.status,422);});
test('违规建议被拦截（模拟）',async()=>{const r=await simulate(Response.json({choices:[{message:{content:JSON.stringify({insights:[{hypothesis:'建议买入',oldQuote:'营业收入：100亿元',newQuote:'营业收入：120亿元',question:'为什么'}]})}}]}));assert.equal(r.status,422);});
test('模型有效结构和原文证据可通过（模拟）',async()=>{const r=await simulate(Response.json({choices:[{message:{content:JSON.stringify({insights:[{hypothesis:'收入增长，原因待核查',oldQuote:'营业收入：100亿元',newQuote:'营业收入：120亿元',question:'增长来源是否可持续？'}]})}}]}));assert.equal(r.status,200);});
test('输入中的脚本不执行，仅作为原文',()=>{assert.equal(compare(a,b+'\n<script>alert(1)</script>').rows.length,4);});

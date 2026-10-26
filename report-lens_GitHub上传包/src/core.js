export const METRICS=['营业收入','归母净利润','经营活动现金流净额','应收账款'];
export function extract(text){
 const lines=text.split(/\n/);const fields={};const errors=[];
 for(const name of METRICS){const matches=[];lines.forEach((line,i)=>{if(!line.includes(name))return;const m=line.match(new RegExp(name+'[：:\\s]+(-?[\\d,]+(?:\\.\\d+)?)\\s*(亿元|万元|元)'));if(m)matches.push({name,value:Number(m[1].replaceAll(',','')),unit:m[2],line:i+1,quote:line.trim()});});if(matches.length===1)fields[name]=matches[0];else errors.push(name+(matches.length?'：重复或冲突字段，需人工处理':'：缺少可识别字段或单位'));}
 return {fields,errors};
}
const scale={'元':1,'万元':1e4,'亿元':1e8};
export function compare(oldText,newText){const a=extract(oldText),b=extract(newText);const errors=[...a.errors.map(x=>'基期 '+x),...b.errors.map(x=>'本期 '+x)];const rows=METRICS.filter(k=>a.fields[k]&&b.fields[k]).map(name=>{const before=a.fields[name],after=b.fields[name],x=before.value*scale[before.unit],y=after.value*scale[after.unit];const rate=x>0?(y-x)/x*100:null;return {name,before,after,rate,delta:(y-x)/scale[after.unit],flag:rate===null?'基数非正，禁止常规同比':Math.abs(rate)>=20?'显著变化':'一般变化'};});return {rows,errors,status:errors.length?'partial':'complete'};}
export function validate(meta){if(!meta.company?.trim())throw Error('请填写公司名称');if(!/^\d{4}$/.test(meta.oldYear)||!/^\d{4}$/.test(meta.newYear)||Number(meta.oldYear)>=Number(meta.newYear))throw Error('请填写递增的四位年度');if(!meta.oldText?.trim()||!meta.newText?.trim())throw Error('两期原文不能为空');if(meta.oldText.length>30000||meta.newText.length>30000)throw Error('单期文本不能超过 30,000 字符');if(!meta.comparable)throw Error('请先确认同主体、同报表范围、同累计口径');}

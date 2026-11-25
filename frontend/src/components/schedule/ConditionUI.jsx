import { useEffect } from 'react';
import Card from '../common/Card';
import DateField from '../common/DateField';
import SelectField from '../common/SelectField';
import TextField from '../common/TextField';
import { ChevronRightIcon } from '../common/Icons';
import { CONDITION_LABELS, SHIFT_LABELS, conditionDetail, changesBetween } from '../../utils/workConditions.mjs';

export function Notice({ title, children, tone='soft' }) {
  return <section className={`rounded-xl p-3 text-xs leading-[18px] ${tone==='error'?'bg-danger-bg':tone==='success'?'bg-success-bg':'bg-primary-soft'}`}>
    <p className={`font-bold ${tone==='error'?'text-danger':'text-darkblue'}`}>{title}</p>
    {children && <div className="mt-1 text-muted">{children}</div>}
  </section>;
}
export function Workflow({ children, action, hint, stepKey }) {
  useEffect(() => { document.querySelector('.page-scroll')?.scrollTo({top:0}); }, [stepKey]);
  return <div className="flex min-w-0 flex-col gap-4 p-4 pb-6">
    {children}
    <div className="workflow-actions"><p className="text-xs leading-[18px] text-muted">{hint}</p>{action}</div>
  </div>;
}
export function Steps({ active }) {
  return <ol aria-label="자동 배치 진행" className="grid grid-cols-3 gap-1 text-xs">
    {['조건 검토','배치안','확정'].map((label,i)=><li key={label} aria-current={active===i?'step':undefined} className={`flex gap-2 rounded-lg p-2 ${active===i?'bg-primary-soft text-darkblue':'text-muted'}`}><b>{i+1}</b>{label}</li>)}
  </ol>;
}
export function ConditionRow({ item, onClick }) {
  const Tag=onClick?'button':'div';
  return <Tag {...(onClick?{type:'button',onClick}:{})} className="flex w-full min-w-0 flex-col gap-1 py-2 text-left">
    <span className="flex items-center gap-2"><span className="min-w-0 flex-1 text-sm font-medium">{item.employee_name || '이름 확인 필요'} · {CONDITION_LABELS[item.kind] || '조건 확인 필요'}</span>{onClick&&<ChevronRightIcon size={24} className="shrink-0 text-darkblue" />}</span>
    <span className="text-xs leading-[18px] text-muted">{conditionDetail(item)}</span>
    <span className="text-xs text-darkblue">{item.kind==='PREFERRED_SHIFT'?'선호 · 가능한 범위에서 반영':item.kind==='SHIFT'||item.kind==='LEAVE'?'달력 일정':'필수 조건'}{item.issues?.length?' · 확인 필요':''}</span>
    {item.issues?.map(e=><span className="text-xs text-danger" key={e}>{e}</span>)}
  </Tag>;
}
export function ChangeSummary({ before, after }) {
  const changes=changesBetween(before,after);
  return <Card title={`바뀐 내용 · ${changes.length}개 항목`}>
    {!changes.length&&<p className="text-xs text-muted">원문에서 추출한 내용을 유지해요.</p>}
    {changes.map(c=><div className="border-b border-line pb-3 last:border-0 last:pb-0" key={c.key}>
      <p className="mb-1 text-xs text-muted">{c.label}</p>
      <p className="text-xs leading-5 text-muted">수정 전 · {c.before}</p><p className="text-sm leading-5 font-medium text-darkblue">수정 후 · {c.after}</p>
    </div>)}
  </Card>;
}
export function ConditionEditor({ value, onChange, members, busy=false, constraintsOnly=false }) {
  const update=patch=>onChange({...value,...patch});
  const count=['MAX_SHIFT','MIN_SHIFT'].includes(value.kind);
  const scope=value.kind==='SHIFT'||value.start_time?'TIME':value.kind==='LEAVE'?'ALL':value.shift||'';
  const kinds=Object.entries(CONDITION_LABELS).filter(([key])=>!constraintsOnly||!['SHIFT','LEAVE'].includes(key));
  return <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
    <SelectField label="멤버" labelSize="sm" value={value.user_id??''} onChange={e=>{
      const member=members.find(m=>String(m.id)===e.target.value);update({user_id:member?.id??null,employee_name:member?.name||''});
    }} options={[{value:'',label:'멤버를 선택하세요'},...members.map(m=>({value:m.id,label:`${m.name} · ${m.role==='editor'?'관리자':'근무자'}`}))]} />
    <SelectField label="조건 종류" labelSize="sm" value={value.kind} onChange={e=>{
      const kind=e.target.value; update({kind,value:['MAX_SHIFT','MIN_SHIFT'].includes(kind)?1:null,shift:kind==='SHIFT'||kind==='LEAVE'?null:'ALL',start_time:kind==='SHIFT'?'14:00':null,end_time:kind==='SHIFT'?'22:00':null});
    }} options={kinds.map(([value,label])=>({value,label}))} />
    <div className="grid grid-cols-2 gap-2">
      <DateField label="시작일" compact min="2026-01-01" max="2030-12-31" value={value.start_date||''} onChange={next=>update({start_date:next})} />
      <DateField label="종료일" compact min="2026-01-01" max="2030-12-31" value={value.end_date||''} onChange={next=>update({end_date:next})} />
    </div>
    {!['SHIFT','LEAVE'].includes(value.kind)&&<SelectField label="적용 시간대" labelSize="sm" value={scope} options={[{value:'',label:'시간대를 선택하세요'},...Object.entries(SHIFT_LABELS).map(([value,label])=>({value,label})),{value:'TIME',label:'시간 직접 입력'}]} onChange={e=>update(e.target.value==='TIME'?{shift:null,start_time:'14:00',end_time:'22:00'}:{shift:e.target.value||null,start_time:null,end_time:null})} />}
    {scope==='TIME'&&<div className="grid grid-cols-2 gap-2"><TextField label="시작 시간" labelSize="sm" value={value.start_time||''} placeholder="14:00" onChange={e=>update({start_time:e.target.value})} required /><TextField label="종료 시간" labelSize="sm" value={value.end_time||''} placeholder="22:00 또는 24:00" onChange={e=>update({end_time:e.target.value})} required /></div>}
    {count&&<TextField label="근무 횟수" labelSize="sm" type="number" min="0" max="366" value={value.value??''} onChange={e=>update({value:e.target.value===''?null:Number(e.target.value)})} required />}
    {count&&<p className="text-xs leading-[18px] text-muted">같은 근무 유형은 하루 1회, 전체 근무는 근무한 날짜 수로 계산해요.</p>}
    <p className="text-xs leading-[18px] text-muted">{value.kind==='PREFERRED_SHIFT'?'선호 조건은 가능한 범위에서 반영해요.':'근무 제외·최소·최대 횟수는 필수 조건이에요.'}</p>
  </fieldset>;
}

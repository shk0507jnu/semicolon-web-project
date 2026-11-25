import { useEffect, useState } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { calendarRequest } from '../../api/calendar';
import { useChat } from '../../contexts/ChatContext';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import ApiState from '../../components/calendar/ApiState';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import TextAreaField from '../../components/common/TextAreaField';
import { Notice, Workflow, ConditionRow, ConditionEditor, ChangeSummary } from '../../components/schedule/ConditionUI';
import { editableItem, changesBetween } from '../../utils/workConditions.mjs';
import { PATHS } from '../../routes/paths';

export default function NoticeReviewPage() {
  const { previewId } = useParams();
  const { workspaceId } = useRouteWorkspace();
  const state = useCalendarApi(workspaceId, [`/notice-parser/previews/${previewId}`, '/members']);
  return <>{!state.data&&<div className="p-4"><PageHeading title="공지 분석 검토" /><ApiState {...state} /></div>}
    {state.data&&<Review key={`${workspaceId}:${previewId}`} initial={state.data[0]} members={state.data[1].items} workspaceId={workspaceId} reload={state.reload} />}</>;
}

function Review({initial,members,workspaceId,reload}) {
  const navigate=useNavigate();
  const { updateRoom }=useChat();
  const [draft,setDraft]=useState(initial);
  const [editing,setEditing]=useState(null);
  const [value,setValue]=useState(null);
  const [step,setStep]=useState(initial.saved?'saved':'list');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [source,setSource]=useState(initial.input_text);
  useEffect(()=>{setDraft(initial);setSource(initial.input_text);setEditing(null);setStep(initial.saved?'saved':'list');},[initial]);
  const automatic=()=>navigate(generatePath(PATHS.automaticSchedule,{workspaceId}));
  function edit(index){setEditing(index);setValue(editableItem(draft.items[index]));setStep('edit');setError('');}
  async function validate(){
    setBusy(true);setError('');
    try{
      const items=draft.items.map((item,i)=>editableItem(i===editing?value:item));
      const updated=await calendarRequest(`/notice-parser/previews/${draft.id}`,{workspaceId,method:'PUT',body:{revision:draft.revision,items}});
      setDraft(updated);setEditing(null);setStep(updated.can_confirm?'review':'list');
      updateRoom(workspaceId,r=>({messages:r.messages.map(m=>m.parser?.result?.id===draft.id?{...m,parser:{...m.parser,status:'review',result:updated,error:null}}:m)}));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function save(){
    setBusy(true);setError('');
    try{
      const saved=await calendarRequest(`/notice-parser/previews/${draft.id}/confirm`,{workspaceId,method:'POST',body:{revision:draft.revision}});
      setDraft(prev=>({...prev,...saved,saved:true}));setStep('saved');
      updateRoom(workspaceId,r=>({messages:r.messages.map(m=>m.parser?.result?.id===draft.id?{...m,parser:{...m.parser,status:'saved',result:draft,error:null}}:m)}));
      window.dispatchEvent(new CustomEvent('shiftlink:calendar-updated',{detail:{workspaceId}}));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function reanalyze(){
    setBusy(true);setError('');
    try{
      const next=await calendarRequest('/notice-parser/preview',{workspaceId,method:'POST',body:{text:source.trim(),reference_date:draft.reference_date}});
      updateRoom(workspaceId,r=>({messages:r.messages.map(m=>m.parser?.result?.id===draft.id?{...m,parser:{...m.parser,status:'review',result:next,error:null}}:m)}));
      navigate(generatePath(PATHS.noticeReview,{workspaceId,previewId:next.id}),{replace:true});
    }
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const changed=draft.items.map((item,i)=>({item,index:i,changes:changesBetween(draft.original_items?.[i],item)})).filter(x=>x.changes.length);
  const calendarCount=draft.calendar_count||0,conditionCount=draft.constraint_count||0;
  const needsSource=Boolean(draft.clarification_message)||!draft.items.length;
  const action=step==='saved'?<Button onClick={conditionCount?automatic:()=>navigate(generatePath(PATHS.calendar,{workspaceId}))}>{conditionCount?'저장한 조건으로 자동 배치':'달력에서 보기'}</Button>
    :step==='source'?<Button disabled={busy||!source.trim()} onClick={reanalyze}>{busy?'분석 중…':'보완한 공지 다시 분석'}</Button>
    :draft.expired?<Button disabled={busy} onClick={()=>setStep('source')}>원문 확인 후 다시 분석</Button>
    :step==='edit'?<Button disabled={busy} onClick={validate}>{busy?'검증 중…':'수정 내용 검증'}</Button>
    :step==='review'?<Button disabled={busy||!draft.can_confirm} onClick={save}>{busy?'저장 중…':`확인한 ${conditionCount?`조건 ${conditionCount}건`:''}${conditionCount&&calendarCount?' · ':''}${calendarCount?`일정 ${calendarCount}건`:''} 저장`}</Button>
    :<Button disabled={busy} onClick={()=>needsSource?setStep('source'):draft.can_confirm?setStep('review'):edit(Math.max(0,draft.items.findIndex(i=>i.issues?.length)))}>{needsSource?'공지 내용 보완하기':draft.can_confirm?'확인한 내용 검토':'확인할 항목 수정'}</Button>;
  return <Workflow stepKey={step} action={action} hint={step==='saved'?'저장한 데이터는 새로고침 후에도 유지돼요.':'확인 후 저장해야 근무 조건과 달력에 반영돼요.'}>
    <PageHeading eyebrow="공지에서 자동 근무 조건 추출" title={step==='source'?'공지 내용 보완':step==='edit'?'근무 조건 수정':step==='review'?'수정 결과 확인':step==='saved'?'반영 내용을 저장했어요':'공지 분석 검토'} description={step==='source'?'빠진 정보까지 포함해 전체 요청을 다시 분석해요.':step==='edit'?'원문과 실제 적용될 값을 함께 확인해요.':'조건을 확인한 뒤 자동 배치에 사용해요.'} />
    {error&&<Notice title="처리하지 못했어요" tone="error"><p role="alert">{error}</p><button className="mt-2 min-h-11 underline" onClick={reload}>최신 결과 불러오기</button></Notice>}
    {draft.expired&&<Notice title="분석 결과가 만료됐어요" tone="error">원문을 다시 분석하면 수정·저장을 계속할 수 있어요.</Notice>}
    {step==='source'?<>
      <Button variant="secondary" disabled={busy} onClick={()=>setStep('list')}>분석 결과로 돌아가기</Button>
      {draft.clarification_message&&<Notice title="추가 정보가 필요해요" tone="error">{draft.clarification_message}<p className="mt-2">요청 일부가 빠져 있을 수 있어요. 공지 전체를 보완한 뒤 다시 분석해 주세요.</p></Notice>}
      <Card><TextAreaField label="보완할 공지 내용" value={source} onChange={e=>setSource(e.target.value)} maxLength={2000} disabled={busy} /><p className="text-xs text-muted">{source.length}/2000자 · 기준일 {draft.reference_date} 유지</p></Card>
    </>:step==='saved'?<>
      <Notice title="DB에 저장했어요" tone="success">근무 조건 {draft.constraint_ids?.length||0}건 · 달력 일정 {draft.event_ids?.length||0}건</Notice>
      <Card title="저장한 내용"><div className="divide-y divide-line">{draft.items.map((item,i)=><ConditionRow key={i} item={item} />)}</div></Card>
      <Button variant="secondary" onClick={()=>navigate(generatePath(PATHS.workConditions,{workspaceId}))}>저장된 근무 조건 관리</Button>
    </>:step==='edit'?<>
      <Button variant="secondary" disabled={busy} onClick={()=>{setEditing(null);setStep('list');}}>분석 결과로 돌아가기</Button>
      <Notice title={`원문에서 찾은 이름: ${draft.original_items?.[editing]?.employee_name||'미지정'}`}>워크스페이스에 등록된 멤버를 선택해 주세요.</Notice>
      <Card><ConditionEditor value={value} onChange={setValue} members={members} busy={busy} /></Card>
      <ChangeSummary before={draft.original_items?.[editing]} after={value} />
      {draft.clarification_message&&<Notice title="원문 보완이 필요해요" tone="error">{draft.clarification_message}<Button variant="secondary" disabled={busy} onClick={()=>setStep('source')}>공지 내용 보완하기</Button></Notice>}
    </>:<>
      {draft.errors?.length>0?<Notice title={`${draft.errors.length}개 내용을 확인해 주세요`} tone="error"><ul className="list-disc pl-4">{draft.errors.map(e=><li key={e}>{e}</li>)}</ul></Notice>:<Notice title="멤버·기간·시간 확인 완료" tone="success">{conditionCount}개 근무 조건과 {calendarCount}개 달력 일정을 검토할 수 있어요.</Notice>}
      {step==='review'&&changed.map(({item,index})=><ChangeSummary key={index} before={draft.original_items[index]} after={item} />)}
      {step==='list'&&<Card title="공지 원문" tone="soft"><p className="whitespace-pre-wrap text-xs leading-[18px]">{draft.input_text}</p><p className="text-[10px] text-muted">기준일 {draft.reference_date} · 대한민국 시간</p><Button variant="secondary" disabled={busy} onClick={()=>setStep('source')}>원문 보완 · 다시 분석</Button></Card>}
      <Card title={`추출된 내용 · ${draft.items.length}건`}><div className="divide-y divide-line">{draft.items.map((item,i)=><ConditionRow key={i} item={item} onClick={draft.expired?undefined:()=>edit(i)} />)}</div></Card>
      {step==='review'&&<Button variant="secondary" onClick={()=>setStep('list')}>원문과 전체 결과 다시 보기</Button>}
    </>}
  </Workflow>;
}

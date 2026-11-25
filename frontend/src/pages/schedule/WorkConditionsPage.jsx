import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { calendarRequest } from '../../api/calendar';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { useChat } from '../../contexts/ChatContext';
import ApiState from '../../components/calendar/ApiState';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import { Workflow, Notice, ConditionRow, ConditionEditor, ChangeSummary } from '../../components/schedule/ConditionUI';
import { editableItem } from '../../utils/workConditions.mjs';
import { PATHS } from '../../routes/paths';

export default function WorkConditionsPage(){
  const {workspaceId}=useRouteWorkspace();
  return <Conditions key={workspaceId} workspaceId={workspaceId} />;
}
function Conditions({workspaceId}){
  const navigate=useNavigate();
  const {setOpen,setSelectedRoomId}=useChat();
  const state=useCalendarApi(workspaceId,['/work-constraints','/members','/me']);
  const [editing,setEditing]=useState(null),[value,setValue]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [conditions,members,me]=state.data||[];
  function edit(item){setEditing(item);setValue(editableItem(item));setError('');}
  async function save(deactivate=false){
    setBusy(true);setError('');
    try{
      await calendarRequest(`/work-constraints/${editing.id}${deactivate?'/deactivate':''}`,{workspaceId,method:deactivate?'POST':'PUT',body:{revision:editing.revision,...(!deactivate?{item:value}:{})}});
      setEditing(null);state.reload();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <Workflow stepKey={editing?.id||'list'} hint="공지에서 확인한 근무 조건을 DB에서 불러옵니다." action={editing?<Button disabled={busy} onClick={()=>save()}>{busy?'저장 중…':'수정한 조건 저장'}</Button>:<Button disabled={!me?.can_edit} onClick={()=>navigate(generatePath(PATHS.automaticSchedule,{workspaceId}))}>자동 근무 배치로</Button>}>
    <PageHeading eyebrow="관리자 / 근무 조건" title={editing?'저장한 조건 수정':'저장된 근무 조건'} description="공지에서 확인한 필수·선호 조건을 관리해요." />
    <ApiState {...state} />
    {error&&<Notice tone="error" title="저장하지 못했어요"><p role="alert">{error}</p></Notice>}
    {editing?<>
      <Button variant="secondary" disabled={busy} onClick={()=>setEditing(null)}>조건 목록으로 돌아가기</Button>
      <Card><ConditionEditor value={value} onChange={setValue} members={members?.items||[]} busy={busy} constraintsOnly /></Card>
      <ChangeSummary before={editing} after={value} />
      <Card title="출처 공지"><p className="whitespace-pre-wrap text-xs leading-5 text-muted">{editing.source_text}</p></Card>
      <Button variant="secondary" disabled={busy} onClick={()=>save(true)}>이 조건을 배치 대상에서 제외</Button>
    </>:conditions?.items.length?<Card title={`사용 중인 조건 · ${conditions.items.length}건`}><div className="divide-y divide-line">{conditions.items.map(item=><ConditionRow key={item.id} item={item} onClick={me?.can_edit?()=>edit(item):undefined} />)}</div></Card>:state.data&&<Notice title="저장된 조건이 없어요">팀 채팅에서 공지로 입력하고, 분석 결과를 확인한 뒤 저장해 주세요.</Notice>}
    {!editing&&me?.can_edit&&<Button variant="secondary" onClick={()=>{setSelectedRoomId(workspaceId);setOpen(true);}}>공지 채팅 열기</Button>}
  </Workflow>;
}

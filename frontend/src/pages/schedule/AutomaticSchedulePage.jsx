import { useEffect, useRef, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { useChat } from '../../contexts/ChatContext';
import { actualToday } from '../../utils/calendarModel.mjs';
import { nextWeek, addDays, examplePlan } from '../../utils/workConditions.mjs';
import ApiState from '../../components/calendar/ApiState';
import DayTimeline from '../../components/calendar/DayTimeline';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DateField from '../../components/common/DateField';
import PageHeading from '../../components/common/PageHeading';
import { CheckIcon } from '../../components/common/Icons';
import { Workflow, Notice, Steps, ConditionRow } from '../../components/schedule/ConditionUI';
import { PATHS } from '../../routes/paths';

const dayLabel=date=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(`${date}T00:00:00+09:00`));
export default function AutomaticSchedulePage(){
  const {workspaceId}=useRouteWorkspace();
  return <Automatic key={workspaceId} workspaceId={workspaceId} />;
}
function Automatic({workspaceId}){
  const navigate=useNavigate();
  const {setOpen,setSelectedRoomId}=useChat();
  const [start,setStart]=useState(()=>nextWeek(actualToday()).start);
  const end=addDays(start,6);
  const [step,setStep]=useState('setup'),[plan,setPlan]=useState(null),[selectedDate,setSelectedDate]=useState(start),[scenario,setScenario]=useState('normal');
  const timer=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const query=`start_date=${start}&end_date=${end}`;
  const state=useCalendarApi(workspaceId,['/me','/members',`/work-constraints?${query}`,'/staffing-rules',`/work-constraints/context?${query}`]);
  const [me,members,conditions,rules,context]=state.data||[];
  const goConditions=()=>navigate(generatePath(PATHS.workConditions,{workspaceId}));
  function generate(){
    if(!me?.can_edit)return;
    setStep('loading');
    timer.current=setTimeout(()=>{setPlan(examplePlan(start,members.items,context.events));setSelectedDate(start);setStep(scenario==='blocked'?'blocked':'result');},600);
  }
  function cancel(){clearTimeout(timer.current);setStep('setup');}
  const days=plan?.days||[],generated=plan?.generated||[];
  const titles={setup:'자동 근무 배치',loading:'배치 예시를 준비하고 있어요',result:'추천 배치안',week:'주간 근무표',blocked:'배치 조건 확인',confirm:'반영 내용 미리보기',saved:'반영 완료 화면 예시'};
  const hints={setup:'저장된 조건은 실제 DB 데이터, 배치 결과는 예시예요.',loading:'예시 생성 중에도 취소할 수 있어요.',result:'예시 배치안은 실제 조건 충족 여부를 계산하지 않아요.',week:'주간 전체 일정과 개인별 근무 시간을 확인하세요.',blocked:'이 화면은 인원 부족 상황을 보여주는 예시입니다.',confirm:'이 버튼은 예시 화면만 바꾸며 실제 달력은 변경하지 않아요.',saved:'DB에 저장한 근무 조건은 그대로 유지돼요.'};
  const actions={setup:<Button disabled={!me?.can_edit||state.loading||!members?.items.length} onClick={generate}>추천 배치안 예시 만들기</Button>,loading:<Button variant="secondary" onClick={cancel}>생성 취소</Button>,result:<Button onClick={()=>setStep('confirm')}>변경 내역 확인</Button>,week:<Button variant="secondary" onClick={()=>setStep('result')}>일별 근무표로 돌아가기</Button>,blocked:<Button onClick={()=>setStep('setup')}>조건 검토로 돌아가기</Button>,confirm:<Button onClick={()=>setStep('saved')}>반영 완료 화면 미리보기</Button>,saved:<Button onClick={()=>navigate(`${generatePath(PATHS.calendar,{workspaceId})}?date=${start}`)}>실제 달력으로 돌아가기</Button>};
  return <Workflow stepKey={step} action={actions[step]} hint={hints[step]}>
    <PageHeading eyebrow="관리자 / 달력 · 근무 관리" title={titles[step]} description={step==='setup'?'공지에서 확인한 조건으로 근무표를 준비해요.':`${start}–${end}`} />
    <Notice title="근무 조건 DB 연결 · 배치 기능은 예시">공지 조건의 검토·저장은 실제로 동작해요. 최적화와 달력 일괄 반영은 연결 전이므로 예시로 체험할 수 있어요.</Notice>
    <ApiState {...state} />
    {me&&!me.can_edit&&<Notice title="관리자만 자동 배치를 시작할 수 있어요" tone="error">저장한 근무 조건은 조건 목록에서 확인할 수 있어요.</Notice>}
    {state.data&&step==='setup'&&<>
      <Steps active={0} />
      <Card title="배치할 기간"><DateField label="주간 시작일" value={start} min="2026-01-01" max="2030-12-25" onChange={next=>{if(next>='2026-01-01'&&next<='2030-12-25')setStart(next);}} /><p className="text-xs text-muted">종료일 {end} · 7일간</p></Card>
      <Card title="공지에서 확인한 조건">
        <p className="text-xs text-muted">선택 기간에 적용되는 조건 <strong className="text-darkblue">{conditions.items.length}건</strong> · DB 저장됨</p>
        {conditions.items.slice(0,3).map(item=><ConditionRow key={item.id} item={item} />)}
        {!conditions.items.length&&<p className="text-xs text-muted">이 기간에 저장된 조건이 없어요. 공지를 분석하거나 다른 기간을 선택해 주세요.</p>}
        <Button variant="secondary" onClick={goConditions}>조건 상세 · 수정</Button>
        <div className="border-t border-line pt-3"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">최소 근무 인원</h2><button className="min-h-11 text-xs text-darkblue" onClick={()=>navigate(generatePath(PATHS.minStaff,{workspaceId}))}>변경</button></div>
          {rules.items.length?rules.items.map((r,i)=><p key={r.id||i} className="text-xs leading-5 text-muted">{r.days.join('·')} {r.start}–{r.end} · 최소 {r.min}명</p>):<p className="text-xs text-muted">등록된 최소 인원 규칙이 없어요.</p>}
        </div>
      </Card>
      <Card title="배치 방식"><p className="flex gap-2 text-sm font-medium"><CheckIcon size={24} className="text-darkblue" />기존 일정 {context.events.length}건 유지</p><p className="text-xs text-muted">기존 달력 일정을 변경하지 않아요.</p><div className="border-t border-line pt-3 text-xs leading-5"><b className="text-darkblue">연결 예정인 배치 우선순위</b><p>필수 조건과 최소 인원 충족 → 선호 시간과 근무 시간 균형</p></div></Card>
      <Card title="테스트할 배치 화면"><div className="flex gap-2">{[['normal','정상 배치 예시'],['blocked','인원 부족 예시']].map(([value,label])=><Button key={value} variant={scenario===value?'soft':'secondary'} aria-pressed={scenario===value} onClick={()=>setScenario(value)}>{label}</Button>)}</div></Card>
      <Button variant="secondary" onClick={()=>{setSelectedRoomId(workspaceId);setOpen(true);}}>공지 채팅 열기</Button>
    </>}
    {step==='loading'&&<Notice title="테스트용 주간 근무표 준비 중"><p role="status">실제 최적화 엔진은 호출하지 않습니다.</p></Notice>}
    {plan&&['result','week'].includes(step)&&<>
      <Steps active={1} />
      <Card title="배치 결과 예시"><div className="grid grid-cols-2 gap-4"><div><strong className="text-darkblue">{generated.length}건</strong><p className="text-xs text-muted">예시 근무 배치</p></div><div><strong className="text-darkblue">{conditions?.items.length||0}건</strong><p className="text-xs text-muted">DB에서 불러온 조건</p></div></div><p className="text-xs text-muted">필수·선호 조건의 충족 여부는 아직 검증하지 않았어요.</p></Card>
      {step==='result'?<>
        <Card><div className="grid grid-cols-7 gap-1">{days.map(date=><button key={date} type="button" aria-label={dayLabel(date)} aria-pressed={selectedDate===date} onClick={()=>setSelectedDate(date)} className={`flex min-h-12 flex-col items-center justify-center rounded-lg text-sm ${selectedDate===date?'bg-primary-soft font-medium text-darkblue':'text-muted'}`}><span className="text-[10px]">{new Intl.DateTimeFormat('ko-KR',{weekday:'short'}).format(new Date(`${date}T12:00:00`))}</span>{Number(date.slice(-2))}</button>)}</div>
          <h2 className="border-t border-line pt-3 text-sm font-medium">{dayLabel(selectedDate)}</h2>
          <div className="divide-y divide-line">{generated.filter(e=>e.date===selectedDate).map(e=><div className="flex flex-col gap-2 py-3" key={e.id}><div className="flex justify-between gap-2"><p className="text-sm font-medium">{e.user.name}</p><span className="text-xs text-darkblue">신규 배치 예시</span></div><DayTimeline shift={e} compact /><p className="text-xs text-darkblue">{e.start}–{e.end} · 8시간</p></div>)}</div>
        </Card>
        <Button variant="secondary" onClick={()=>setStep('week')}>전체 주간 근무 · 개인별 시간 보기</Button>
      </>:<>
        <Card title="주간 근무표"><div className="divide-y divide-line">{days.map(date=><div key={date} className="py-3 text-sm"><p className="text-xs font-bold text-darkblue">{dayLabel(date)}</p><p className="my-1">{generated.filter(e=>e.date===date).map(e=>e.user.name).join(' · ')}</p><p className="text-xs text-muted">14:00–22:00 · 배치 예시</p></div>)}</div></Card>
        <Card title="개인별 주간 근무 시간">{(members?.items||[]).map(m=><p key={m.id} className="flex justify-between text-sm"><span>{m.name}</span><span>{generated.filter(e=>e.user.id===m.id).length*8}시간</span></p>)}</Card>
      </>}
      <Button variant="secondary" onClick={()=>setStep('setup')}>배치 조건 다시 보기</Button>
    </>}
    {step==='blocked'&&<>
      <Notice tone="error" title={`${dayLabel(addDays(start,1))} · 인원 부족 예시`}>18:00–22:00에 필요한 2명 중 1명만 배치 가능한 상황입니다.</Notice>
      <Card title="조건 충돌 상황 예시"><p className="text-sm leading-6">근무 제외 조건과 최대 횟수 제한으로 배치할 수 없는 상황을 보여줍니다. 현재 DB 조건을 계산한 결과는 아니에요.</p><Button variant="secondary" onClick={goConditions}>실제 근무 조건 확인</Button><Button variant="secondary" onClick={()=>navigate(generatePath(PATHS.minStaff,{workspaceId}))}>최소 인원 규칙 확인</Button></Card>
    </>}
    {plan&&step==='confirm'&&<>
      <Steps active={2} /><Card title="변경 요약 예시"><p className="flex justify-between text-sm"><span>예시 배치</span><b className="text-darkblue">{generated.length}건</b></p><p className="flex justify-between text-sm"><span>기존 DB 일정</span><span>{context?.events.length||0}건 유지</span></p><p className="text-xs text-muted">실제 추가·변경·삭제 0건</p></Card>
      <Card title="예시 근무 목록"><div className="divide-y divide-line">{generated.map(e=><div className="py-3 text-sm" key={e.id}><p>{dayLabel(e.date)} · {e.user.name}</p><p className="text-xs leading-5 text-muted">{e.start}–{e.end} · 저장하지 않는 예시</p></div>)}</div></Card>
      <Button variant="secondary" onClick={()=>setStep('result')}>배치안으로 돌아가기</Button>
    </>}
    {step==='saved'&&<>
      <Notice title="반영 완료 화면을 확인했어요" tone="success">배치 예시 {generated.length}건 · 실제 달력에 추가된 일정 0건</Notice>
      <Card title="실제 저장된 내용"><p className="text-sm leading-6">파싱 후 확인한 근무 조건은 DB에 저장돼 있어요. 자동 배치안은 시연용이므로 달력을 변경하지 않았어요.</p><Button variant="secondary" onClick={goConditions}>DB에 저장된 조건 보기</Button></Card>
      <Button variant="secondary" onClick={()=>setStep('setup')}>다른 조건으로 다시 살펴보기</Button>
    </>}
  </Workflow>;
}

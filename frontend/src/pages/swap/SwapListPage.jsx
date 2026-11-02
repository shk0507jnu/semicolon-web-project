import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import SegmentedControl from '../../components/common/SegmentedControl';
import { useSwaps } from '../../contexts/SwapContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_USER } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { formatMonthDayWeekday } from '../../utils/date';

const FILTERS = [
  { value: 'all', label: '전체 요청' },
  { value: 'mine', label: '내 요청' },
];
const STATUS_LABEL = { open: '모집 중', applied: '지원 완료', approved: '승인 완료' };

// 11 대타 요청 목록 (피그마: 11 대타 요청 목록, 1:52)
export default function SwapListPage() {
  const navigate = useNavigate();
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const { requests, applyToRequest } = useSwaps();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const isMine = (r) => r.requesterName === MOCK_USER.name;
  const visible = filter === 'mine' ? requests.filter(isMine) : requests;
  const needed = visible.filter((r) => r.status !== 'approved');
  const processed = visible.filter((r) => r.status === 'approved');

  // 내가 올린 요청이나 이미 지원한 요청은 고를 수 없어
  const canApply = (r) => r.status === 'open' && !isMine(r);

  // 선택 없이 누르면 안내 문구를 보여줘 (피그마에서 버튼이 항상 선명한 모양이라 비활성 대신 안내로 처리)
  const [showHint, setShowHint] = useState(false);

  const handleApply = () => {
    if (!selectedId) {
      setShowHint(true);
      return;
    }
    // TODO: 백엔드 대타 지원 API 연결
    applyToRequest(selectedId);
    setSelectedId(null);
    setShowHint(false);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="대타 요청" description="동료의 빈 근무 시간을 함께 채워주세요." />

      <Card title="모집 중인 요청" tone="soft">
        <p className="text-[28px] leading-[42px] font-bold text-darkblue">{needed.length}건</p>
        <SegmentedControl
          label="대타 요청 필터"
          options={FILTERS}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setSelectedId(null);
          }}
        />
      </Card>

      <Card title="대타가 필요한 근무">
        {needed.length === 0 ? (
          <p className="text-sm leading-[21px] text-muted">
            {filter === 'mine' ? '모집 중인 내 요청이 없어요.' : '지금은 대타가 필요한 근무가 없어요.'}
          </p>
        ) : (
          needed.map((r) => (
            <ListRow
              key={r.id}
              title={`${formatMonthDayWeekday(r.date)} · ${STATUS_LABEL[r.status]}`}
              summary={`${r.requesterName} · ${r.start}–${r.end} · ${r.reason}`}
              onClick={
                canApply(r)
                  ? () => {
                      setSelectedId((cur) => (cur === r.id ? null : r.id));
                      setShowHint(false);
                    }
                  : undefined
              }
              selected={canApply(r) ? selectedId === r.id : undefined}
            />
          ))
        )}
        {filter === 'all' && showHint && <Callout tone="info">지원할 근무를 먼저 선택해주세요.</Callout>}
        {filter === 'all' && (
          <Button variant="primary" onClick={handleApply}>
            선택한 근무 지원하기
          </Button>
        )}
      </Card>

      {processed.length > 0 && (
        <Card title="처리된 요청">
          {processed.map((r) => (
            <ListRow
              key={r.id}
              title={`${formatMonthDayWeekday(r.date)} · ${STATUS_LABEL[r.status]}`}
              summary={`${r.requesterName} → ${r.substituteName} · ${r.start}–${r.end}`}
            />
          ))}
        </Card>
      )}

      <Button variant="soft" onClick={() => navigate(generatePath(PATHS.swapNew, { workspaceId }))}>
        + 대타 요청 작성
      </Button>
    </div>
  );
}

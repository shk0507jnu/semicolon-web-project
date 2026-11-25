"""Necessary feasibility checks for reviewed rules, not a staff optimizer.

ShiftOpt count rules use at most one occurrence of a shift scope per day (ALL:
working days). Named shifts have no configured clock mapping, so we never guess
that e.g. 15:00 means EVENING. Cross-scope staffing/assignment remains optimizer work.
"""
from datetime import date


def scope(item):
    if item.get('start_time'):
        return (item['start_time'], item['end_time'])
    return item.get('shift') or 'ALL'


def covers(block, target):
    """Whether an exclusion makes this entire shift option unavailable."""
    if block == 'ALL' or block == target:
        return True
    return (isinstance(block, tuple) and isinstance(target, tuple)
            and max(block[0], target[0]) < min(block[1], target[1]))


def overlap(a, b):
    return max(a['start_date'], b['start_date']) <= min(a['end_date'], b['end_date'])


def feasible(bounds):
    """Exact interval count feasibility via integer prefix-sum differences.

    S(end+1)-S(start) <= MAX; S(start)-S(end+1) <= -MIN.
    Adjacent prefixes allow 0..number_of_days occurrences. A negative cycle
    detects incompatible *combinations* of bounds, not just pairwise clashes.
    Integer edge weights ensure a feasible integer solution without rounding.
    """
    points = sorted({p for a, b, _, _ in bounds for p in (a, b)})
    index = {p: i for i, p in enumerate(points)}
    edges = []
    for i in range(len(points)-1):
        edges.extend(((i, i+1, points[i+1]-points[i]), (i+1, i, 0)))
    for a, b, kind, count in bounds:
        edges.append((index[b], index[a], -count) if kind == 'MIN_SHIFT'
                     else (index[a], index[b], count))
    distance = [0] * len(points)
    for _ in points:
        changed = False
        for a, b, weight in edges:
            if distance[b] > distance[a] + weight:
                distance[b] = distance[a] + weight
                changed = True
        if not changed:
            return True
    return not points


def conflict_errors(new_items, existing):
    errors = []
    for uid in {i['user_id'] for i in new_items}:
        fresh = [i for i in new_items if i['user_id'] == uid]
        # Only inspect date components connected to this operation. A legacy
        # conflict in an unrelated month must not block a new request.
        relevant = list(fresh)
        remaining = [i for i in existing if i['user_id'] == uid]
        while True:
            joined = [i for i in remaining if any(overlap(i, n) for n in relevant)]
            if not joined:
                break
            relevant.extend(joined)
            remaining = [i for i in remaining if i not in joined]
        name = fresh[0]['employee_name']
        exclusions = [i for i in relevant if i['kind'] in {'LEAVE', 'FORBIDDEN_SHIFT'}]
        for item in relevant:
            if item['kind'] not in {'PREFERRED_SHIFT', 'SHIFT'}:
                continue
            if any(overlap(item, block) and
                   (block['kind'] == 'LEAVE' or covers(scope(block), scope(item)))
                   for block in exclusions):
                label = '근무 선호' if item['kind'] == 'PREFERRED_SHIFT' else '확정 근무'
                errors.append(f'{name}: {item["start_date"]}~{item["end_date"]} {label}가 휴가·근무 제외와 겹쳐요. 기간이나 시간대를 수정해 주세요.')
        counts = [i for i in relevant if i['kind'] in {'MIN_SHIFT', 'MAX_SHIFT'}]
        for target in {scope(i) for i in counts if i['kind'] == 'MIN_SHIFT'}:
            bounds = []
            for item in counts + exclusions:
                kind, s = item['kind'], scope(item)
                if kind == 'LEAVE' or (kind == 'FORBIDDEN_SHIFT' and covers(s, target)):
                    kind, value = 'MAX_SHIFT', 0
                elif kind in {'MIN_SHIFT', 'MAX_SHIFT'} and (
                    s == target or (kind == 'MAX_SHIFT' and s == 'ALL')
                    or (kind == 'MIN_SHIFT' and target == 'ALL')
                ):
                    value = item['value']
                else:
                    continue
                bounds.append((date.fromisoformat(item['start_date']).toordinal(),
                               date.fromisoformat(item['end_date']).toordinal()+1, kind, value))
            if not feasible(bounds):
                label = {'ALL':'전체 근무', 'DAY':'주간', 'EVENING':'저녁', 'NIGHT':'야간'}.get(target)
                label = label or '~'.join(target)
                errors.append(f'{name}: {label}의 휴가·근무 제외·최소/최대 횟수를 동시에 만족할 수 없어요. 근무 가능 날짜와 횟수를 확인해 주세요.')
    return list(dict.fromkeys(errors))

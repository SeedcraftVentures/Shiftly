#!/usr/bin/env python3
"""
Validates the "same shifts each week" preference (prefers_consistent) in scheduler.py.

Scenario: 5 open days (Mon-Fri), one 8h shift per day needing 1 person, and THREE
staff who can all work any day. Over a 2-week build the solver's variety + fairness
terms rotate who works when. One staff member (Casey) sets prefers_consistent=True,
so their (day) pattern should be IDENTICAL across both weeks while the other two are
free to rotate.

Run:  python test_consistency.py
(requires: pip install -r requirements.txt  -- for ortools)
"""
from scheduler import ShiftlyScheduler

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

data = {
    'weeks': 2,
    'rules': {},
    'staff': [
        {'id': 'a', 'name': 'Alex', 'contracted_hours': 0, 'max_hours': 48, 'keyholder': True, 'team_id': 't'},
        {'id': 'b', 'name': 'Bailey', 'contracted_hours': 0, 'max_hours': 48, 'keyholder': True, 'team_id': 't'},
        {'id': 'c', 'name': 'Casey', 'contracted_hours': 0, 'max_hours': 48, 'keyholder': True, 'team_id': 't',
         'prefers_consistent': True},
    ],
    'shifts': [
        {'id': f's{i}', 'name': 'Cover', 'day': d, 'start_time': '09:00', 'end_time': '17:00',
         'staff_required': 1, 'keyholder_required': False, 'anchor_type': 'fixed'}
        for i, d in enumerate(DAYS)
    ],
}


def days_by_staff_by_week(result):
    # {staff_name: {week: set(days)}}
    out = {}
    for a in result.get('assignments', []):
        out.setdefault(a['staff_name'], {}).setdefault(a['week'], set()).add(a['day'])
    return out


if __name__ == '__main__':
    result = ShiftlyScheduler(data).solve(timeout_seconds=25)
    if not result.get('success'):
        print('FAIL: solver did not build ->', result.get('error'))
        raise SystemExit(1)

    grid = days_by_staff_by_week(result)
    for name in ('Alex', 'Bailey', 'Casey'):
        w1 = sorted(grid.get(name, {}).get(1, set()))
        w2 = sorted(grid.get(name, {}).get(2, set()))
        tag = ' (prefers_consistent)' if name == 'Casey' else ''
        print(f'  {name}{tag}: week1={w1} week2={w2}')

    casey1 = grid.get('Casey', {}).get(1, set())
    casey2 = grid.get('Casey', {}).get(2, set())
    consistent = casey1 == casey2 and len(casey1) > 0

    # Informational: did anyone free-to-vary actually rotate?
    varied = any(
        grid.get(n, {}).get(1, set()) != grid.get(n, {}).get(2, set())
        for n in ('Alex', 'Bailey')
    )
    print('Casey identical across weeks:', consistent)
    print('A varied colleague rotated:', varied, '(informational, solver may keep an optimum)')

    print('RESULT:', 'PASS - consistent pattern held' if consistent
          else 'FAIL - consistent staff pattern changed week to week')
    raise SystemExit(0 if consistent else 2)

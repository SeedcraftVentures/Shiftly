#!/usr/bin/env python3
"""
Validates the "honour contracted hours" change to scheduler.py.

Scenario: a managers team with ONE 8h shift per day (baseline 1 person) and TWO
managers each contracted 40h/week. Baseline supply is 7 x 8h = 56h, well under the
2 x 40 = 80h contracted. With `== required` the solver could only fill 7 person-shifts
(~28h each). With the bounded `>= required` change it may put a second manager on some
days, so each should land near 40h.

Run:  python test_contract.py
(requires: pip install -r requirements.txt  -- for ortools)
"""
from scheduler import ShiftlyScheduler

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

data = {
    'weeks': 1,
    'rules': {},  # defaults: max_weekly_hours 48, max_extra_per_shift 1
    'staff': [
        {'id': 'm1', 'name': 'Alex', 'contracted_hours': 40, 'max_hours': 48, 'keyholder': True, 'team_id': 'mgmt'},
        {'id': 'm2', 'name': 'Sam', 'contracted_hours': 40, 'max_hours': 48, 'keyholder': True, 'team_id': 'mgmt'},
    ],
    'shifts': [
        {'id': f's{i}', 'name': 'Manager', 'day': d, 'start_time': '09:00', 'end_time': '17:00',
         'staff_required': 1, 'keyholder_required': False, 'anchor_type': 'fixed'}
        for i, d in enumerate(DAYS)
    ],
}


def hours_per_staff(result):
    tot = {}
    for a in result.get('assignments', []):
        s, e = a['start_time'], a['end_time']
        def m(t):
            h, mm = map(int, t.split(':')); return h * 60 + mm
        dur = m(e) - m(s)
        if dur <= 0:
            dur += 1440
        tot[a['staff_name']] = tot.get(a['staff_name'], 0) + dur / 60
    return tot


if __name__ == '__main__':
    result = ShiftlyScheduler(data).solve(timeout_seconds=25)
    if not result.get('success'):
        print('FAIL: solver did not build ->', result.get('error'))
        raise SystemExit(1)

    hrs = hours_per_staff(result)
    print('Assignments:', len(result['assignments']))
    for name in ('Alex', 'Sam'):
        print(f'  {name}: {hrs.get(name, 0):.0f}h (contracted 40)')

    # Days with two managers on (the top-up the change enables)
    by_day = {}
    for a in result['assignments']:
        by_day.setdefault(a['day'], 0)
        by_day[a['day']] += 1
    doubled = [d for d, n in by_day.items() if n > 1]
    print('Days with 2 managers on:', doubled or 'none')

    ok = all(hrs.get(n, 0) >= 38 for n in ('Alex', 'Sam'))
    print('RESULT:', 'PASS - both near contract' if ok else 'CHECK - still under contract (tune max_extra / weights)')
    raise SystemExit(0 if ok else 2)

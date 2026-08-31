#!/usr/bin/env python3
"""
Validates that the solver puts a keyholder on the day's open and close (the
prefer_keyholder_cover soft objective), instead of leaving a gap and warning.

Scenario: one open day (Monday), one all-day shift 09:00-17:00 needing 1 person,
and two staff who can both work it: Kim (keyholder) and Noah (not). Since that one
shift is both the open and the close, the solver should prefer Kim so a keyholder
covers open + close, even though fair distribution alone would be indifferent.

Run:  python test_keyholder.py
(requires: pip install -r requirements.txt  -- for ortools)
"""
from scheduler import ShiftlyScheduler

data = {
    'weeks': 1,
    'rules': {},  # prefer_keyholder_cover defaults on; enforce_keyholder off (as the app sends)
    'staff': [
        {'id': 'k', 'name': 'Kim', 'contracted_hours': 0, 'max_hours': 48, 'keyholder': True, 'team_id': 't'},
        {'id': 'n', 'name': 'Noah', 'contracted_hours': 0, 'max_hours': 48, 'keyholder': False, 'team_id': 't'},
    ],
    'shifts': [
        {'id': 's1', 'name': 'Day', 'day': 'Monday', 'start_time': '09:00', 'end_time': '17:00',
         'staff_required': 1, 'keyholder_required': False, 'anchor_type': 'fixed'},
    ],
}


if __name__ == '__main__':
    result = ShiftlyScheduler(data).solve(timeout_seconds=25)
    if not result.get('success'):
        print('FAIL: solver did not build ->', result.get('error'))
        raise SystemExit(1)

    who = [a['staff_name'] for a in result['assignments'] if a['day'] == 'Monday']
    print('Monday assigned to:', who)
    ok = 'Kim' in who
    print('RESULT:', 'PASS - keyholder covers open+close' if ok
          else 'FAIL - a non-keyholder was chosen over an available keyholder')
    raise SystemExit(0 if ok else 2)

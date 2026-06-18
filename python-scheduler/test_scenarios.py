#!/usr/bin/env python3
# Scenario tests: mirror the generate-rota route end-to-end (build input → solve →
# relaxed-retry fallback → diagnose) across varied businesses, to verify rotas return.
from scheduler import ShiftlyScheduler

DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
ALL = set(range(7))


def dur(s, e):
    sh, sm = map(int, s.split(':')); eh, em = map(int, e.split(':'))
    d = (eh * 60 + em) - (sh * 60 + sm)
    if d <= 0:
        d += 1440
    return d / 60


def grid(avail):
    return {SHORT[d]: ('available' if d in avail else 'unavailable') for d in range(7)}


def build_staff(team):
    return [{'id': s['n'], 'name': s['n'], 'contracted_hours': s['c'], 'max_hours': s.get('m', 40),
             'keyholder': s.get('kh', False), 'availability_grid': grid(s.get('avail', ALL))} for s in team]


def build_shifts(patterns, open_days):
    out = []
    for p in patterns:
        for d in p['days']:
            if d not in open_days:
                continue
            out.append({'id': f"{p['name']}-{d}", 'name': p['name'], 'day': DAY_FULL[d],
                        'start_time': p['s'], 'end_time': p['e'], 'staff_required': p.get('need', 1),
                        'keyholder_required': p.get('kh', False)})
    return out


def solve(staff, shifts, rules):
    return ShiftlyScheduler({'staff': staff, 'shifts': shifts, 'rules': rules, 'weeks': 1}).solve()


def route_solve(staff, shifts):
    rr = {'fair_distribution': True, 'enforce_keyholder': False, 'max_consecutive_days': 7, 'min_rest_hours': 0}
    r = solve(staff, shifts, {})                       # stage 1: full constraints
    if r['success']:
        return r, 'direct'
    r2 = solve(staff, shifts, rr)                      # stage 2: relax rules, KEEP contracted (soft)
    if r2['success']:
        return r2, 'relaxed'
    zeroed = [{**s, 'contracted_hours': 0} for s in staff]
    r3 = solve(zeroed, shifts, rr)                     # stage 3: last resort (legacy hard-min solver)
    return (r3, 'relaxed-0' if r3['success'] else 'FAILED')


def hours_by(result, shifts):
    dm = {s['id']: dur(s['start_time'], s['end_time']) for s in shifts}
    h = {}
    for a in result.get('assignments', []):
        h[a['staff_name']] = h.get(a['staff_name'], 0) + dm[a['shift_id']]
    return h


def diagnose(staff, shifts):
    gaps = []; demand = 0
    for sh in shifts:
        need = sh['staff_required']; demand += dur(sh['start_time'], sh['end_time']) * need
        short = SHORT[DAY_FULL.index(sh['day'])]
        avail = sum(1 for s in staff if s['availability_grid'].get(short) == 'available')
        if avail < need:
            gaps.append(f"{sh['name']} {sh['day'][:3]} need{need}/have{avail}")
    cap = sum(min(s['max_hours'] or 48, 48) for s in staff)
    if gaps:
        return "AVAIL " + "; ".join(gaps[:3])
    if demand > cap + 0.5:
        return f"CAPACITY {round(demand)}h shifts vs ~{round(cap)}h staff (need more staff)"
    return "other (rest/consecutive combinatorial)"


def run(name, desc, open_days, teams):
    print(f"\n{'=' * 74}\n{name}\n  {desc}")
    for tname, (team, patterns) in teams.items():
        staff = build_staff(team); shifts = build_shifts(patterns, open_days)
        demand = sum(dur(s['start_time'], s['end_time']) * s['staff_required'] for s in shifts)
        r, path = route_solve(staff, shifts)
        if path == 'FAILED':
            print(f"  [{tname}] ❌ FAILED ({round(demand)}h demand) → {diagnose(staff, shifts)}")
            continue
        h = hours_by(r, shifts)
        flags = []
        for s in team:
            got = round(h.get(s['n'], 0), 1)
            if got < s['c'] - 1:
                flags.append(f"{s['n']} {got}/{s['c']}↓")
            elif got > s['c'] + 1:
                flags.append(f"{s['n']} {got}/{s['c']}↑(max)")
        tag = '✅ OK' if path == 'direct' else '⚠ OK via relaxed'
        detail = (" FLAGS: " + ", ".join(flags)) if flags else " all at contract"
        print(f"  [{tname}] {tag} ({round(demand)}h) |" + detail)


# ── Scenario 1: 6-person café, open 9-5, staff on site 8-6 (1h before/after), well-staffed
run("1. Café — open 9-5, operating 8-6, well-staffed",
    "FOH+Kitchen, shifts span 8-18, contracted ≈ demand", ALL, {
    'FOH': ([{'n': 'Amy', 'c': 28, 'kh': True}, {'n': 'Ben', 'c': 28, 'kh': True}, {'n': 'Cara', 'c': 28}],
            [{'name': 'Open', 's': '08:00', 'e': '14:00', 'days': list(range(7)), 'need': 1, 'kh': True},
             {'name': 'Close', 's': '12:00', 'e': '18:00', 'days': list(range(7)), 'need': 1, 'kh': True}]),
    'Kitchen': ([{'n': 'Dan', 'c': 28}, {'n': 'Eve', 'c': 28}, {'n': 'Fay', 'c': 28}],
            [{'name': 'Prep', 's': '08:00', 'e': '14:00', 'days': list(range(7)), 'need': 1},
             {'name': 'Service', 's': '12:00', 'e': '18:00', 'days': list(range(7)), 'need': 1}]),
})

# ── Scenario 2: tight — contracted exactly equals shift hours
run("2. Bar — tight (contracted == shift hours, 2 staff)",
    "56h of shifts, 32+24 contracted → want exactly 32/24", ALL, {
    'Bar': ([{'n': 'Ana', 'c': 32, 'm': 40, 'kh': True}, {'n': 'Ben', 'c': 24, 'm': 40, 'kh': True}],
            [{'name': 'Bar', 's': '09:00', 'e': '17:00', 'days': list(range(7)), 'need': 1}]),
})

# ── Scenario 3: under-staffed — demand exceeds legal capacity
run("3. Café — under-staffed (demand > capacity)",
    "7 days × 2 needed × 8h = 112h, only 2 staff (~96h cap) → should fail clearly", ALL, {
    'FOH': ([{'n': 'Ana', 'c': 40, 'm': 48}, {'n': 'Ben', 'c': 40, 'm': 48}],
            [{'name': 'Open', 's': '09:00', 'e': '17:00', 'days': list(range(7)), 'need': 2}]),
})

# ── Scenario 4: overnight bar — open midnight-3am, on site 9pm-5am
run("4. Bar — OVERNIGHT, open 0:00-3:00, operating 21:00-05:00",
    "overnight shifts 21:00-01:00 + 01:00-05:00, 3 staff", ALL, {
    'Bar': ([{'n': 'Nia', 'c': 18, 'kh': True}, {'n': 'Omar', 'c': 18, 'kh': True}, {'n': 'Pia', 'c': 20}],
            [{'name': 'Eve', 's': '21:00', 'e': '01:00', 'days': list(range(7)), 'need': 1, 'kh': True},
             {'name': 'Late', 's': '01:00', 'e': '05:00', 'days': list(range(7)), 'need': 1, 'kh': True}]),
})

# ── Scenario 5: keyholder-less team (shifts need keyholder, nobody is one)
run("5. Café — keyholder-required shifts but NO keyholder on team",
    "should build via relaxed retry (keyholder is location-wide) + flag", ALL, {
    'Kitchen': ([{'n': 'Dan', 'c': 30}, {'n': 'Eve', 'c': 26}],
            [{'name': 'Open', 's': '09:00', 'e': '17:00', 'days': list(range(7)), 'need': 1, 'kh': True}]),
})

# ── Scenario 6: limited availability — a day short of available people
run("6. Café — limited weekend availability",
    "Sat shift needs 2 but only 1 available → specific 'not enough available' reason", ALL, {
    'FOH': ([{'n': 'Ana', 'c': 30, 'avail': {0, 1, 2, 3, 4}}, {'n': 'Ben', 'c': 30, 'avail': {0, 1, 2, 3, 4, 5}}, {'n': 'Cara', 'c': 30, 'avail': {0, 1, 2, 3, 4}}],
            [{'name': 'Day', 's': '09:00', 'e': '17:00', 'days': list(range(7)), 'need': 2}]),
})

# ── Scenario 7: multi-team restaurant, weekdays only, varied
run("7. Restaurant — 4 teams, open Mon-Sat, varied shifts",
    "FOH/Kitchen/Bar/Management, mixed hours & headcount", {0, 1, 2, 3, 4, 5}, {
    'FOH': ([{'n': 'A', 'c': 30, 'kh': True}, {'n': 'B', 'c': 30, 'kh': True}, {'n': 'C', 'c': 24}],
            [{'name': 'Lunch', 's': '11:00', 'e': '16:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 1, 'kh': True},
             {'name': 'Dinner', 's': '16:00', 'e': '23:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 2, 'kh': True}]),
    'Kitchen': ([{'n': 'D', 'c': 35, 'm': 45}, {'n': 'E', 'c': 35, 'm': 45}, {'n': 'F', 'c': 30}],
            [{'name': 'Prep', 's': '10:00', 'e': '16:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 1},
             {'name': 'Service', 's': '16:00', 'e': '23:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 2}]),
    'Bar': ([{'n': 'G', 'c': 30, 'kh': True}, {'n': 'H', 'c': 24}],
            [{'name': 'Bar', 's': '17:00', 'e': '23:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 1, 'kh': True}]),
    'Management': ([{'n': 'I', 'c': 40, 'm': 48, 'kh': True}, {'n': 'J', 'c': 40, 'm': 48, 'kh': True}],
            [{'name': 'Duty', 's': '10:00', 'e': '18:00', 'days': [0, 1, 2, 3, 4, 5], 'need': 1, 'kh': True}]),
})

print(f"\n{'=' * 74}\nLegend: ✅ built first try · ⚠ built after relaxing soft rules · ❌ genuinely infeasible")

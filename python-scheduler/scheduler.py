#!/usr/bin/env python3

from ortools.sat.python import cp_model
import json
import sys


class ShiftlyScheduler:

    def __init__(self, data):
        self.staff = data['staff']
        self.shifts = data['shifts']
        self.rules = data.get('rules', {})
        self.weeks = data.get('weeks', 1)
        # Day indices (0=Mon..6=Sun) the manager flagged as busier this run: the solver is
        # allowed to add more bodies than baseline on these days (see the coverage bound).
        self.busy_days = set(data.get('busy_days', []) or [])
        self.contract_issues = []
        self.all_solutions = []

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse_time(self, time_val):
        """Accept HH:MM string or decimal float → minutes since midnight."""
        if isinstance(time_val, (int, float)):
            return int(time_val * 60)
        if isinstance(time_val, str) and ':' in time_val:
            h, m = map(int, time_val.split(':'))
            return h * 60 + m
        return int(float(time_val) * 60)

    def _get_shift_duration(self, shift):
        start = self._parse_time(shift['start_time'])
        end = self._parse_time(shift['end_time'])
        if end <= start:
            end += 1440
        return end - start

    def _get_shift_duration_hours(self, shift):
        return self._get_shift_duration(shift) / 60

    def _shifts_overlap(self, s1, s2):
        start1 = self._parse_time(s1['start_time'])
        end1 = self._parse_time(s1['end_time'])
        start2 = self._parse_time(s2['start_time'])
        end2 = self._parse_time(s2['end_time'])
        if end1 <= start1:
            end1 += 1440
        if end2 <= start2:
            end2 += 1440
        return not (end1 <= start2 or end2 <= start1)

    def _is_closing_shift(self, shift):
        end = self._parse_time(shift['end_time'])
        if end < 12 * 60:
            end += 1440
        return end >= 22 * 60

    def _is_opening_shift(self, shift):
        return self._parse_time(shift['start_time']) <= 8 * 60

    def _rule(self, key, default=None):
        """Get a rule value from the rules dict."""
        if isinstance(self.rules, dict):
            return self.rules.get(key, default)
        # Legacy list format
        if isinstance(self.rules, list):
            for r in self.rules:
                if r.get('type') == key or r.get('name') == key:
                    return r.get('value', r.get('enabled', default))
        return default

    def _rule_enabled(self, key):
        val = self._rule(key, False)
        if isinstance(val, bool):
            return val
        return bool(val)

    # ── Availability ──────────────────────────────────────────────────────────

    def _is_staff_available(self, staff, shift):
        """
        Check if a staff member is available for a shift.
        Handles:
        - New availability_grid format: { "Mon": "available"|"unavailable"|"preferred" }
        - Legacy dict format: { "monday": True/False }
        - Availability rules: tendency always/never
        """
        day_name = shift.get('day', '')

        # ── Check availability_grid (new format) ──────────────────────────────
        grid = staff.get('availability_grid')
        if grid and isinstance(grid, dict):
            # Map full day name to short name used in grid
            day_map = {
                'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
                'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat',
                'Sunday': 'Sun',
            }
            short = day_map.get(day_name, day_name[:3])
            val = grid.get(short)
            if val is None:
                # No data for this day — treat as available
                pass
            elif isinstance(val, bool):
                if not val:
                    return False
            elif isinstance(val, dict):
                # Old nested format: { "available": True, ... }
                if not val.get('available', True):
                    return False
            elif isinstance(val, str):
                if val == 'unavailable':
                    return False

        # ── Check legacy availability dict ────────────────────────────────────
        avail = staff.get('availability')
        if avail and isinstance(avail, dict) and not grid:
            day_key = day_name.lower()
            day_val = avail.get(day_key)
            if day_val is False:
                return False
            if isinstance(day_val, dict) and not day_val.get('available', True):
                return False

        # ── Check availability_rules (hard constraints only) ──────────────────
        rules = staff.get('availability_rules', [])
        if rules:
            shift_type = shift.get('anchor_type', 'fixed')
            is_weekday = day_name in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            is_weekend = day_name in ['Saturday', 'Sunday']

            for rule in rules:
                tendency = rule.get('tendency')
                if tendency not in ('always', 'never'):
                    continue  # soft preferences handled elsewhere

                # Check day match
                rule_days = rule.get('days', 'all')
                day_matches = (
                    rule_days == 'all' or
                    (rule_days == 'weekdays' and is_weekday) or
                    (rule_days == 'weekends' and is_weekend)
                )
                if not day_matches:
                    continue

                # Check shift type match
                rule_shift = rule.get('shift_type', 'any')
                shift_matches = (
                    rule_shift == 'any' or
                    rule_shift == shift_type
                )
                if not shift_matches:
                    continue

                # Hard constraint triggered
                if tendency == 'never':
                    return False
                # 'always' doesn't block, it's handled in soft preferences

        return True

    # ── Single week solver ────────────────────────────────────────────────────

    def solve_single_week(self, week_num, previous_solutions=None, weekend_counts=None):
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()

        n_shifts = len(self.shifts)
        n_staff = len(self.staff)

        # Decision variables: schedule[shift_idx][staff_idx] = bool
        schedule = {}
        for si in range(n_shifts):
            schedule[si] = {}
            for st in range(n_staff):
                schedule[si][st] = model.NewBoolVar(f'sh{si}_st{st}_w{week_num}')

        # ── Staff count per shift: baseline as a MINIMUM, plus a bounded extra ──
        # `== required` capped every shift at the baseline, so a team whose contracted
        # hours exceed its baseline shift-supply (e.g. two 40h managers but one 1-person
        # shift a day) could never reach contract. Allow up to `max_extra` more per shift
        # so the solver can top people up (a second manager on a day). Extra bodies are
        # penalised in the objective, so they only appear to reduce a real contracted
        # shortfall, not to pad shifts. `>= required` keeps the baseline guaranteed, so
        # this only relaxes the old constraint and can't make a feasible model infeasible.
        # Base headroom lets the solver add a body or two to reach contracted hours; busier
        # days get extra headroom so it can concentrate more cover where it's wanted.
        base_extra = int(self._rule('max_extra_per_shift', 2) or 0)
        busy_bonus = int(self._rule('busy_day_extra', 2) or 0)
        day_order_idx = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6}
        overstaff_terms = []       # extra bodies on normal days (discouraged more)
        overstaff_busy_terms = []  # extra bodies on busier days (discouraged less → preferred spot)
        for si, shift in enumerate(self.shifts):
            required = shift.get('staff_required', 1)
            di = day_order_idx.get(shift['day'], -1)
            is_busy = di in self.busy_days
            max_extra = base_extra + (busy_bonus if is_busy else 0)
            assigned = sum(schedule[si][st] for st in range(n_staff))
            model.Add(assigned >= required)
            model.Add(assigned <= required + max_extra)
            if max_extra > 0:
                extra = model.NewIntVar(0, max_extra, f'extra_sh{si}_w{week_num}')
                model.Add(extra == assigned - required)
                (overstaff_busy_terms if is_busy else overstaff_terms).append(extra)

        # ── Hard constraint: availability ────────────────────────────────────
        for si, shift in enumerate(self.shifts):
            for st, staff in enumerate(self.staff):
                if not self._is_staff_available(staff, shift):
                    model.Add(schedule[si][st] == 0)

        # ── Keyholder ─────────────────────────────────────────────────────────
        # Keyholder is a LOCATION concern (any team's keyholder can open/close), but the
        # solver runs per team. So only enforce it when THIS team actually has a keyholder
        # — otherwise the rota still builds and "no keyholder at open/close" is flagged
        # afterwards, rather than the whole team failing to schedule.
        enforce_keyholder = self._rule('enforce_keyholder', True)
        has_keyholder = any(s.get('keyholder', False) for s in self.staff)
        if enforce_keyholder and has_keyholder:
            for si, shift in enumerate(self.shifts):
                if shift.get('keyholder_required', False):
                    for st, staff in enumerate(self.staff):
                        if not staff.get('keyholder', False):
                            model.Add(schedule[si][st] == 0)

        # ── Hard constraint: one shift per day per staff ──────────────────────
        days = list(set(shift['day'] for shift in self.shifts))
        for day in days:
            day_shift_indices = [si for si, s in enumerate(self.shifts) if s['day'] == day]
            for st in range(n_staff):
                model.Add(
                    sum(schedule[si][st] for si in day_shift_indices) <= 1
                )

        # ── Hard constraint: no overlapping shifts same day ───────────────────
        for day in days:
            day_shifts = [(si, s) for si, s in enumerate(self.shifts) if s['day'] == day]
            for i in range(len(day_shifts)):
                for j in range(i + 1, len(day_shifts)):
                    si1, s1 = day_shifts[i]
                    si2, s2 = day_shifts[j]
                    if self._shifts_overlap(s1, s2):
                        for st in range(n_staff):
                            model.Add(schedule[si1][st] + schedule[si2][st] <= 1)

        # ── Soft (strong): minimum rest between shifts / no clopening ─────────
        # A penalty, not a hard block: a hard rule turns the WHOLE constraint off the moment
        # it can't be met (the relaxation ladder jumps min_rest to 0), so a single tight day
        # produced a flood of clopenings. Penalising each one instead makes the solver
        # minimise them — it only clopens when coverage genuinely forces it.
        min_rest_hours = self._rule('min_rest_hours', 11)
        min_rest_minutes = min_rest_hours * 60
        rest_terms = []

        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for d_idx in range(len(day_order) - 1):
            current_day = day_order[d_idx]
            next_day = day_order[d_idx + 1]
            closing_shifts = [(si, s) for si, s in enumerate(self.shifts)
                              if s['day'] == current_day and self._is_closing_shift(s)]
            opening_shifts = [(si, s) for si, s in enumerate(self.shifts)
                              if s['day'] == next_day and self._is_opening_shift(s)]
            for si_c, sc in closing_shifts:
                end_c = self._parse_time(sc['end_time'])
                if end_c < 12 * 60:
                    end_c += 1440
                for si_o, so in opening_shifts:
                    start_o = self._parse_time(so['start_time']) + 1440
                    gap = start_o - end_c
                    if gap < min_rest_minutes:
                        for st in range(n_staff):
                            clopen = model.NewBoolVar(f'clopen_{si_c}_{si_o}_{st}_w{week_num}')
                            model.Add(clopen >= schedule[si_c][st] + schedule[si_o][st] - 1)
                            rest_terms.append(clopen)

        # ── Soft (strong): max consecutive working days, ACROSS the week seam ──
        # Penalty, not a hard cap: a hard rule flips to "7 days allowed" the instant a tight
        # team can't satisfy it (the relaxation ladder), producing a flood of long runs.
        # Penalising the OVERAGE per window makes the solver minimise days-in-a-row — it only
        # runs someone past the limit when coverage/contract genuinely forces it. Weeks are
        # solved one at a time, so seed each window with the previous week's trailing days
        # (as 0/1 constants) so a run crossing Sunday→Monday still counts.
        max_consec = self._rule('max_consecutive_days', 5)
        consec_terms = []
        if max_consec and max_consec < 7:
            prev = previous_solutions[-1] if previous_solutions else None
            shifts_by_day = {day: [si for si, s in enumerate(self.shifts) if s['day'] == day] for day in day_order}
            for st in range(n_staff):
                # Walk the FULL calendar (prev week then this week) so closed days count as an
                # off day that breaks a run. Each position is a var (day has shifts) or a known
                # 0/1 constant (closed day, or a previous-week day already solved).
                seq = []
                if prev is not None:
                    for day in day_order:
                        worked = 1 if any(prev.get(si, {}).get(st, 0) == 1 for si in shifts_by_day[day]) else 0
                        seq.append(('const', worked))
                for day in day_order:
                    if shifts_by_day[day]:
                        w = model.NewBoolVar(f'worked_{day}_{st}_w{week_num}')
                        model.AddMaxEquality(w, [schedule[si][st] for si in shifts_by_day[day]])
                        seq.append(('var', w))
                    else:
                        seq.append(('const', 0))  # closed day = off, breaks the run
                for i in range(len(seq) - max_consec):
                    window = seq[i:i + max_consec + 1]
                    consts = sum(v for t, v in window if t == 'const')
                    vars_ = [v for t, v in window if t == 'var']
                    if vars_:
                        over = model.NewIntVar(0, max_consec + 1, f'consec_over_{st}_{i}_w{week_num}')
                        model.Add(over >= sum(vars_) + consts - max_consec)
                        consec_terms.append(over)

        # ── Max hours = HARD cap · contracted hours = SOFT target ─────────────
        # Contracted is a target, not a wall: penalise any shortfall so the rota
        # still builds when it can't be met exactly (flagged via contract_issues).
        # A hard minimum here makes the model infeasible whenever contracted hours
        # roughly equal total shift hours — even though aggregate capacity is fine.
        contracted_shortfalls = []
        contracted_overages = []
        for st, staff in enumerate(self.staff):
            contracted = staff.get('contracted_hours', 0)
            max_h = staff.get('max_hours', contracted) or contracted
            if max_h < contracted:
                max_h = contracted

            # Apply solver-level max hours cap
            solver_max = self._rule('max_weekly_hours', 48)
            if solver_max:
                max_h = min(max_h, solver_max)

            total_minutes = sum(
                schedule[si][st] * self._get_shift_duration(self.shifts[si])
                for si in range(n_shifts)
            )

            model.Add(total_minutes <= int(max_h * 60))

            if contracted > 0:
                target = int(contracted * 60)
                # Shortfall (under contracted) and overage (into max) are both penalised
                # so the solver parks people AT their contracted hours, only spilling into
                # max when the shifts genuinely can't be covered within everyone's contract.
                shortfall = model.NewIntVar(0, target, f'short_{st}_w{week_num}')
                model.Add(shortfall >= target - total_minutes)
                contracted_shortfalls.append(shortfall)
                overage = model.NewIntVar(0, int(max_h * 60), f'over_{st}_w{week_num}')
                model.Add(overage >= total_minutes - target)
                contracted_overages.append(overage)

        # Staff who asked for the SAME shifts each week — their pattern is pinned below
        # and they are excluded from the variety push (we don't reward moving someone we
        # just pinned).
        consistent_set = {st for st, s in enumerate(self.staff) if s.get('prefers_consistent', False)}

        # ── Soft: variety between weeks ───────────────────────────────────────
        # A penalty (NOT a hard constraint — the old hard "≥30% different" made multi-week
        # infeasible). Each match = an assignment identical to a previous week → penalised,
        # so weeks differ where they can. Consistent-preference staff are skipped.
        week_variety_terms = []
        for pidx, prev in enumerate(previous_solutions or []):
            for si in range(n_shifts):
                for st in range(n_staff):
                    if st in consistent_set:
                        continue
                    if prev.get(si, {}).get(st, 0) == 1:
                        match = model.NewBoolVar(f'match_{si}_{st}_w{week_num}_p{pidx}')
                        model.Add(schedule[si][st] == 1).OnlyEnforceIf(match)
                        model.Add(schedule[si][st] == 0).OnlyEnforceIf(match.Not())
                        week_variety_terms.append(match)

        # ── Soft: shift consistency — staff who want the same shifts each week ──
        # For these people, penalise ANY change vs the previous week (a dropped OR an added
        # assignment), so their pattern carries forward. Chaining each week off the last one
        # makes every week converge to the same pattern. Soft + strong weight: coverage,
        # rest and max-hours (all hard) still win, and the weight sits in the contracted-hours
        # band so it never leaves them short of contract. Where they're unavailable (time off
        # narrows their grid), those shifts are already forced to 0, so no penalty fires.
        consistency_terms = []
        if previous_solutions and consistent_set:
            prev = previous_solutions[-1]  # the immediately previous week
            for st in consistent_set:
                for si in range(n_shifts):
                    changed = model.NewBoolVar(f'chg_{si}_{st}_w{week_num}')
                    if prev.get(si, {}).get(st, 0) == 1:
                        model.Add(schedule[si][st] == 0).OnlyEnforceIf(changed)
                        model.Add(schedule[si][st] == 1).OnlyEnforceIf(changed.Not())
                    else:
                        model.Add(schedule[si][st] == 1).OnlyEnforceIf(changed)
                        model.Add(schedule[si][st] == 0).OnlyEnforceIf(changed.Not())
                    consistency_terms.append(changed)

        # ── Soft: weekend fairness ACROSS weeks — rotate who works Sat/Sun. Penalise
        #    giving a weekend shift to someone who has already worked weekends. ───────────
        weekend_terms = []
        if weekend_counts:
            weekend_si = [si for si, s in enumerate(self.shifts) if s['day'] in ('Saturday', 'Sunday')]
            for si in weekend_si:
                for st in range(n_staff):
                    if weekend_counts[st] > 0:
                        weekend_terms.append(schedule[si][st] * weekend_counts[st])

        # ── Soft: fair distribution ───────────────────────────────────────────
        minimize_terms = []
        if self._rule('fair_distribution', True):
            shift_counts = []
            for st in range(n_staff):
                count = model.NewIntVar(0, n_shifts, f'count_{st}_w{week_num}')
                model.Add(count == sum(schedule[si][st] for si in range(n_shifts)))
                shift_counts.append(count)

            if shift_counts:
                max_count = model.NewIntVar(0, n_shifts, f'max_count_w{week_num}')
                min_count = model.NewIntVar(0, n_shifts, f'min_count_w{week_num}')
                model.AddMaxEquality(max_count, shift_counts)
                model.AddMinEquality(min_count, shift_counts)
                spread = model.NewIntVar(0, n_shifts, f'spread_w{week_num}')
                model.Add(spread == max_count - min_count)
                minimize_terms.append(spread)

        # (Keyholder-shift balancing removed: fair distribution across all eligible staff
        # already spreads the load, and keyholder presence at open/close is handled above.)

        # ── Soft: consecutive days off ────────────────────────────────────────
        if self._rule('prefer_consecutive_days_off', True):
            for st in range(n_staff):
                for d_idx in range(len(day_order) - 1):
                    day1 = day_order[d_idx]
                    day2 = day_order[d_idx + 1]
                    d1_shifts = [si for si, s in enumerate(self.shifts) if s['day'] == day1]
                    d2_shifts = [si for si, s in enumerate(self.shifts) if s['day'] == day2]
                    if d1_shifts and d2_shifts:
                        off1 = model.NewBoolVar(f'off_{day1}_{st}_w{week_num}')
                        off2 = model.NewBoolVar(f'off_{day2}_{st}_w{week_num}')
                        worked1 = model.NewBoolVar(f'wk_{day1}_{st}_w{week_num}')
                        worked2 = model.NewBoolVar(f'wk_{day2}_{st}_w{week_num}')
                        model.AddMaxEquality(worked1, [schedule[si][st] for si in d1_shifts])
                        model.AddMaxEquality(worked2, [schedule[si][st] for si in d2_shifts])
                        model.Add(off1 == 1 - worked1)
                        model.Add(off2 == 1 - worked2)
                        isolated_off = model.NewBoolVar(f'iso_{day1}_{st}_w{week_num}')
                        model.AddBoolAnd([off1, worked2]).OnlyEnforceIf(isolated_off)
                        model.AddBoolOr([off1.Not(), worked2.Not()]).OnlyEnforceIf(isolated_off.Not())
                        minimize_terms.append(isolated_off)

        # ── Soft (strong): a keyholder on the actual open and close each day ──
        # The compliance panel flags "no keyholder at open/close" using each day's
        # EARLIEST start and LATEST end. Mirror that here so the solver actively puts
        # a keyholder on those shifts rather than leaving a gap and warning afterwards.
        # Kept SOFT (not hard) so a team with no available keyholder still builds — the
        # location-wide check then decides the real warning. Uses THIS team's keyholders.
        keyholder_cover_terms = []
        keyholder_sts = [st for st, s in enumerate(self.staff) if s.get('keyholder', False)]
        if keyholder_sts:  # always on — a keyholder on open/close is a requirement, not a toggle
            for day in days:
                day_idx = [si for si, s in enumerate(self.shifts) if s['day'] == day]
                if not day_idx:
                    continue
                starts = {si: self._parse_time(self.shifts[si]['start_time']) for si in day_idx}
                ends = {}
                for si in day_idx:
                    e = self._parse_time(self.shifts[si]['end_time'])
                    if e <= starts[si]:
                        e += 1440
                    ends[si] = e
                open_t, close_t = min(starts.values()), max(ends.values())
                open_shifts = [si for si in day_idx if starts[si] == open_t]
                close_shifts = [si for si in day_idx if ends[si] == close_t]
                for label, group in (('open', open_shifts), ('close', close_shifts)):
                    assigned_kh = [schedule[si][st] for si in group for st in keyholder_sts]
                    if not assigned_kh:
                        continue
                    has_kh = model.NewBoolVar(f'kh_{label}_{day}_w{week_num}')
                    model.AddMaxEquality(has_kh, assigned_kh)
                    miss = model.NewBoolVar(f'khmiss_{label}_{day}_w{week_num}')
                    model.Add(miss + has_kh == 1)
                    keyholder_cover_terms.append(miss)

        # ── Optimise ──────────────────────────────────────────────────────────
        # Keep people AT their contracted hours: a HEAVY penalty for falling short and
        # a lighter one for spilling into max hours (both in minutes, so they dominate
        # the small fairness/preference terms, which act only as tie-breakers).
        # Priority tiers, biggest weight wins: keyholder-on-open/close > static shifts >
        # contracted hours > everything soft. Coverage/max-hours are hard, above all of this.
        objective = []
        objective += [k * 50000 for k in keyholder_cover_terms]  # a keyholder MUST be on each day's open + close
        objective += [c * 10000 for c in consistency_terms]      # "same shifts each week" held near-100%
        objective += [s * 30 for s in contracted_shortfalls]     # meet contracted hours (per minute short)
        objective += [o * 3 for o in contracted_overages]
        objective += [e * 60 for e in overstaff_terms]           # extra body only to clear real shortfall
        objective += [e * 30 for e in overstaff_busy_terms]      # cheaper on busier days → top-up lands there
        objective += [r * 3000 for r in rest_terms]              # avoid clopening unless coverage forces it
        objective += [c * 3000 for c in consec_terms]            # minimise days-in-a-row over the limit
        objective += [w * 6 for w in weekend_terms]              # rotate weekends across weeks
        objective += [v * 8 for v in week_variety_terms]         # rotate non-consistent staff week to week
        objective += minimize_terms
        if objective:
            model.Minimize(sum(objective))

        solver.parameters.max_time_in_seconds = 25.0
        solver.parameters.num_search_workers = 4

        status = solver.Solve(model)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            solution = {}
            for si in range(n_shifts):
                solution[si] = {}
                for st in range(n_staff):
                    solution[si][st] = solver.Value(schedule[si][st])
            return solution
        else:
            return None

    # ── Multi-week solve ──────────────────────────────────────────────────────

    def solve(self, timeout_seconds=60):
        import time
        start = time.time()

        all_weeks = []
        # Cumulative count of weekends each staff member has worked so far, fed into each
        # subsequent week so the solver rotates weekend duty instead of repeating it.
        weekend_counts = [0] * len(self.staff)
        weekend_si = [si for si, s in enumerate(self.shifts) if s['day'] in ('Saturday', 'Sunday')]
        for week_num in range(self.weeks):
            solution = self.solve_single_week(
                week_num, previous_solutions=all_weeks, weekend_counts=weekend_counts
            )
            if solution is None:
                return {
                    'success': False,
                    'error': self._diagnose_failure(),
                }
            all_weeks.append(solution)
            for st in range(len(self.staff)):
                if any(solution[si][st] == 1 for si in weekend_si):
                    weekend_counts[st] += 1

        # Build result
        assignments = []
        for week_num, solution in enumerate(all_weeks):
            for si, shift in enumerate(self.shifts):
                for st, staff in enumerate(self.staff):
                    if solution[si][st] == 1:
                        assignments.append({
                            'week': week_num + 1,
                            'shift_id': shift.get('id'),
                            'shift_name': shift.get('name'),
                            'day': shift.get('day'),
                            'start_time': shift.get('start_time'),
                            'end_time': shift.get('end_time'),
                            'keyholder_required': shift.get('keyholder_required', False),
                            'staff_id': staff.get('id'),
                            'staff_name': staff.get('name'),
                        })

        # Contract hour check
        contract_issues = []
        for week_num, solution in enumerate(all_weeks):
            for st, staff in enumerate(self.staff):
                contracted = staff.get('contracted_hours', 0)
                if contracted == 0:
                    continue
                actual_minutes = sum(
                    self._get_shift_duration(self.shifts[si])
                    for si in range(len(self.shifts))
                    if solution[si][st] == 1
                )
                actual_hours = round(actual_minutes / 60, 1)
                diff = abs(actual_hours - contracted)
                if diff > 1:
                    contract_issues.append({
                        'week': week_num + 1,
                        'staff_id': staff.get('id'),
                        'staff_name': staff.get('name'),
                        'contracted': contracted,
                        'actual': actual_hours,
                        'reason': ('Not enough shifts available to meet contracted hours'
                                   if actual_hours < contracted else
                                   'Max hours cap exceeded contracted hours'),
                    })

        return {
            'success': True,
            'assignments': assignments,
            'contract_issues': contract_issues,
            'stats': {
                'wall_time': round(time.time() - start, 2),
                'weeks': self.weeks,
                'staff_count': len(self.staff),
                'shift_count': len(self.shifts),
            }
        }

    # ── Failure diagnosis ─────────────────────────────────────────────────────

    def _diagnose_failure(self):
        issues = []

        # Check total shift hours vs total contracted hours
        total_shift_hours = sum(self._get_shift_duration_hours(s) * s.get('staff_required', 1)
                                for s in self.shifts)
        total_contracted = sum(s.get('contracted_hours', 0) for s in self.staff)

        if total_contracted > total_shift_hours * 1.1:
            issues.append(
                f"Contracted hours ({total_contracted}h) exceed available shift hours "
                f"({total_shift_hours:.1f}h). Add more shifts or reduce contracted hours."
            )

        # Check availability coverage
        days = list(set(s['day'] for s in self.shifts))
        for day in days:
            day_shifts = [s for s in self.shifts if s['day'] == day]
            for shift in day_shifts:
                required = shift.get('staff_required', 1)
                available = sum(1 for staff in self.staff if self._is_staff_available(staff, shift))
                if available < required:
                    issues.append(
                        f"Not enough available staff for '{shift['name']}' on {day} "
                        f"(need {required}, have {available} available)."
                    )

        # Check keyholder coverage
        if self._rule('enforce_keyholder', True):
            keyholder_shifts = [s for s in self.shifts if s.get('keyholder_required', False)]
            keyholders = [s for s in self.staff if s.get('keyholder', False)]
            if keyholder_shifts and not keyholders:
                issues.append(
                    "Keyholder-required shifts exist but no staff are marked as keyholders."
                )

        if issues:
            return ' | '.join(issues)

        return ("Could not find a valid schedule. Try: relaxing availability rules, "
                "adjusting contracted hours, or adding more shift coverage.")


def main():
    try:
        data = json.loads(sys.stdin.read())
        scheduler = ShiftlyScheduler(data)
        result = scheduler.solve(timeout_seconds=60)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
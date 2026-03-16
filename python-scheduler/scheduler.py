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

    def solve_single_week(self, week_num, previous_solutions=None):
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

        # ── Hard constraint: staff count per shift ────────────────────────────
        for si, shift in enumerate(self.shifts):
            required = shift.get('staff_required', 1)
            model.Add(
                sum(schedule[si][st] for st in range(n_staff)) == required
            )

        # ── Hard constraint: availability ────────────────────────────────────
        for si, shift in enumerate(self.shifts):
            for st, staff in enumerate(self.staff):
                if not self._is_staff_available(staff, shift):
                    model.Add(schedule[si][st] == 0)

        # ── Hard constraint: keyholder ────────────────────────────────────────
        enforce_keyholder = self._rule('enforce_keyholder', True)
        if enforce_keyholder:
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

        # ── Hard constraint: no clopening ─────────────────────────────────────
        min_rest_hours = self._rule('min_rest_hours', 11)
        min_rest_minutes = min_rest_hours * 60

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
                            model.Add(schedule[si_c][st] + schedule[si_o][st] <= 1)

        # ── Hard constraint: max consecutive working days ─────────────────────
        max_consec = self._rule('max_consecutive_days', 5)
        if max_consec and max_consec < 7:
            for start_d in range(len(day_order) - max_consec):
                consec_days = day_order[start_d:start_d + max_consec + 1]
                for st in range(n_staff):
                    day_worked = []
                    for day in consec_days:
                        day_shifts = [si for si, s in enumerate(self.shifts) if s['day'] == day]
                        if day_shifts:
                            worked = model.NewBoolVar(f'worked_{day}_{st}_w{week_num}_{start_d}')
                            model.AddMaxEquality(worked, [schedule[si][st] for si in day_shifts])
                            day_worked.append(worked)
                    if len(day_worked) == max_consec + 1:
                        model.Add(sum(day_worked) <= max_consec)

        # ── Hard constraint: contracted/max hours ────────────────────────────
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

            if contracted > 0:
                model.Add(total_minutes >= int(contracted * 60) - 60)

            model.Add(total_minutes <= int(max_h * 60))

        # ── Soft: variety between weeks ───────────────────────────────────────
        if previous_solutions:
            variety_penalties = []
            for prev in previous_solutions:
                same_count = model.NewIntVar(0, n_staff * n_shifts, f'same_w{week_num}')
                match_vars = []
                for si in range(n_shifts):
                    for st in range(n_staff):
                        prev_val = prev.get(si, {}).get(st, 0)
                        if prev_val == 1:
                            match = model.NewBoolVar(f'match_{si}_{st}_w{week_num}')
                            model.Add(schedule[si][st] == 1).OnlyEnforceIf(match)
                            model.Add(schedule[si][st] == 0).OnlyEnforceIf(match.Not())
                            match_vars.append(match)
                if match_vars:
                    model.Add(same_count == sum(match_vars))
                    variety_penalties.append(same_count)

            if variety_penalties:
                total_same = model.NewIntVar(0, n_staff * n_shifts * len(previous_solutions), 'total_same')
                model.Add(total_same == sum(variety_penalties))
                # Force meaningful difference: at least 30% different assignments
                min_different = max(1, int(n_staff * 0.3))
                max_same = (n_staff * n_shifts) - min_different
                model.Add(total_same <= max_same)

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

        # ── Soft: balance keyholder shifts ────────────────────────────────────
        if self._rule('balance_keyholder_shifts', True):
            keyholder_staff = [st for st, s in enumerate(self.staff) if s.get('keyholder', False)]
            keyholder_shifts = [si for si, s in enumerate(self.shifts) if s.get('keyholder_required', False)]
            if len(keyholder_staff) > 1 and keyholder_shifts:
                kh_counts = []
                for st in keyholder_staff:
                    kc = model.NewIntVar(0, len(keyholder_shifts), f'kh_{st}_w{week_num}')
                    model.Add(kc == sum(schedule[si][st] for si in keyholder_shifts))
                    kh_counts.append(kc)
                kh_max = model.NewIntVar(0, len(keyholder_shifts), f'kh_max_w{week_num}')
                kh_min = model.NewIntVar(0, len(keyholder_shifts), f'kh_min_w{week_num}')
                model.AddMaxEquality(kh_max, kh_counts)
                model.AddMinEquality(kh_min, kh_counts)
                kh_spread = model.NewIntVar(0, len(keyholder_shifts), f'kh_spread_w{week_num}')
                model.Add(kh_spread == kh_max - kh_min)
                minimize_terms.append(kh_spread)

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

        # ── Optimise ──────────────────────────────────────────────────────────
        if minimize_terms:
            model.Minimize(sum(minimize_terms))

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
        for week_num in range(self.weeks):
            solution = self.solve_single_week(week_num, previous_solutions=all_weeks)
            if solution is None:
                return {
                    'success': False,
                    'error': self._diagnose_failure(),
                }
            all_weeks.append(solution)

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
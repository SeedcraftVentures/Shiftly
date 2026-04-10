export const DEFAULT_SHIFT_LENGTHS = [4, 6, 8]

export const DEFAULT_MAX_CONSECUTIVE_HOURS = 12

export const DEFAULT_STAFF = {
  max_hours: 40,
  contracted_hours: 0,
  wage: 0,
  preferred_shift_lengths: [],
  is_keyholder: false,
  role: null,
  invite_status: 'Not Invited',
}

export const DEFAULT_LOCATION_RULES = {
  no_clopening: true,
  no_double_shifts: true,
  fair_weekend_distribution: true,
  enforce_max_consecutive_days: true,
  max_consecutive_days: 6,
  enforce_min_days_off: true,
  min_days_off: 1,
  enforce_rest_between_shifts: true,
  min_rest_hours: 11,
}

// Database Table Names ────────────────────────────────────────────────────
export const DB_TABLES = {
    users: 'Users',
    organizations: 'Organizations',
    organizationMembers: 'Organization Members',
    locations: 'Locations',
    teams: 'Teams_new',
    locationDayHours: 'Location Day Hours',
    teamDayHours: 'Team Day Hours',
    staff: 'Staff_new',
    rotas: 'Rotas_new',
    shiftPatterns: 'Shift Patterns',
    locationRules: 'Location Rules',
    requests: 'requests',
    notifications: 'notifications',

    shiftsOld: 'Shifts',
    teamsOld: 'Teams',
    staffOld: 'Staff',
}

// localStorage Keys and Values
// ───────────────────────────────────────────────────────
// Functions where the key includes a dynamic ID, plain strings otherwise.

export const STORAGE_KEYS = {
    tourComplete: 'shiftly_tour_complete',
    teamSetupSuccess: (teamId) => `team_setup_success_${teamId}`,
}

// React Query Keys ────────────────────────────────────────────────────────
// Use factory functions for parameterized keys so invalidation stays in sync.

export const QUERY_KEYS = {
    // Global (no team scope)
    rotas: ['rotas'],
    requests: ['requests'],
    escalations: ['escalations'],

    // Employee
    employeeProfile: ['employee-profile'],
    employeeShifts: (profileId) => ['employee-shifts', profileId],
    employeeRequests: ['employee-requests'],
    openShifts: (teamId) => ['open-shifts', teamId],

    // Location-scoped (new schema)
    shiftPatterns: ['shift-patterns'],

    // Team-scoped
    staff: (teamId) => ['staff', teamId],
    shifts: (teamId) => ['shifts', teamId],
    rules: (teamId) => ['rules', teamId],
    teamDetail: (teamId) => ['team-detail', teamId],
    announcements: (teamId) => ['announcements', teamId],
    requestsByTeam: (teamId) => ['requests', teamId],
}

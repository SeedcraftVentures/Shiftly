// Database Table Names ────────────────────────────────────────────────────
export const DB_TABLES = {
    teams: 'Teams',
    staff: 'Staff',
    rotas: 'Rotas',
    requests: 'requests',
    notifications: 'notifications',
}

// localStorage Keys and Values
// ───────────────────────────────────────────────────────
// Functions where the key includes a dynamic ID, plain strings otherwise.

export const STORAGE_KEYS = {
    userType: (userId) => `shiftly_user_type_${userId}`,
    tourComplete: 'shiftly_tour_complete',
    teamSetupSuccess: (teamId) => `team_setup_success_${teamId}`,
}

export const STORAGE_VALUES = {
    userType: {
        manager: 'manager',
        employee: 'employee',
        unknown: 'unknown'
    }
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

    // Team-scoped
    staff: (teamId) => ['staff', teamId],
    shifts: (teamId) => ['shifts', teamId],
    rules: (teamId) => ['rules', teamId],
    teamDetail: (teamId) => ['team-detail', teamId],
    announcements: (teamId) => ['announcements', teamId],
    requestsByTeam: (teamId) => ['requests', teamId],
}
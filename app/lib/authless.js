const testUser = {
  id: 'hacker-test-user-id',
  firstName: 'Hacker',
}

const testUserState = {
  isLoaded: true,
  isSignedIn: true,
  user: testUser,
}

export async function auth() {
  return {
    userId: testUser.id,
  }
}

export function useUser() {
  return testUserState
}
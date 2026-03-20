export async function auth()
{
  return {
        userId: 'test-user-id'
    }
}

export function useUser()
{
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      firstName: 'Test'
    },
  }
}
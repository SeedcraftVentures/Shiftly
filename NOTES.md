1. Combine all svg icons in one file and reuse
2. LOTS of transition-all being used which is bad (https://stackoverflow.com/questions/67363406/what-is-the-difference-between-transition-all-and-transition-in-tailwindcss)
3. Replace raw ANON_KEY clients with lib/supabase

FF1F7D - pink-500
F8F9FA - gray-50

To disable clerk:
1. Comment out all `<ClerkProvider>`s, `<SignIn>`s and `<UserButton>`s
2. Replace all 
    `useUser()`
    with 
    ```
    const user = { id: 'test-user-id', firstName: 'Test' }
    const isLoaded = true
    ```
1. Replace all
`const { userId } = await auth()`
with
`const userId = 'test-user-id'`
1. Replace all
`const { isLoaded, isSignedIn } = useUser()`
with
    ```
    const isLoaded = true
    const isSignedIn = true
    ```


Logic/visual updates:
1. Some colours aligned with pink-*
2. 'new' removed from /api/auth/user-type and usages. Forced to 'manager'
3. 
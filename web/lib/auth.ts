import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * NextAuth configuration.
 *
 * Users are defined via environment variables:
 *   AUTH_USERS=admin@autotool.com:password123,user@example.com:theirpassword
 *
 * For MVP: single admin user is sufficient.
 * Format: email:password pairs separated by commas.
 */

function parseAuthUsers(): Array<{ email: string; password: string }> {
  const usersEnv = process.env.AUTH_USERS || ''
  if (!usersEnv) {
    // Default admin user for development
    return [{ email: 'admin@autotool.com', password: 'admin' }]
  }

  return usersEnv.split(',').map((pair) => {
    const [email, password] = pair.split(':')
    return { email: email?.trim(), password: password?.trim() }
  }).filter(u => u.email && u.password)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const users = parseAuthUsers()
        const user = users.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        )

        if (user) {
          return { id: user.email, email: user.email, name: user.email.split('@')[0] }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

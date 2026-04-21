import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login (auth page)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, etc.
     */
    '/((?!login|register|api/auth|api/register|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

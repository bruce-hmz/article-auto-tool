import { NextRequest, NextResponse } from 'next/server'
import { hashSync } from 'bcryptjs'
import { z } from 'zod'
import { getUserByEmail, createUser } from '@/lib/db/queries/users'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    // Check if user already exists
    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Create user
    const passwordHash = hashSync(password, 12)
    const user = await createUser(email, passwordHash, name)

    return NextResponse.json({
      id: user!.id,
      email: user!.email,
      name: user!.name,
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}

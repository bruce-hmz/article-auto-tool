import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const wechatAccounts = sqliteTable('wechat_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  appId: text('app_id').notNull(),
  appSecret: text('app_secret').notNull(),
  config: text('config'), // JSON: defaultTheme, imageStyle, publishing settings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const editorialBriefs = sqliteTable('editorial_briefs', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().unique().references(() => wechatAccounts.id, { onDelete: 'cascade' }),
  voice: text('voice'),
  audience: text('audience'),
  tone: text('tone'),
  topicDomains: text('topic_domains'), // JSON: { include: [], exclude: [] }
  promptOverrides: text('prompt_overrides'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

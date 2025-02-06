import knex from 'knex'
import path from 'path'

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

export const dbService = {
	initDatabase,
}

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(__dirname)

const backDir = path.resolve(__dirname, '..')

// Initialize knex with SQLite
const db = knex({
	client: 'sqlite3',
	connection: {
		filename: join(backDir, 'db', 'transactions.sqlite'),
	},
	useNullAsDefault: true,
})

async function initDatabase() {
	const hasTransactionsTable = await db.schema.hasTable('transactions')

	if (!hasTransactionsTable) {
		await db.schema.createTable('transactions', table => {
			table.increments('id')
			table.date('date').notNullable()
			table.string('title')
			table.text('details')
			table.string('transactionId')
			table.decimal('amount').notNullable()
			table.decimal('balance')
			table.date('valueDate').notNullable()
			table.string('beneficiary')
			table.text('comments')
			table.string('source')
		})

		// Create indices
		await db.schema.alterTable('transactions', table => {
			table.index('date')
			table.index('valueDate')
		})
	}
	return db
}

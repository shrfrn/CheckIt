import express from 'express'
import multer from 'multer'
import knex from 'knex'
import XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cors from 'cors'

import { normalizeChaseCreditData } from './normalizers/chaseCreditNormalizer.js'
import { normalizeChaseCheckingData } from './normalizers/chaseCheckingNormalizer.js'
import { normalizeHapoalimStatementData } from './normalizers/hapoalimStatementNormalizer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() })

// Initialize knex with SQLite
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: join(__dirname, 'db', 'transactions.sqlite')
  },
  useNullAsDefault: true
})

// Initialize express
const app = express()
app.use(cors())

// Initialize database
async function initDatabase() {
  const hasTransactionsTable = await db.schema.hasTable('transactions')
  
  if (!hasTransactionsTable) {
    await db.schema.createTable('transactions', table => {
      table.increments('id')
      table.date('date').notNullable()
      table.string('title')
      table.text('details')
      table.string('transactionId')
      table.decimal('amount')
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
}

// Process file upload based on type
async function processSpreadsheet(buffer, sheetType) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet)

  const normalizers = {
    chaseCredit: normalizeChaseCreditData,
    chaseChecking: normalizeChaseCheckingData,
    hapoalimStatement: normalizeHapoalimStatementData
  }

  const normalizer = normalizers[sheetType]
  if (!normalizer) {
    throw new Error('Unsupported sheet type')
  }

  return normalizer(jsonData)
}

// API Routes
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params
    const normalizedData = await processSpreadsheet(req.file.buffer, type)
    
    await db('transactions').insert(normalizedData)
    
    res.json({ message: 'File processed successfully', count: normalizedData.length })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await db('transactions').select('*')
    res.json(transactions)
  } catch (error) {
    console.error('Query error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
initDatabase()
  .then(() => {
    app.listen(3000, () => {
      console.log('Server running on port 3000')
    })
  })
  .catch(err => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  }) 
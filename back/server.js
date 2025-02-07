import express from 'express'
import cors from 'cors'
import multer from 'multer'
import XLSX from 'xlsx'

import { dbService } from './services/db.service.js'

import { normalizeChaseCreditData } from './normalizers/chaseCreditNormalizer.js'
import { normalizeChaseCheckingData } from './normalizers/chaseCheckingNormalizer.js'
import { normalizeHapoalimStatementData } from './normalizers/hapoalimStatementNormalizer.js'
import { normalizeMcStatementData } from './normalizers/mcNormalizer.js'

const app = express()
app.use(cors())

const upload = multer({ storage: multer.memoryStorage() })
const db = await dbService.initDatabase()

// Process file upload based on type
async function processSpreadsheet(buffer, sheetType) {
	const workbook = XLSX.read(buffer, { type: 'buffer' })
	const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
	
	// Convert to array of arrays format instead of array of objects
	const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
    console.log('jsonData first few rows:', jsonData.slice(0, 5))

	const normalizers = {
		chaseCredit: normalizeChaseCreditData,
		chaseChecking: normalizeChaseCheckingData,
		hapoalimStatement: normalizeHapoalimStatementData,
		mcStatement: normalizeMcStatementData,
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
		console.log('type', type)
		const normalizedData = await processSpreadsheet(req.file.buffer, type)
		console.log('normalizedData', normalizedData)
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
app.listen(3000, () => {
    console.log('Server running on port 3000')
})

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import XLSX from 'xlsx'

import { dbService } from './services/db.service.js'

import { normalizeChaseCreditData } from './normalizers/chaseCreditNormalizer.js'
import { normalizeChaseCheckingData } from './normalizers/chaseCheckingNormalizer.js'
import { normalizeHapoalimStatementData } from './normalizers/hapoalimStatementNormalizer.js'
import { normalizeMcStatementData } from './normalizers/mcNormalizer.js'
import { normalizeMasterStatement } from './normalizers/masterNormalizer.js'

const app = express()
app.use(cors())

const upload = multer({ storage: multer.memoryStorage() })
const db = await dbService.initDatabase()

// Process file upload based on type
async function processSpreadsheet(buffer, sheetType, originalFileName) {
	let data
	
	// Check if file is CSV based on filename
	if (originalFileName.toLowerCase().endsWith('.csv')) {
		// Convert buffer to string with UTF-8 encoding for CSV files
		const csvContent = buffer.toString('utf-8')
		data = csvContent
	} else {
		// Handle Excel files as before
		const workbook = XLSX.read(buffer, { type: 'buffer' })
		const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
		data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
	}

	const normalizers = {
		chaseCredit: normalizeChaseCreditData,
		chaseChecking: normalizeChaseCheckingData,
		hapoalimStatement: normalizeHapoalimStatementData,
		mcStatement: normalizeMcStatementData,
		masterStatement: normalizeMasterStatement
	}

	const normalizer = normalizers[sheetType]
	if (!normalizer) {
		throw new Error('Unsupported sheet type')
	}

	const result = normalizer(data)
	if (!result || !result.length) {
		throw new Error('No data was normalized from the file')
	}

	return result
}

// API Routes
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
	try {
		const { type } = req.params
		console.log('Processing file:', req.file.originalname, 'type:', type)
		const normalizedData = await processSpreadsheet(req.file.buffer, type, req.file.originalname)
		console.log('normalizedData', normalizedData)
		
		// Get count before insertion
		const beforeCount = await db('transactions').count('* as count').first()
		
		// Insert records and ignore duplicates
		await db('transactions')
			.insert(normalizedData)
			.onConflict(['date', 'title', 'amount', 'transactionId'])
			.ignore()
			
		// Get count after insertion
		const afterCount = await db('transactions').count('* as count').first()
		
		// Calculate actual number of inserted records
		const insertedCount = afterCount.count - beforeCount.count

		res.json({ 
			message: 'File processed successfully', 
			count: insertedCount,
			totalRecords: afterCount.count
		})
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

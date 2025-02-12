import express from 'express'
import cors from 'cors'
import multer from 'multer'

import { processSpreadsheet } from './normalizers/index.js'
import { transactionService } from './services/transaction.service.js'

const app = express()
app.use(cors())

const upload = multer({ storage: multer.memoryStorage() })
// const db = await dbService.initDatabase()

// API Routes
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
	try {
		const { type } = req.params
		const transactions = await processSpreadsheet(req.file.buffer, type, req.file.originalname)
		
		const beforeCount = await transactionService.getCount()
		await transactionService.insertMany(transactions)
		const afterCount = await transactionService.getCount()

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

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

app.get('/api/uncategorized', async (req, res) => {
    try {
        const batch = await transactionService.getUncategorizedBatch()
        res.json(batch)
    } catch (error) {
        console.error('Error fetching uncategorized transactions:', error)
        res.status(500).json({ error: error.message })
    }
})

app.patch('/api/transactions', express.json(), async (req, res) => {
    try {
        const updates = req.body
        if (!Array.isArray(updates) || !updates.every(u => u.id && u.category)) {
            return res.status(400).json({ 
                error: 'Invalid request format. Expected array of objects with id and category fields' 
            })
        }

        const updatedCount = await transactionService.updateCategories(updates)
        res.json({ 
            message: 'Categories updated successfully',
            updatedCount 
        })
    } catch (error) {
        console.error('Error updating categories:', error)
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params
        const transaction = await transactionService.getTransactionById(id)
            
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' })
        }
        
        res.json(transaction)
    } catch (error) {
        console.error('Query error:', error)
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/stats/:year', async (req, res) => {
    try {
        const { year } = req.params
        const stats = await transactionService.getYearlyStats(year)
        res.json(stats)
    } catch (error) {
        console.error('Error fetching yearly stats:', error)
        res.status(500).json({ error: error.message })
    }
})

// Start server
app.listen(3000, () => {
    console.log('Server running on port 3000')
})

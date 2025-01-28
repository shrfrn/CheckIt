import { normalizeChaseCreditData } from './normalizers/chaseCreditNormalizer.js'
import { normalizeChaseCheckingData } from './normalizers/chaseCheckingNormalizer.js'
import { normalizeHapoalimStatementData } from './normalizers/hapoalimStatementNormalizer.js'
import { initDatabase, insertTransactions, getAllTransactions } from './services/transactionService.js'

// State management
const state = {
	fileData: null,
	sheetType: null,
}

// DOM utilities
const dom = {
	getFileInput: () => document.querySelector('.file-input'),
	getTypeSelect: () => document.querySelector('.sheet-type-select'),
	getProcessButton: () => document.querySelector('.process-button'),
	getStatusMessage: () => document.querySelector('.status-message'),
	getAllTransactionsBtn: () => document.querySelector('.get-all-transactions'),
}

// UI updates
const updateUI = {
	processButton: () => {
		const button = dom.getProcessButton()
		button.disabled = !(state.fileData && state.sheetType)
	},

	status: (message, type) => {
		const statusEl = dom.getStatusMessage()
		statusEl.textContent = message
		statusEl.className = 'status-message ' + type
	},
}

// File processing
const readFile = file => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		reader.onload = e => {
			try {
				const data = new Uint8Array(e.target.result)
				const workbook = XLSX.read(data, { type: 'array' })
				const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
				const jsonData = XLSX.utils.sheet_to_json(firstSheet)
				resolve(jsonData)
			} catch (err) {
				reject(err)
			}
		}

		reader.onerror = err => reject(err)
		reader.readAsArrayBuffer(file)
	})
}

// Data normalization
const normalizeData = (data, sheetType) => {
	const normalizers = {
		chaseCredit: normalizeChaseCreditData,
		chaseChecking: normalizeChaseCheckingData,
		hapoalimStatement: normalizeHapoalimStatementData
	}

	const normalizer = normalizers[sheetType]
	if (!normalizer) {
		throw new Error('Unsupported sheet type')
	}
	return normalizer(data)
}

// Event handlers
const handleFileSelect = () => {
	const file = dom.getFileInput().files[0]
	if (file) {
		state.fileData = file
		updateUI.processButton()
	}
}

const handleTypeSelect = () => {
	state.sheetType = dom.getTypeSelect().value
	updateUI.processButton()
}

const handleProcess = async () => {
	try {
		const data = await readFile(state.fileData)
		const normalized = normalizeData(data, state.sheetType)
		insertTransactions(normalized)
		updateUI.status('File processed successfully!', 'success')
	} catch (err) {
		updateUI.status('Error processing file: ' + err.message, 'error')
		console.error('Processing error:', err)
	}
}

const showAllTransactions = () => {
	const allTransactions = getAllTransactions()
	console.log(allTransactions)
}

// Initialize application
const initApp = async () => {
	try {
		// Initialize database
		await initDatabase()

		// Set up event listeners
		dom.getFileInput().addEventListener('change', handleFileSelect)
		dom.getTypeSelect().addEventListener('change', handleTypeSelect)
		dom.getProcessButton().addEventListener('click', handleProcess)
		dom.getAllTransactionsBtn().addEventListener('click', showAllTransactions)
	} catch (err) {
		updateUI.status('Failed to initialize application', 'error')
		console.error('Initialization error:', err)
	}
}

// Start the application
initApp()

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

// API calls
const api = {
	uploadFile: async (file, type) => {
		const formData = new FormData()
		formData.append('file', file)

		const response = await fetch(`http://localhost:3000/api/upload/${type}`, {
			method: 'POST',
			body: formData
		})

		if (!response.ok) {
			const error = await response.json()
			throw new Error(error.message)
		}

		return response.json()
	},

	getAllTransactions: async () => {
		const response = await fetch('http://localhost:3000/api/transactions')
		if (!response.ok) {
			throw new Error('Failed to fetch transactions')
		}
		return response.json()
	}
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
		const result = await api.uploadFile(state.fileData, state.sheetType)
		updateUI.status(`File processed successfully! ${result.count} transactions imported.`, 'success')
	} catch (err) {
		updateUI.status('Error processing file: ' + err.message, 'error')
		console.error('Processing error:', err)
	}
}

const showAllTransactions = async () => {
	try {
		const transactions = await api.getAllTransactions()
		console.log(transactions)
	} catch (err) {
		updateUI.status('Error fetching transactions: ' + err.message, 'error')
		console.error('Fetch error:', err)
	}
}

// Initialize application
function initApp() {
	// Set up event listeners
	dom.getFileInput().addEventListener('change', handleFileSelect)
	dom.getTypeSelect().addEventListener('change', handleTypeSelect)
	dom.getProcessButton().addEventListener('click', handleProcess)
	dom.getAllTransactionsBtn().addEventListener('click', showAllTransactions)
}

// Start the application
initApp()

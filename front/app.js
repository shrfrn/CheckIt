// State management
const state = {
	fileData: null,
	sheetType: null,
	fileEncoding: 'utf-8'
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
		formData.append('encoding', state.fileEncoding)

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
	},

	updateCategories: async updates => {
		const response = await fetch('http://localhost:3000/api/transactions', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updates)
		})

		if (!response.ok) {
			const error = await response.json()
			throw new Error(error.message)
		}

		return response.json()
	}
}

// Event handlers
const handleFileSelect = () => {
	const file = dom.getFileInput().files[0]
	if (file) {
		// Set appropriate encoding for Hebrew CSV files
		if (file.name.toLowerCase().endsWith('.csv')) {
			state.fileEncoding = 'utf-8'
		}
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
		alert(`Successfully imported ${result.count} transactions`)
		updateUI.status('File processed successfully!', 'success')
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

// DOM Elements
const uploadContainer = document.querySelector('.upload-container')
const transactionsContainer = document.querySelector('.transactions-container')
const uploadLink = document.querySelector('.upload-link')
const categorizeLink = document.querySelector('.categorize-link')
const fileInput = document.querySelector('.file-input')
const sheetTypeSelect = document.querySelector('.sheet-type-select')
const processButton = document.querySelector('.process-button')
const statusMessage = document.querySelector('.status-message')
const transactionsGrid = document.querySelector('.transactions-grid tbody')
const transactionCount = document.querySelector('.transaction-count')

// Navigation
function showUploadView() {
	uploadContainer.style.display = 'block'
	transactionsContainer.style.display = 'none'
	uploadLink.classList.add('active')
	categorizeLink.classList.remove('active')
}

function showTransactionsView() {
	uploadContainer.style.display = 'none'
	transactionsContainer.style.display = 'block'
	uploadLink.classList.remove('active')
	categorizeLink.classList.add('active')
	loadUncategorizedTransactions()
}

// Event Listeners
uploadLink.addEventListener('click', e => {
	e.preventDefault()
	showUploadView()
})

categorizeLink.addEventListener('click', e => {
	e.preventDefault()
	showTransactionsView()
})

// File Upload Validation
function updateProcessButton() {
	processButton.disabled = !fileInput.files.length || !sheetTypeSelect.value
}

fileInput.addEventListener('change', updateProcessButton)
sheetTypeSelect.addEventListener('change', updateProcessButton)

// Process File Upload
processButton.addEventListener('click', async () => {
	const file = fileInput.files[0]
	const type = sheetTypeSelect.value
	
	const formData = new FormData()
	formData.append('file', file)
	
	try {
		statusMessage.className = 'status-message'
		statusMessage.textContent = 'Processing...'
		
		const response = await fetch(`http://localhost:3000/api/upload/${type}`, {
			method: 'POST',
			body: formData
		})
		
		const result = await response.json()
		
		if (!response.ok) throw new Error(result.error)
		
		statusMessage.classList.add('success')
		statusMessage.textContent = `Successfully processed ${result.count} new transactions. Total records: ${result.totalRecords}`
		
		// Reset form
		fileInput.value = ''
		sheetTypeSelect.value = ''
		updateProcessButton()
		
	} catch (error) {
		statusMessage.classList.add('error')
		statusMessage.textContent = `Error: ${error.message}`
	}
})

// Uncategorized Transactions
async function loadUncategorizedTransactions() {
	try {
		const response = await fetch('http://localhost:3000/api/uncategorized')
		const data = await response.json()
		
		if (!response.ok) throw new Error(data.error)
		
		renderTransactions(data)
	} catch (error) {
		console.error('Error loading uncategorized transactions:', error)
	}
}

function createCategorySelect(transaction, categorySuggestions, otherCategories) {
	const select = document.createElement('select')
	select.className = 'category-select'
	
	// Add suggested categories
	const suggestedGroup = document.createElement('optgroup')
	suggestedGroup.label = 'Suggestions'
	categorySuggestions.forEach(suggestion => {
		const option = document.createElement('option')
		option.value = suggestion.category
		option.textContent = `${suggestion.category} (${suggestion.count})`
		suggestedGroup.appendChild(option)
	})
	select.appendChild(suggestedGroup)
	
	// Add separator
	const separator = document.createElement('option')
	separator.disabled = true
	separator.textContent = '──────────'
	select.appendChild(separator)
	
	// Add other categories
	const otherGroup = document.createElement('optgroup')
	otherGroup.label = 'Other Categories'
	otherCategories.forEach(category => {
		const option = document.createElement('option')
		option.value = category
		option.textContent = category
		otherGroup.appendChild(option)
	})
	select.appendChild(otherGroup)
	
	return select
}

function updateTransactionCount() {
	const totalRows = transactionsGrid.querySelectorAll('tr').length
	const excludedRows = transactionsGrid.querySelectorAll('.exclude-checkbox:checked').length
	const activeRows = totalRows - excludedRows
	transactionCount.textContent = `(${activeRows} transactions)`
}

function renderTransactions(data) {
	const { uncategorizedTransactions, categorySuggestions, otherCategories } = data
	transactionsGrid.innerHTML = ''
	
	uncategorizedTransactions.forEach(transaction => {
		const row = document.createElement('tr')
		row.dataset.transactionId = transaction.id
		
		// Category select
		const categoryCell = document.createElement('td')
		const select = createCategorySelect(transaction, categorySuggestions, otherCategories)
		categoryCell.appendChild(select)
		
		// Transaction details
		const dateCell = document.createElement('td')
		dateCell.textContent = new Date(transaction.date).toLocaleDateString('he-IL')
		
		const titleCell = document.createElement('td')
		titleCell.textContent = transaction.title
		
		const amountCell = document.createElement('td')
		amountCell.textContent = transaction.amount.toFixed(2)
		
		// Actions
		const actionsCell = document.createElement('td')
		const detailsButton = document.createElement('button')
		detailsButton.textContent = 'Details'
		detailsButton.className = 'action-button'
		actionsCell.appendChild(detailsButton)
		
		// Exclude checkbox
		const excludeCell = document.createElement('td')
		const excludeCheckbox = document.createElement('input')
		excludeCheckbox.type = 'checkbox'
		excludeCheckbox.className = 'exclude-checkbox'
		excludeCheckbox.addEventListener('change', updateTransactionCount)
		excludeCell.appendChild(excludeCheckbox)
		
		// Append all cells
		row.appendChild(categoryCell)
		row.appendChild(dateCell)
		row.appendChild(titleCell)
		row.appendChild(amountCell)
		row.appendChild(actionsCell)
		row.appendChild(excludeCell)
		
		transactionsGrid.appendChild(row)
	})

	updateTransactionCount()
}

function getSelectedCategories() {
	const rows = transactionsGrid.querySelectorAll('tr')
	const updates = []

	rows.forEach(row => {
		const select = row.querySelector('.category-select')
		const excludeCheckbox = row.querySelector('.exclude-checkbox')
		
		// Skip if row is excluded or no category selected
		if (excludeCheckbox.checked || !select.value) return
		
		// Get transaction ID from the data attribute we'll add in renderTransactions
		const id = row.dataset.transactionId
		updates.push({
			id: parseInt(id),
			category: select.value
		})
	})

	return updates
}

// Add submit button handler
const submitButton = document.querySelector('.submit-button')
submitButton.addEventListener('click', async () => {
	const updates = getSelectedCategories()
	
	if (updates.length === 0) {
		alert('No categories selected to update')
		return
	}

	const shouldProceed = confirm(`Are you sure you want to update ${updates.length} transactions?`)
	if (!shouldProceed) return

	try {
		const result = await api.updateCategories(updates)
		const message = `Successfully updated ${result.updatedCount} transactions.`
		
		const shouldLoadMore = confirm(`${message}\n\nWould you like to load another batch of transactions?`)
		if (shouldLoadMore) {
			loadUncategorizedTransactions()
		}
	} catch (error) {
		alert('Error updating categories: ' + error.message)
		console.error('Update error:', error)
	}
})

// Initialize view
// TODO fix routing
(function initializeApp() {
	uploadContainer.style.display = 'none'
	transactionsContainer.style.display = 'none'
	uploadLink.click() // Start with upload view by simulating click on upload link
})()

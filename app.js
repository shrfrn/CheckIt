// State management
const state = {
	db: null,
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

// Database operations
const initDatabase = async () => {
	try {
		const SQL = await initSqlJs({
			locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
		})
		state.db = new SQL.Database()

		state.db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL CHECK (date IS strftime('%Y-%m-%d', date)), -- Ensures ISO 8601 format
                title TEXT,
                details TEXT,
                transactionId TEXT,
                amount REAL,
                balance REAL,
                valueDate TEXT NOT NULL CHECK (valueDate IS strftime('%Y-%m-%d', valueDate)), -- Ensures ISO 8601 format
                beneficiary TEXT,
                comments TEXT,
                source TEXT
            )
        `)

		// Create indices for better query performance
		state.db.run('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)')
		state.db.run('CREATE INDEX IF NOT EXISTS idx_value_date ON transactions(valueDate)')
	} catch (err) {
		updateUI.status('Failed to initialize database', 'error')
		console.error('SQL initialization error:', err)
	}
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

// Add this utility function for converting Excel dates
function excelDateToISOString(excelDate) {
	// Excel's epoch starts at January 1, 1900
	// Note: Excel has a leap year bug where it thinks 1900 was a leap year
	// We need to subtract 1 from dates before March 1, 1900, but since our dates are modern, we don't need that adjustment
	const millisecondsPerDay = 24 * 60 * 60 * 1000
	const excelEpoch = new Date(1900, 0, 1) // January 1, 1900
	const excelEpochAsMs = excelEpoch.getTime()
	const dateMsFromEpoch = excelDate * millisecondsPerDay
	const dateObj = new Date(excelEpochAsMs + dateMsFromEpoch)
	
	// Format as YYYY-MM-DD
	return dateObj.toISOString().split('T')[0]
}

// Data normalization
const normalizeData = (data, sheetType) => {
	const normalizers = {
		chaseCredit: row => ({
			date: row['Transaction Date'],
			description: row['Description'],
			amount: -parseFloat(row['Amount']),
			category: row['Category'] || 'Uncategorized',
			source: 'Chase Credit',
		}),

		chaseChecking: row => ({
			date: row['Posting Date'],
			description: row['Description'],
			amount: parseFloat(row['Amount']),
			category: row['Type'] || 'Uncategorized',
			source: 'Chase Checking',
		}),

		hapoalimStatement: rows => {
            const fieldMap = {
                'תנועות בחשבון': 'תאריך',
                '__EMPTY': 'הפעולה',
                '__EMPTY_1': 'פרטים',
                '__EMPTY_2': 'אסמכתא',
                '__EMPTY_3': 'חובה',
                '__EMPTY_4': 'זכות',
                '__EMPTY_5': 'יתרה בש\'\'ח',
                '__EMPTY_6': 'תאריך ערך',
                '__EMPTY_7': 'לטובת',
                '__EMPTY_8': 'עבור'
            }
    
            // Transform the data to use our expected field names
            const normalizedRows = rows.map(row => {
                const newRow = {}
                Object.entries(fieldMap).forEach(([xlsxField, hebrewField]) => {
                    newRow[hebrewField] = row[xlsxField]
                })
                return newRow
            })

            // Find the header row index (the one containing 'תאריך')
			const headerRowIndex = normalizedRows.findIndex(row => 
                Object.values(row).includes('חובה')
            )
            
            if (headerRowIndex === -1) {
                console.error('Header row not found in data:', data.slice(0, 10))
                throw new Error('Could not find header row in data')
            }

			// Get the actual data rows (everything after the header)
			const slicedRows = normalizedRows.slice(headerRowIndex + 1)
            console.log(slicedRows)

			// Filter and transform the rows
			return slicedRows
				.filter(row => {
					// Only include rows with a value in the 'חובה' (Amount) column
					return row['חובה'] && !isNaN(parseFloat(row['חובה']))
				})
				.map(row => ({
					date: excelDateToISOString(row['תאריך']),
					title: row['הפעולה'] || '',
					details: row['פרטים'] || '',
					transactionId: row['אסמכתא'] || '',
					amount: parseFloat(row['חובה']),
					balance: row['יתרה בש\'\'ח'] ? parseFloat(row['יתרה בש\'\'ח']) : null,
					valueDate: excelDateToISOString(row['תאריך ערך']),
					beneficiary: row['לטובת'] || '',
					comments: row['עבור'] || '',
					source: 'Hapoalim Bank'
				}))
		}
	}

	const normalizer = normalizers[sheetType]
	if (!normalizer) {
		throw new Error('Unsupported sheet type')
	}
    console.log(data)
	return normalizer(data)
}

// Database operations
const insertData = normalizedData => {
    console.log(normalizedData)
	const stmt = state.db.prepare(`
        INSERT INTO transactions (
            date, title, details, transactionId, amount, 
            balance, valueDate, beneficiary, comments, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

	normalizedData.forEach(row => {
        console.log(row)
		stmt.run([
			row.date,
			row.title,
			row.details,
			row.transactionId,
			row.amount,
			row.balance,
			row.valueDate,
			row.beneficiary,
			row.comments,
			row.source
		])
	})

	stmt.free()
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
        console.log(normalized)
		insertData(normalized)
		updateUI.status('File processed successfully!', 'success')
	} catch (err) {
		updateUI.status('Error processing file: ' + err.message, 'error')
		console.error('Processing error:', err)
	}
}

const showAllTransactions = () => {
    const allTransactions = state.db.exec('SELECT * FROM transactions')
    console.log(allTransactions)
}

// Initialize application
const initApp = () => {
	// Initialize database
	initDatabase()

	// Set up event listeners
	dom.getFileInput().addEventListener('change', handleFileSelect)
	dom.getTypeSelect().addEventListener('change', handleTypeSelect)
	dom.getProcessButton().addEventListener('click', handleProcess)
    dom.getAllTransactionsBtn().addEventListener('click', showAllTransactions)
}

// Start the application
initApp()

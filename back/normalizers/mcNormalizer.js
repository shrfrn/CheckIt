function excelDateToISOString(dateStr) {
    if (!dateStr) return null
    // Handle DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/')
    const date = new Date(year.length === 2 ? `20${year}` : year, month - 1, day)
    return date.toISOString().split('T')[0]
}

function convertCurrencySymbolToCode(symbol) {
    if (!symbol) return 'NIS'
    
    const currencyMap = {
        '₪': 'NIS',
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP'
    }

    // Clean the symbol from any whitespace or special characters
    const cleanSymbol = symbol.toString().trim()
    return currencyMap[cleanSymbol] || cleanSymbol
}

// const fieldMap = {
//     0: 'date',
//     1: 'title',
//     4: 'amount',
//     6: 'transactionId',
//     7: 'comments'
// }

function parseAmount(amount) {
    if (!amount || amount === '_') return null

    // Remove any commas and spaces from the number
    const cleanAmount = amount.toString().replace(/,|\s/g, '')
    
    // Check if we have a valid number after cleaning
    if (!cleanAmount.match(/^-?\d+\.?\d*$/)) return null
    
    return parseFloat(cleanAmount)
}

function isValidTransactionRow(row) {
    return row && 
           Array.isArray(row) && 
           row[0] && // Has a date
           row[0].toString().match(/^\d{2}\/\d{2}\/\d{2,4}$/) && // Valid date format
           !row.some(cell => cell && 
               cell.toString().includes('סך חיוב בש"ח') || 
               cell.toString().includes('TOTAL FOR DATE') ||
               cell.toString().includes('סה"כ')) // Not a total or summary row
}

function findHeaderRow(rows, headerText) {
    return rows.findIndex(row => 
        Array.isArray(row) && 
        row.some(cell => cell && cell.toString().includes(headerText)))
}

function extractSourceFromData(rows) {
    if (!rows?.[2]?.[0]) {
        throw new Error('Could not find source data in expected location (row 4, column 1)')
    }
    
    const sourceCell = rows[2][0].toString()
    const matches = sourceCell.match(/\d+/)
    if (!matches) {
        throw new Error('Could not find card number in source cell')
    }
    
    return matches[0]
}

export function normalizeMcStatement(rows) {
    // Clean up empty rows and ensure we have array data
    const cleanRows = rows.filter(row => Array.isArray(row) && row.length > 0)
    const source = extractSourceFromData(cleanRows)

    // Find the start of regular transactions section
    const regularHeaderRow = findHeaderRow(cleanRows, 'תאריך')
    if (regularHeaderRow === -1) {
        throw new Error('Could not find regular transactions section')
    }

    const requestTimestamp = Date.now()

    // Process regular transactions
    const regularTransactions = cleanRows
        .slice(regularHeaderRow + 1)
        .filter(isValidTransactionRow)
        .map(row => {
            const amount = parseAmount(row[4])

            // Skip rows with invalid amounts
            if (amount === null) return null
            
            return {
                date: excelDateToISOString(row[0]),
                title: row[1] || '',
                details: '', // Not available in this format
                transactionId: row[6] || '',
                amount,
                balance: null, // Balance not provided in this format
                valueDate: excelDateToISOString(row[0]),
                beneficiary: '', // Not available in this format
                comments: row[7] || '',
                source,
                insertedAt: requestTimestamp,
                category: '',
                currency: convertCurrencySymbolToCode(row[5]) // Column 5 for regular transactions
            }
        })
        .filter(transaction => transaction !== null) // Remove any transactions with invalid amounts

    // Find foreign transactions section
    const foreignHeaderRow = findHeaderRow(cleanRows.slice(regularHeaderRow + 1), 'עסקאות בחו˝ל')
    let foreignTransactions = []

    if (foreignHeaderRow !== -1) {
        // Find the actual header row with column names
        const foreignStart = 
            findHeaderRow(cleanRows.slice(regularHeaderRow + foreignHeaderRow + 1), 'תאריך רכישה')

        if (foreignStart !== -1) {
            const startIndex = regularHeaderRow + foreignHeaderRow + foreignStart + 2
            foreignTransactions = cleanRows
                .slice(startIndex)
                .filter(isValidTransactionRow)
                .map(row => {
                    const amount = parseAmount(row[5]) // Use amount in column 5 for foreign transactions
                    // Skip rows with invalid amounts
                    if (amount === null) return null
                    
                    return {
                        date: excelDateToISOString(row[0]),
                        title: row[2] || '',
                        details: '', // Not available in this format
                        transactionId: '', // Not consistently available in foreign transactions
                        amount,
                        balance: null,
                        valueDate: excelDateToISOString(row[0]),
                        beneficiary: '',
                        comments: '',
                        source,
                        insertedAt: requestTimestamp,
                        category: '',
                        currency: convertCurrencySymbolToCode(row[6]) // Column 6 for foreign transactions
                    }
                })
                .filter(transaction => transaction !== null) // Remove any transactions with invalid amounts
        }
    }

    // Combine and sort all transactions by date
    const allTransactions = [...regularTransactions, ...foreignTransactions]

    // Final validation to ensure no null amounts
    if (allTransactions.some(t => t.amount === null || isNaN(t.amount))) {
        throw new Error('Found transaction with invalid amount after processing')
    }

    return allTransactions
} 
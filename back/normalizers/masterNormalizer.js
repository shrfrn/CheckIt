import { parse } from 'csv-parse/sync'

function excelDateToISOString(dateStr) {
    if (!dateStr) return null
    // Handle DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/')
    const date = new Date(year.length === 2 ? `20${year}` : year, month - 1, day)
    return date.toISOString().split('T')[0]
}

export function normalizeMasterStatement(fileContent) {
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
        delimiter: ',',
        encoding: 'utf8',
        bom: true,
        quote: '"',
        escape: '"'
    })

    const requestTimestamp = Date.now()

    return records.map(record => {
        // Convert amount - just clean and parse the number
        const amount = parseFloat(record['סכום חיוב'].replace(/[^\d.-]/g, ''))

        return {
            date: excelDateToISOString(record['תאריך רכישה']),
            amount,
            title: record['פעולה']?.trim() || '',
            category: record['סיווג']?.trim() || 'uncategorized',
            details: record['הערות II']?.trim() || '',
            beneficiary: record['הערות III']?.trim() || '',
            source: record['מקור']?.trim() || 'unknown',
            insertedAt: requestTimestamp,
            currency: 'NIS',
            valueDate: excelDateToISOString(record['תאריך רכישה']), // Using same date as transaction date
            transactionId: record['transactionId']?.toString() || '' // Use transactionId from CSV
        }
    })
} 
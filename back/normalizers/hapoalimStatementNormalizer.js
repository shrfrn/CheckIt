function excelDateToISOString(excelDate) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const excelEpoch = new Date(1900, 0, 1)
    const excelEpochAsMs = excelEpoch.getTime()
    const dateMsFromEpoch = excelDate * millisecondsPerDay
    const dateObj = new Date(excelEpochAsMs + dateMsFromEpoch)
    return dateObj.toISOString().split('T')[0]
}

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

export function normalizeHapoalimStatementData(rows) {
    // Transform the data to use our expected field names
    const normalizedRows = rows.map(row => {
        const newRow = {}
        // Check if row is an array and convert to object using field map
        if (Array.isArray(row)) {
            Object.values(fieldMap).forEach((hebrewField, index) => {
                newRow[hebrewField] = row[index]
            })
        } else {
            Object.entries(fieldMap).forEach(([xlsxField, hebrewField]) => {
                newRow[hebrewField] = row[xlsxField]
            })
        }
        return newRow
    })

    // Find the header row index by checking for the word 'תאריך' in first position
    const headerRowIndex = normalizedRows.findIndex(row => 
        row['תאריך'] === 'תאריך'
    )
    
    if (headerRowIndex === -1) {
        throw new Error('Could not find header row in data')
    }

    // Get the actual data rows and transform them
    return normalizedRows
        .slice(headerRowIndex + 1)
        .filter(row => row['חובה'] && !isNaN(parseFloat(row['חובה'])))
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
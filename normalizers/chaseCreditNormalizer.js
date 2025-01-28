export function normalizeChaseCreditData(row) {
    return {
        date: row['Transaction Date'],
        description: row['Description'],
        amount: -parseFloat(row['Amount']),
        category: row['Category'] || 'Uncategorized',
        source: 'Chase Credit'
    }
} 
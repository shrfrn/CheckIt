export function normalizeChaseCheckingData(row) {
    return {
        date: row['Posting Date'],
        description: row['Description'],
        amount: parseFloat(row['Amount']),
        category: row['Type'] || 'Uncategorized',
        source: 'Chase Checking'
    }
} 
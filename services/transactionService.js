let db = null

export async function initDatabase() {
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
        })
        db = new SQL.Database()

        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL CHECK (date IS strftime('%Y-%m-%d', date)),
                title TEXT,
                details TEXT,
                transactionId TEXT,
                amount REAL,
                balance REAL,
                valueDate TEXT NOT NULL CHECK (valueDate IS strftime('%Y-%m-%d', valueDate)),
                beneficiary TEXT,
                comments TEXT,
                source TEXT
            )
        `)

        // Create indices for better query performance
        db.run('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)')
        db.run('CREATE INDEX IF NOT EXISTS idx_value_date ON transactions(valueDate)')
        
        return true
    } catch (err) {
        console.error('SQL initialization error:', err)
        throw err
    }
}

export function insertTransactions(normalizedData) {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare(`
        INSERT INTO transactions (
            date, title, details, transactionId, amount, 
            balance, valueDate, beneficiary, comments, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    normalizedData.forEach(row => {
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

export function getAllTransactions() {
    if (!db) throw new Error('Database not initialized')
    return db.exec('SELECT * FROM transactions')
}

export function getDatabase() {
    return db
} 
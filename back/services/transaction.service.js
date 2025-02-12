import { db } from './db.service.js'

export const transactionService = {
    insertMany,
    getCount,
    getUncategorizedBatch
}

function insertMany(transactions) {
    return db('transactions')
                .insert(transactions)
                .onConflict(['date', 'title', 'amount', 'transactionId'])
                .ignore()
}

function getCount() {
    return db('transactions').count('* as count').first()
}

async function getUncategorizedBatch() {
    // First get the most frequent uncategorized title
    const mostFrequentTitle = await db.with('uncategorized_title_counts', (qb) => {
        qb.select('title')
          .count('* as title_count')
          .from('transactions')
          .whereNull('category')
          .orWhere('category', '')
          .groupBy('title')
    })
    .with('max_count', (qb) => {
        qb.select(db.raw('MAX(title_count) as max_title_count'))
          .from('uncategorized_title_counts')
    })
    .select('title')
    .from('uncategorized_title_counts')
    .join('max_count', 'title_count', '=', 'max_title_count')
    .first()

    if (!mostFrequentTitle) return { uncategorizedTransactions: [], categorySuggestions: [] }

    // Get all uncategorized transactions with this title
    const uncategorizedTransactions = await db('transactions')
        .select('*')
        .where('title', mostFrequentTitle.title)
        .andWhere(qb => {
            qb.whereNull('category')
              .orWhere('category', '')
        })
        .orderBy('date', 'desc')

    // Get category suggestions for this title
    const categorySuggestions = await db('transactions')
        .select('category')
        .count('* as count')
        .where('title', mostFrequentTitle.title)
        .whereNotNull('category')
        .andWhere('category', '!=', '')
        .groupBy('category')
        .orderBy('count', 'desc')

    return {
        uncategorizedTransactions,
        categorySuggestions
    }
}
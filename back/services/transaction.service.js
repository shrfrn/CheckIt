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

async function getUncategorizedTransactions() {
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

    if (!mostFrequentTitle) return []

    // Get all uncategorized transactions with this title
    return db('transactions')
        .select('*')
        .where('title', mostFrequentTitle.title)
        .andWhere(qb => {
            qb.whereNull('category')
              .orWhere('category', '')
        })
        .orderBy('date', 'desc')
}

async function getCategorySuggestions(title) {
    return db('transactions')
        .select('category')
        .count('* as count')
        .where('title', title)
        .whereNotNull('category')
        .andWhere('category', '!=', '')
        .groupBy('category')
        .orderBy('count', 'desc')
}

async function getUncategorizedBatch() {
    const uncategorizedTransactions = await getUncategorizedTransactions()
    if (!uncategorizedTransactions.length) return { uncategorizedTransactions: [], categorySuggestions: [] }

    const categorySuggestions = await getCategorySuggestions(uncategorizedTransactions[0].title)

    return {
        uncategorizedTransactions,
        categorySuggestions
    }
}
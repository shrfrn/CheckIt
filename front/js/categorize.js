import { api, updateStatusMessage } from './utils.js'

// DOM Elements
const transactionsGrid = document.querySelector('.transactions-grid tbody')
const transactionCount = document.querySelector('.transaction-count')
const submitButton = document.querySelector('.submit-button')

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
        
        updates.push({
            id: parseInt(row.dataset.transactionId),
            category: select.value
        })
    })

    return updates
}

async function handleSubmit() {
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
            loadTransactions()
        }
    } catch (error) {
        alert('Error updating categories: ' + error.message)
        console.error('Update error:', error)
    }
}

async function loadTransactions() {
    try {
        const data = await api.getUncategorizedTransactions()
        renderTransactions(data)
    } catch (error) {
        updateStatusMessage('Error loading transactions: ' + error.message, 'error')
        console.error('Loading error:', error)
    }
}

// Event listeners
submitButton.addEventListener('click', handleSubmit)

// Initialize
loadTransactions() 
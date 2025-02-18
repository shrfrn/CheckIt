const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function createTransactionsList(transactions, category, month) {
    const container = document.querySelector('.transactions-list')
    container.innerHTML = ''

    // Sort transactions by amount in descending order
    const sortedTransactions = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    
    const list = document.createElement('ul')
    list.classList.add('transactions')
    
    sortedTransactions.forEach(t => {
        const item = document.createElement('li')
        item.classList.add('transaction-item')
        
        const date = new Date(t.date).toLocaleDateString()
        const comments = t.comments || ''
        const beneficiary = t.beneficiary || ''
        
        item.innerHTML = `
            <div class="transaction-main">
                <span class="transaction-date">${date}</span>
                <span class="transaction-title">${t.title}</span>
                <span class="transaction-amount">${Math.abs(t.amount).toFixed(2)}</span>
            </div>
            <div class="transaction-details">
                ${beneficiary ? `<span class="transaction-beneficiary">Beneficiary: ${beneficiary}</span>` : ''}
                ${comments ? `<span class="transaction-comments">Comments: ${comments}</span>` : ''}
            </div>
        `
        list.appendChild(item)
    })

    // Update dialog title with month and category
    const dialogTitle = document.querySelector('.dialog-title')
    dialogTitle.textContent = `${MONTHS[parseInt(month) - 1]} - ${category}`

    container.appendChild(list)
}

function initDialog() {
    const dialog = document.querySelector('.transactions-dialog')
    const closeButton = dialog.querySelector('.dialog-close')
    
    closeButton.addEventListener('click', () => {
        dialog.close()
    })

    // Close on click outside
    dialog.addEventListener('click', e => {
        if (e.target === dialog) {
            dialog.close()
        }
    })
}

async function handleCellClick(event, year) {
    const cell = event.target
    if (!cell.classList.contains('amount') || cell.classList.contains('grand-total')) return

    const row = cell.parentElement
    const category = row.cells[0].textContent
    if (row.classList.contains('totals-row')) return

    const columnIndex = Array.from(row.cells).indexOf(cell)
    if (columnIndex === row.cells.length - 1) return // Skip year total column

    const month = (columnIndex).toString().padStart(2, '0')
    
    try {
        const response = await fetch(`http://localhost:3000/api/transactions?year=${year}&month=${month}&category=${category}`)
        if (!response.ok) throw new Error('Failed to fetch transactions')
        
        const transactions = await response.json()
        
        createTransactionsList(transactions, category, month)
        
        const dialog = document.querySelector('.transactions-dialog')
        dialog.showModal()
    } catch (error) {
        console.error('Error loading transactions:', error)
    }
}

function initYearSelector() {
    const yearSelect = document.querySelector('.year-select')
    const currentYear = new Date().getFullYear()
    
    // Add last 5 years as options
    for (let year = currentYear; year >= currentYear - 4; year--) {
        const option = document.createElement('option')
        option.value = year
        option.textContent = year
        yearSelect.appendChild(option)
    }

    yearSelect.addEventListener('change', () => loadStats(yearSelect.value))

    // Set up the table click handler once
    const table = document.querySelector('.stats-table')
    table.addEventListener('click', e => handleCellClick(e, yearSelect.value))

    // Initialize the dialog
    initDialog()

    loadStats(currentYear)
}

async function loadStats(year) {
    try {
        const response = await fetch(`http://localhost:3000/api/stats/${year}`)
        if (!response.ok) throw new Error('Failed to fetch stats')
        
        const stats = await response.json()
        displayStats(stats)
    } catch (error) {
        console.error('Error loading stats:', error)
    }
}

function displayStats(stats) {
    const tbody = document.querySelector('.stats-body')
    tbody.innerHTML = ''

    const yearSelect = document.querySelector('.year-select')
    const selectedYear = yearSelect.value

    // Group by category
    const categoryMap = new Map()
    stats.forEach(stat => {
        if (!categoryMap.has(stat.category)) {
            categoryMap.set(stat.category, Array(12).fill(0))
        }
        categoryMap.get(stat.category)[parseInt(stat.month) - 1] = Math.abs(stat.total)
    })

    // Create rows
    categoryMap.forEach((monthlyTotals, category) => {
        const row = document.createElement('tr')
        
        // Add category name
        const categoryCell = document.createElement('td')
        categoryCell.textContent = category
        row.appendChild(categoryCell)

        // Add monthly totals
        let yearTotal = 0
        monthlyTotals.forEach(total => {
            const cell = document.createElement('td')
            cell.textContent = total.toFixed(2)
            cell.classList.add('amount')
            row.appendChild(cell)
            yearTotal += total
        })

        // Add year total
        const totalCell = document.createElement('td')
        totalCell.textContent = yearTotal.toFixed(2)
        totalCell.classList.add('amount', 'total')
        row.appendChild(totalCell)

        tbody.appendChild(row)
    })

    // Add totals row
    const totalsRow = document.createElement('tr')
    totalsRow.classList.add('totals-row')
    
    const totalLabel = document.createElement('td')
    totalLabel.textContent = 'Monthly Total'
    totalsRow.appendChild(totalLabel)

    let grandTotal = 0
    for (let month = 0; month < 12; month++) {
        const monthlyTotal = Array.from(categoryMap.values())
            .reduce((sum, amounts) => sum + amounts[month], 0)
        
        const cell = document.createElement('td')
        cell.textContent = monthlyTotal.toFixed(2)
        cell.classList.add('amount', 'total')
        totalsRow.appendChild(cell)
        grandTotal += monthlyTotal
    }

    const grandTotalCell = document.createElement('td')
    grandTotalCell.textContent = grandTotal.toFixed(2)
    grandTotalCell.classList.add('amount', 'grand-total')
    totalsRow.appendChild(grandTotalCell)

    tbody.appendChild(totalsRow)
}

initYearSelector() 
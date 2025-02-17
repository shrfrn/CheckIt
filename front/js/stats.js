const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
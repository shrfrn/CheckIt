// API calls
export const api = {
    uploadFile: async (file, type, encoding = 'utf-8') => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('encoding', encoding)

        const response = await fetch(`http://localhost:3000/api/upload/${type}`, {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message)
        }

        return response.json()
    },

    getAllTransactions: async () => {
        const response = await fetch('http://localhost:3000/api/transactions')
        if (!response.ok) {
            throw new Error('Failed to fetch transactions')
        }
        return response.json()
    },

    getUncategorizedTransactions: async () => {
        const response = await fetch('http://localhost:3000/api/uncategorized')
        if (!response.ok) {
            throw new Error('Failed to fetch uncategorized transactions')
        }
        return response.json()
    },

    updateCategories: async updates => {
        const response = await fetch('http://localhost:3000/api/transactions', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message)
        }

        return response.json()
    },

    getTransactionDetails: async id => {
        const response = await fetch(`http://localhost:3000/api/transactions/${id}`)
        if (!response.ok) {
            throw new Error('Failed to fetch transaction details')
        }
        return response.json()
    }
}

// UI utilities
export function updateStatusMessage(message, type) {
    const statusEl = document.querySelector('.status-message')
    if (statusEl) {
        statusEl.textContent = message
        statusEl.className = 'status-message ' + type
    }
} 
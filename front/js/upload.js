import { api, updateStatusMessage } from './utils.js'

// State management
const state = {
    fileData: null,
    sheetType: null,
    fileEncoding: 'utf-8'
}

// DOM utilities
function getFileInput() {
    return document.querySelector('.file-input')
}

function getTypeSelect() {
    return document.querySelector('.sheet-type-select')
}

function getProcessButton() {
    return document.querySelector('.process-button')
}

// UI updates
function updateProcessButton() {
    const button = getProcessButton()
    button.disabled = !(state.fileData && state.sheetType)
}

// Event handlers
function handleFileSelect() {
    const file = getFileInput().files[0]
    if (file) {
        // Set appropriate encoding for Hebrew CSV files
        if (file.name.toLowerCase().endsWith('.csv')) {
            state.fileEncoding = 'utf-8'
        }
        state.fileData = file
        updateProcessButton()
    }
}

function handleTypeSelect() {
    state.sheetType = getTypeSelect().value
    updateProcessButton()
}

async function handleProcess() {
    try {
        updateStatusMessage('Processing...', '')
        const result = await api.uploadFile(state.fileData, state.sheetType, state.fileEncoding)
        updateStatusMessage(`Successfully processed ${result.count} new transactions. Total records: ${result.totalRecords}`, 'success')
        
        // Reset form
        getFileInput().value = ''
        getTypeSelect().value = ''
        state.fileData = null
        state.sheetType = null
        updateProcessButton()
        
    } catch (err) {
        updateStatusMessage('Error processing file: ' + err.message, 'error')
        console.error('Processing error:', err)
    }
}

// Event listeners
getFileInput().addEventListener('change', handleFileSelect)
getTypeSelect().addEventListener('change', handleTypeSelect)
getProcessButton().addEventListener('click', handleProcess) 
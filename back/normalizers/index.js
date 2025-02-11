import XLSX from 'xlsx'

import { normalizeHapoalimStatement } from './hapoalimStatementNormalizer.js'
import { normalizeMcStatement } from './mcNormalizer.js'
import { normalizeMasterStatement } from './masterNormalizer.js'

const normalizers = {
    hapoalimStatement: normalizeHapoalimStatement,
    mcStatement: normalizeMcStatement,
    masterStatement: normalizeMasterStatement
}

export async function processSpreadsheet(buffer, sheetType, originalFileName) {
	let data
	
	if (originalFileName.toLowerCase().endsWith('.csv')) {
		const csvContent = buffer.toString('utf-8')
		data = csvContent
	} else {
		const workbook = XLSX.read(buffer, { type: 'buffer' })
		const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
		data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
	}

	const normalizer = normalizers[sheetType]
	if (!normalizer) {
		throw new Error('Unsupported sheet type')
	}

	const result = normalizer(data)
	if (!result || !result.length) {
		throw new Error('No data was normalized from the file')
	}

	return result
}
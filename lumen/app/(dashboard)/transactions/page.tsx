'use client'

import { useState } from 'react'
import UploadModal from './UploadModal'

export default function TransactionsPage() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Upload CSV
        </button>
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">No transactions yet — upload a CSV to get started</p>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}

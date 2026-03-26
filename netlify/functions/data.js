// ============================================================
// LAKESIDE FULFILLMENT — MONTY SUPPLEMENTS
// Single source of truth for all column names + billing rules
// If the sheet changes, update HERE only.
// ============================================================

module.exports = {

  // --- BILLING RULES ---
  BILLING: {
    BASE_RATE: 1.00,
    PREMIUM_RATE: 1.36,
    PREMIUM_UNIT_THRESHOLD: 3,        // 3+ units = premium
    PREMIUM_SKUS: ['TDS'],            // SKU codes that always bill at premium
  },

  // --- STOCK SHEET COLUMNS ---
  STOCK_COLS: {
    SKU:            'SKU',
    TITLE:          'Title',
    TOTAL_IN:       'Total In',
    TOTAL_OUT:      'Total Out',
    ADJUSTMENTS:    'Adjustments',
    ON_HAND:        'On Hand',
    REORDER_POINT:  'Reorder Point',
    BELOW_REORDER:  'Below Reorder?',
    LAST_7:         'Last 7 Days Out',
    LAST_30:        'Last 30 Days Out',
  },

  // --- INBOUND SHEET COLUMNS ---
  INBOUND_COLS: {
    DATE:       'Date',
    SKU:        'SKU',
    QTY_IN:     'Qty In',
    PO:         'PO / Tracking',
    NOTES:      'Notes',
  },

  // --- REQUIRED SHEETS (Apps Script will validate these exist) ---
  REQUIRED_SHEETS: ['API', 'Stock', 'Inbound'],

};

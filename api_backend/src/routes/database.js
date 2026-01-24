import express from 'express';

const router = express.Router();

// In-memory database for prototype (replace with actual database)
const database = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user', createdAt: new Date().toISOString() },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin', createdAt: new Date().toISOString() },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', createdAt: new Date().toISOString() }
  ],
  products: [
    { id: 1, name: 'Product A', price: 29.99, category: 'electronics', stock: 100 },
    { id: 2, name: 'Product B', price: 49.99, category: 'clothing', stock: 50 },
    { id: 3, name: 'Product C', price: 19.99, category: 'books', stock: 200 }
  ],
  orders: [
    { id: 1, userId: 1, productId: 1, quantity: 2, total: 59.98, status: 'completed', createdAt: new Date().toISOString() },
    { id: 2, userId: 2, productId: 2, quantity: 1, total: 49.99, status: 'pending', createdAt: new Date().toISOString() }
  ]
};

/**
 * GET /api/db/:table
 * Get all records from a table
 */
router.get('/:table', (req, res) => {
  try {
    const { table } = req.params;
    const { limit, offset, sort, order } = req.query;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found. Available tables: ${Object.keys(database).join(', ')}`
      });
    }

    let data = [...database[table]];

    // Sorting
    if (sort && data.length > 0 && data[0][sort] !== undefined) {
      data.sort((a, b) => {
        const aVal = a[sort];
        const bVal = b[sort];
        const direction = order === 'desc' ? -1 : 1;
        
        if (typeof aVal === 'string') {
          return direction * aVal.localeCompare(bVal);
        }
        return direction * (aVal - bVal);
      });
    }

    // Pagination
    const limitNum = limit ? parseInt(limit) : data.length;
    const offsetNum = offset ? parseInt(offset) : 0;
    const paginatedData = data.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      table,
      data: paginatedData,
      total: data.length,
      limit: limitNum,
      offset: offsetNum,
      count: paginatedData.length
    });
  } catch (error) {
    console.error('Database retrieval error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve data'
    });
  }
});

/**
 * GET /api/db/:table/:id
 * Get a single record by ID
 */
router.get('/:table/:id', (req, res) => {
  try {
    const { table, id } = req.params;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found`
      });
    }

    const record = database[table].find(item => item.id === parseInt(id));

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Record with id ${id} not found in table "${table}"`
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Database retrieval error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve record'
    });
  }
});

/**
 * POST /api/db/:table
 * Create a new record
 */
router.post('/:table', (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found`
      });
    }

    // Generate ID if not provided
    const maxId = database[table].length > 0
      ? Math.max(...database[table].map(item => item.id || 0))
      : 0;

    const newRecord = {
      id: maxId + 1,
      ...data,
      createdAt: new Date().toISOString()
    };

    database[table].push(newRecord);

    res.status(201).json({
      success: true,
      message: 'Record created',
      data: newRecord
    });
  } catch (error) {
    console.error('Database creation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create record'
    });
  }
});

/**
 * PUT /api/db/:table/:id
 * Update a record
 */
router.put('/:table/:id', (req, res) => {
  try {
    const { table, id } = req.params;
    const updates = req.body;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found`
      });
    }

    const recordIndex = database[table].findIndex(item => item.id === parseInt(id));

    if (recordIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Record with id ${id} not found`
      });
    }

    database[table][recordIndex] = {
      ...database[table][recordIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Record updated',
      data: database[table][recordIndex]
    });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update record'
    });
  }
});

/**
 * DELETE /api/db/:table/:id
 * Delete a record
 */
router.delete('/:table/:id', (req, res) => {
  try {
    const { table, id } = req.params;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found`
      });
    }

    const recordIndex = database[table].findIndex(item => item.id === parseInt(id));

    if (recordIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Record with id ${id} not found`
      });
    }

    const deletedRecord = database[table].splice(recordIndex, 1)[0];

    res.json({
      success: true,
      message: 'Record deleted',
      data: deletedRecord
    });
  } catch (error) {
    console.error('Database deletion error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete record'
    });
  }
});

/**
 * GET /api/db/:table/search
 * Search records (query parameter based)
 */
router.get('/:table/search', (req, res) => {
  try {
    const { table } = req.params;
    const query = req.query;

    if (!database[table]) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table "${table}" not found`
      });
    }

    let results = database[table].filter(record => {
      return Object.keys(query).every(key => {
        const recordValue = String(record[key]).toLowerCase();
        const queryValue = String(query[key]).toLowerCase();
        return recordValue.includes(queryValue);
      });
    });

    res.json({
      success: true,
      table,
      query,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Database search error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search records'
    });
  }
});

/**
 * GET /api/db/tables
 * List all available tables
 */
router.get('/tables/list', (req, res) => {
  try {
    const tables = Object.keys(database).map(table => ({
      name: table,
      recordCount: database[table].length,
      sampleFields: database[table].length > 0
        ? Object.keys(database[table][0])
        : []
    }));

    res.json({
      success: true,
      tables,
      total: tables.length
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tables'
    });
  }
});

export { router as databaseRouter };

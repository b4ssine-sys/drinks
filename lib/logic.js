const { v4: uuidv4 } = require('uuid');

function createEntry(person, beverage, loggedBy) {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    person,
    beverage,
    logged_by: loggedBy,
  };
}

module.exports = { createEntry };

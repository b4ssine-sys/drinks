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

function getDailySummary(entries) {
  const summary = {};
  for (const entry of entries) {
    if (!summary[entry.person]) {
      summary[entry.person] = { total: 0, beverages: {} };
    }
    summary[entry.person].total++;
    summary[entry.person].beverages[entry.beverage] =
      (summary[entry.person].beverages[entry.beverage] || 0) + 1;
  }
  return summary;
}

function getPersonSummary(entries, personId) {
  const personEntries = entries.filter((e) => e.person === personId);
  const beverages = {};
  for (const entry of personEntries) {
    beverages[entry.beverage] = (beverages[entry.beverage] || 0) + 1;
  }
  return { total: personEntries.length, beverages };
}

module.exports = { createEntry, getDailySummary, getPersonSummary };

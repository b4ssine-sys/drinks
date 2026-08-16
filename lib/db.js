// Database layer — connect to Aiven PostgreSQL and expose query functions.
// Requires DATABASE_URL env var with the Aiven connection string.
//
// Suggested exports:
//   initialize()        — create tables if not exist
//   getAllPeople()       — SELECT * FROM people
//   addPerson(...)      — INSERT INTO people
//   removePerson(id)    — DELETE FROM people
//   addDrink(...)       — INSERT INTO drinks
//   getTodayDrinks()    — SELECT drinks from today
//   getDrinksByDate(d)  — SELECT drinks for a given date

module.exports = {};

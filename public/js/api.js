const API = {
  async getPeople() {
    const res = await fetch('/api/people');
    return res.json();
  },

  async addPerson(id, name, avatar, defaultBev) {
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, avatar, default_bev: defaultBev }),
    });
    return res.json();
  },

  async removePerson(id) {
    const res = await fetch(`/api/people/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  },

  async getTodayDrinks() {
    const res = await fetch('/api/drinks/today');
    return res.json();
  },

  async logDrink(person, beverage, loggedBy) {
    const res = await fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person, beverage, logged_by: loggedBy }),
    });
    return res.json();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const peopleGrid = document.getElementById('people-grid');
  const feedList = document.getElementById('feed-list');
  const btnAddPerson = document.getElementById('btn-add-person');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  let people = [];
  let drinks = [];

  const BEVERAGES = ['coffee', 'refresher', 'tea', 'water', 'soda', 'juice', 'energy drink', 'other'];

  function connectWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}`);

    ws.addEventListener('message', (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === 'drink_logged') {
        drinks.unshift(data.drink);
        renderFeed();
        renderPeople();
      } else if (data.type === 'person_added') {
        const idx = people.findIndex((p) => p.id === data.person.id);
        if (idx >= 0) people[idx] = data.person;
        else people.push(data.person);
        renderPeople();
      } else if (data.type === 'person_removed') {
        people = people.filter((p) => p.id !== data.id);
        drinks = drinks.filter((d) => d.person !== data.id);
        renderPeople();
        renderFeed();
      }
    });

    ws.addEventListener('close', () => {
      setTimeout(connectWebSocket, 2000);
    });
  }

  function countForPerson(personId) {
    return drinks.filter((d) => d.person === personId).length;
  }

  function beverageCounts(personId) {
    const counts = {};
    for (const d of drinks) {
      if (d.person !== personId) continue;
      counts[d.beverage] = (counts[d.beverage] || 0) + 1;
    }
    return counts;
  }

  function renderPeople() {
    if (people.length === 0) {
      peopleGrid.innerHTML = '<p class="empty-msg">No people added yet. Tap + to add someone.</p>';
      return;
    }

    peopleGrid.innerHTML = people.map((p) => {
      const total = countForPerson(p.id);
      const bevs = beverageCounts(p.id);
      const bevList = Object.entries(bevs)
        .map(([b, c]) => `<span class="bev-tag">${b} x${c}</span>`)
        .join('');

      return `
        <div class="person-card" data-person-id="${p.id}">
          <div class="card-avatar">${p.avatar || p.name.charAt(0).toUpperCase()}</div>
          <div class="card-name">${p.name}</div>
          <div class="card-count">${total}</div>
          <div class="card-bevs">${bevList}</div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.person-card').forEach((card) => {
      card.addEventListener('click', () => showBeveragePicker(card.dataset.personId));
    });
  }

  function renderFeed() {
    if (drinks.length === 0) {
      feedList.innerHTML = '<p class="feed-empty">No drinks logged today</p>';
      return;
    }

    feedList.innerHTML = drinks.slice(0, 50).map((d) => {
      const person = people.find((p) => p.id === d.person);
      const name = person ? person.name : d.person;
      const time = new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="feed-item">
          <span class="feed-time">${time}</span>
          <span class="feed-text"><strong>${name}</strong> drank <em>${d.beverage}</em></span>
          <span class="feed-by">logged by ${d.logged_by}</span>
        </div>
      `;
    }).join('');
  }

  function showModal(title, bodyHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalOverlay.classList.add('active');
  }

  function hideModal() {
    modalOverlay.classList.remove('active');
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
  });

  function showBeveragePicker(personId) {
    const person = people.find((p) => p.id === personId);
    if (!person) return;

    const btns = BEVERAGES.map((b) =>
      `<button class="bev-btn" data-bev="${b}">${b}</button>`
    ).join('');

    showModal(`LOG DRINK FOR ${person.name.toUpperCase()}`, `
      <div class="bev-picker">${btns}</div>
    `);

    document.querySelectorAll('.bev-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        hideModal();
        await API.logDrink(personId, btn.dataset.bev, 'anonymous');
      });
    });
  }

  btnAddPerson.addEventListener('click', () => {
    showModal('ADD PERSON', `
      <form id="add-person-form">
        <input class="modal-input" type="text" name="name" placeholder="Name" required>
        <input class="modal-input" type="text" name="avatar" placeholder="Emoji avatar (optional)" maxlength="2">
        <button class="btn-submit" type="submit">ADD</button>
      </form>
    `);

    document.getElementById('add-person-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '-');
      const avatar = form.avatar.value.trim();
      hideModal();
      await API.addPerson(id, name, avatar);
    });
  });

  async function init() {
    try {
      [people, drinks] = await Promise.all([API.getPeople(), API.getTodayDrinks()]);
    } catch (err) {
      peopleGrid.innerHTML = '<p class="empty-msg">Could not connect to server.</p>';
      feedList.innerHTML = '<p class="feed-empty">Could not connect to server.</p>';
      return;
    }
    renderPeople();
    renderFeed();
    connectWebSocket();
  }

  init();
});

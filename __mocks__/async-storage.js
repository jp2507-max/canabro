const store = new Map();
export default {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => { store.set(k, v); },
  removeItem: async (k) => { store.delete(k); },
  clear: async () => { store.clear(); },
};


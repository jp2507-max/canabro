const store = new Map();
 
const getItem = async (k) => (store.has(k) ? store.get(k) : null);
const setItem = async (k, v) => { store.set(k, v); };
const removeItem = async (k) => { store.delete(k); };
const clear = async () => { store.clear(); };

export { getItem, setItem, removeItem, clear };

export default {
  getItem,
  setItem,
  removeItem,
  clear,
};


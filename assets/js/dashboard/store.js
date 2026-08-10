(function () {
  const STORAGE_KEY = 'menuflow_dashboard_v1';

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function seedFromDemo() {
    const demo = window.MenuFlowMenuData;
    const restaurant = demo
      ? JSON.parse(JSON.stringify(demo.restaurant))
      : {
          name: 'My Restaurant',
          logoText: 'M',
          type: 'Restaurant',
          description: '',
          address: '',
          phone: '',
          whatsapp: '',
          instagram: '',
          openingStatus: 'Open today',
          hours: [],
          allergenNotice: '',
        };
    const sections = demo ? JSON.parse(JSON.stringify(demo.sections)) : [];
    return {
      restaurant,
      sections,
      selectedTemplate: 'atelier',
      theme: {},
      meta: { createdAt: Date.now(), visitedQr: false, customizedDesign: false },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedFromDemo();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.restaurant || !Array.isArray(parsed.sections)) return seedFromDemo();
      parsed.theme = parsed.theme || {};
      parsed.meta = parsed.meta || { createdAt: Date.now(), visitedQr: false, customizedDesign: false };
      return parsed;
    } catch (error) {
      return seedFromDemo();
    }
  }

  let state = load();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* storage unavailable (private mode, quota) — state still works in-memory for this page view */
    }
    document.dispatchEvent(new CustomEvent('menuflow:state-changed', { detail: state }));
  }

  function getState() {
    return state;
  }

  function setState(updater) {
    state = typeof updater === 'function' ? updater(state) : Object.assign({}, state, updater);
    persist();
    return state;
  }

  function reset() {
    state = seedFromDemo();
    persist();
    return state;
  }

  function addSection(section) {
    setState(s => ({
      ...s,
      sections: [
        ...s.sections,
        Object.assign({ id: uid('section'), order: s.sections.length + 1, items: [] }, section),
      ],
    }));
  }

  function updateSection(id, patch) {
    setState(s => ({
      ...s,
      sections: s.sections.map(sec => (sec.id === id ? Object.assign({}, sec, patch) : sec)),
    }));
  }

  function deleteSection(id) {
    setState(s => ({ ...s, sections: s.sections.filter(sec => sec.id !== id) }));
  }

  function addItem(sectionId, item) {
    setState(s => ({
      ...s,
      sections: s.sections.map(sec =>
        sec.id === sectionId
          ? Object.assign({}, sec, {
              items: [
                ...sec.items,
                Object.assign({ id: uid('item'), dietary: [], available: true, featured: false }, item),
              ],
            })
          : sec
      ),
    }));
  }

  function updateItem(sectionId, itemId, patch) {
    setState(s => ({
      ...s,
      sections: s.sections.map(sec =>
        sec.id === sectionId
          ? Object.assign({}, sec, {
              items: sec.items.map(it => (it.id === itemId ? Object.assign({}, it, patch) : it)),
            })
          : sec
      ),
    }));
  }

  function deleteItem(sectionId, itemId) {
    setState(s => ({
      ...s,
      sections: s.sections.map(sec =>
        sec.id === sectionId ? Object.assign({}, sec, { items: sec.items.filter(it => it.id !== itemId) }) : sec
      ),
    }));
  }

  window.MenuFlowStore = {
    getState,
    setState,
    reset,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    uid,
  };
})();

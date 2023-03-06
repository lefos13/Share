import { createStore } from "vuex";

// Create a new store instance.
const store = createStore({
  state() {
    return {
      count: 0,
      isLoggedIn: true,
      loginPrompt: false,
    };
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    loginPrompt(state, data) {
      state.loginPrompt = data;
    },
    isLoggedIn(state, data) {
      state.isLoggedIn = data;
    },
  },
});

export default store;

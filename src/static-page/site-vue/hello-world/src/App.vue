<template>
  <div>
    <!-- Navigation-->
    <NavBarUp msg="Welcome to Your Vue.js App" v-if="true" />
    <!-- Preview page-->
    <Home v-if="showPreview" />
    <!-- Footer-->
    <Footer />
  </div>

  <div id="overlays">
    <ContactFormVue />
    <LoginPrompt v-if="loginPrompt" />
  </div>
</template>

<script>
import NavBarUp from "./components/Static-Modules/NavBarUp.vue";
import Footer from "./components/Static-Modules/Footer.vue";
import ContactFormVue from "./components/Modals/ContactForm.vue";
import Home from "./components/MajorPages/Home.vue";
import LoginPrompt from "./components/Modals/LoginPrompt.vue";

export default {
  name: "App",
  components: {
    NavBarUp,
    Footer,
    ContactFormVue,
    Home,
    LoginPrompt,
  },
  computed: {
    showPreview() {
      return true;
    },
    loginPrompt() {
      return this.$store.state.loginPrompt;
    },
  },
  methods: {},
};
</script>
<style>
@import "../public/css/styles.css";
</style>

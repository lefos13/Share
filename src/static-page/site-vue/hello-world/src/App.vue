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
  </div>
</template>

<script>
import NavBarUp from "./components/Static-Modules/NavBarUp.vue";
import Footer from "./components/Static-Modules/Footer.vue";
import ContactFormVue from "./components/Modals/ContactForm.vue";
import Home from "./components/MajorPages/Home.vue";

export default {
  name: "App",
  components: {
    NavBarUp,
    Footer,
    ContactFormVue,
    Home,
  },
  computed: {
    showPreview() {
      return true;
    },
  },
};
</script>
<style>
/* @import "../public/app.css"; */
</style>
<style></style>

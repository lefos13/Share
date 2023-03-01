<template>
  <div class="container">
    <div class="logo"></div>
  </div>
  <!-- Navigation-->
  <NavBarUp msg="Welcome to Your Vue.js App" />
  <!-- Mashead header-->
  <Header />
  <!-- Quote/testimonial aside-->
  <Strip />
  <!-- App features section-->
  <Features />
  <!-- Basic features section-->
  <BasicFeatures />
  <!-- Call to action section-->
  <Action />
  <!-- App badge section-->
  <AppBudge />
  <!-- Footer-->
  <Footer />
  <div id="overlays">
    <ContactFormVue />
  </div>
</template>

<script>
import NavBarUp from "./components/NavBarUp.vue";
import Header from "./components/Header.vue";
import Strip from "./components/Strip.vue";
import Features from "./components/Features.vue";
import BasicFeatures from "./components/BasicFeatures.vue";
import Action from "./components/Action.vue";
import AppBudge from "./components/AppBudge.vue";
import Footer from "./components/Footer.vue";
import ContactFormVue from "./components/Modals/ContactForm.vue";

export default {
  name: "App",
  components: {
    NavBarUp,
    Header,
    Strip,
    Features,
    BasicFeatures,
    Action,
    AppBudge,
    Footer,
    ContactFormVue,
  },
};
</script>
<style>
/* @import "../public/app.css"; */
</style>
<style></style>

<template>
  <div class="preview-page">
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
  </div>
</template>

<script>
import Header from "../Preview/Header.vue";
import Strip from "../Preview/Strip.vue";
import Features from "../Preview/Features.vue";
import BasicFeatures from "../Preview/BasicFeatures.vue";
import Action from "../Preview/Action.vue";
import AppBudge from "../Preview/AppBudge.vue";

export default {
  name: "Home-vue",
  components: {
    Header,
    Strip,
    Features,
    BasicFeatures,
    Action,
    AppBudge,
  },
  props: {
    msg: String,
  },
  methods: {},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>

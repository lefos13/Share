<template>
  <section class="cta">
    <div class="cta-content">
      <div class="container px-5">
        <h2 class="text-white display-1 lh-1 mb-4">
          Μοιράσου το ταξίδι σου.
          <br />
          Προστάτεψε το περιβάλλον.
        </h2>
        <a
          class="btn btn-outline-light py-3 px-4 rounded-pill"
          href="https://play.google.com/store/apps/details?id=com.shareridenew"
          target="_blank"
          >Κατέβασέ το τώρα</a
        >
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "Strip-vue",
  props: {
    msg: String,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>

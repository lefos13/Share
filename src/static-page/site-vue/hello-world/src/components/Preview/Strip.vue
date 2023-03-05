<template>
  <aside class="text-center bg-gradient-primary-to-secondary">
    <div class="container px-5">
      <div class="row gx-5 justify-content-center">
        <div class="col-xl-8">
          <div class="h2 fs-1 text-white mb-4">
            "Μία εφαρμογή που καιρό τώρα ο κόσμος ζητάει στην Ελλάδα! Είναι
            επιτέλους κοντά μας!"
          </div>
          <img
            src="../../assets/img/tnw-logo.png"
            alt="..."
            style="height: 3rem"
          />
        </div>
      </div>
    </div>
  </aside>
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

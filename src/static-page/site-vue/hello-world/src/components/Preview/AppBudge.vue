<template>
  <section class="bg-gradient-primary-to-secondary" id="download">
    <div class="container px-5">
      <h2 class="text-center text-white font-alt mb-4">
        Είναι δικό σου με ένα κλικ!
      </h2>
      <div
        class="d-flex flex-column flex-lg-row align-items-center justify-content-center"
      >
        <a
          class="me-lg-3 mb-4 mb-lg-0"
          href="https://play.google.com/store/apps/details?id=com.shareridenew"
          target="_blank"
          ><img
            class="app-badge"
            src="../../assets/img/google-play-badge.svg"
            alt="..."
          />
        </a>
        <a
          href="https://apps.apple.com/gr/app/ouride/id6446164725"
          target="_blank"
        >
          <img
            class="app-badge"
            src="../../assets/img/app-store-badge.svg"
            alt="..."
          />
        </a>
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

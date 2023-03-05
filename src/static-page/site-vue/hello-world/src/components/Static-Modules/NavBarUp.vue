<template>
  <div class="navbar">
    <nav
      class="navbar navbar-expand-lg navbar-light fixed-top shadow-sm"
      id="mainNav"
    >
      <div class="container px-5">
        <a class="navbar-brand fw-bold" href="#page-top">Ouride</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarResponsive"
          aria-controls="navbarResponsive"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          Menu
          <i class="bi-list"></i>
        </button>
        <div class="collapse navbar-collapse" id="navbarResponsive">
          <ul class="navbar-nav ms-auto me-4 my-3 my-lg-0">
            <li class="nav-item">
              <a class="nav-link me-lg-3" href="#features">Λειτουργίες</a>
            </li>
            <li class="nav-item">
              <a class="nav-link me-lg-3" href="#download">Download</a>
            </li>
          </ul>
          <!-- Forma epikoinwnias -->
          <button
            class="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0"
            data-bs-toggle="modal"
            data-bs-target="#feedbackModal"
          >
            <span class="d-flex align-items-center">
              <i class="bi-chat-text-fill me-2"></i>
              <span class="small">Φόρμα επικοινωνίας</span>
            </span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<script>
export default {
  name: "NavbarUp",
  props: {
    msg: String,
  },
  created() {
    // const mainNav = document.body.querySelector("#mainNav");
    // if (mainNav) {
    //   new bootstrap.ScrollSpy(document.body, {
    //     target: "#mainNav",
    //     offset: 74,
    //   });
    // }
    // const navbarToggler = document.body.querySelector(".navbar-toggler");
    // const responsiveNavItems = [].slice.call(
    //   document.querySelectorAll("#navbarResponsive .nav-link")
    // );
    // responsiveNavItems.map(function (responsiveNavItem) {
    //   responsiveNavItem.addEventListener("click", () => {
    //     if (window.getComputedStyle(navbarToggler).display !== "none") {
    //       navbarToggler.click();
    //     }
    //   });
    // });
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>

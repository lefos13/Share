<template>
  <div>
    <div class="nav-menu">
      <!-- // Menu container -->
      <i class="fas fa-bars" @click="showMenu()">
        <img
          class="mobile-ham-icon"
          src="../../assets/Hamburger_icon.svg.png"
          alt=""
        />
      </i>
      <div
        class="nav-content"
        :class="this.showMobileMenu ? 'open-menu' : 'closed-menu'"
      >
        <!-- // Menu content -->
        <div class="logo_title" @click="top()">
          <div class="logo">
            <img
              class="mobile-ham-icon"
              src="../../assets/tnw-logo.png"
              alt=""
            />
          </div>
          <div class="title-nav"><h2>Ouride</h2></div>
        </div>
        <!-- // Here can be a logo -->
        <ul class="nav-items">
          <li><a href="#download">Download</a></li>
          <li><a href="#features">Λειτουργίες</a></li>

          <li>
            <div class="register-button">
              <a v-if="!isLoggedIn" href="#login" @click="loginPrompt()"
                >Εγγραφή</a
              >
            </div>
          </li>
          <li>
            <div class="login-button">
              <a v-if="!isLoggedIn" href="#login" @click="loginPrompt()"
                >Είσοδος</a
              >
            </div>
          </li>
          <div class="feedback">
            <button
              class="btn btn-primary rounded-pill px-3 mb-2 mb-lg-0"
              data-bs-toggle="modal"
              data-bs-target="#feedbackModal"
            >
              <span class="d-flex align-items-center">
                <i
                  class="bi-chat-text-fill me-2"
                  style="display: block; padding: 0px"
                ></i>
                <span class="small">Φόρμα επικοινωνίας</span>
              </span>
            </button>
          </div>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "NavbarUp",
  props: {
    msg: String,
  },
  data() {
    return {
      showMobileMenu: false,
    };
  },
  computed: {
    isLoggedIn() {
      return this.$store.state.isLoggedIn;
    },
  },
  methods: {
    showMenu() {
      this.showMobileMenu = !this.showMobileMenu;
    },
    loginPrompt() {
      this.$store.commit("loginPrompt", true);
    },
    top() {
      window.scrollTo(0, 0);
    },
  },
  created() {
    // console.log(this.loginPrompt());
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.nav-menu {
  background-color: white;
  // display: flex;
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  right: 0;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
}
.nav-content {
  display: flex;
  justify-content: space-between;
  padding: 10px 30px;
  align-items: center;
  margin-left: 15%;
  margin-right: 15%;
}
.nav-items {
  display: flex;
  justify-content: center;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    padding: 0 10px;
  }
  a {
    color: black;
    text-decoration: none;
    padding: 10px;
  }
  a:hover {
    color: #2937f0;
  }
}
i {
  display: none;
}
.mobile-ham-icon {
  // display: flex;
  height: 50px;
  width: 50px;
}
.logo_title {
  cursor: pointer;
  display: flex;
  justify-content: center;
  .logo {
    background-color: #2937f0;
    border-radius: 50%;
    margin: auto;
  }
}

.title-nav {
  margin-top: 13px;
}

// Mobile version - hidden hamburger menu
@media screen and (max-width: 768px) {
  .nav-menu {
    padding-top: 10px;
    position: fixed;
    width: 100%;
  }
  .open-menu {
    opacity: 1;
    height: 100%;
  }
  .closed-menu {
    opacity: 0;
    height: 0;
    padding: 0;
  }
  .nav-content {
    flex-direction: column;
    gap: 15px;
    z-index: 100;
    position: relative;
    transition: all 0.2s ease-out;
  }
  .nav-items {
    flex-direction: column;
    gap: 5px;
    // padding: 10px;
  }
  i {
    display: block;
    text-align: right;
    padding: 0 10px 10px 0;
  }
}
</style>

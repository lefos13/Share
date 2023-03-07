<template>
  <div class="login">
    <div id="myModal" class="modal">
      <!-- Modal content -->
      <div class="modal-content">
        <div class="modal-header">
          <h2>Φόρμα εισόδου</h2>
          <span class="close" @click="close()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="imgcontainer">
            <img src="../../assets/tnw-logo.png" alt="Avatar" class="avatar" />
          </div>

          <div class="container">
            <label for="uname"><b>Email</b></label>
            <input
              type="text"
              placeholder="example@email.com"
              name="uname"
              required
            />

            <label for="psw"><b>Κωδικός</b></label>
            <input
              type="password"
              placeholder="Κωδικός πρόσβασης"
              name="psw"
              v-on:keyup.enter="onEnter()"
              required
            />

            <button @click="login()">Είσοδος</button>
            <span class="psw">Forgot <a href="#">password?</a></span>
            <!-- <label>
              <input type="checkbox" checked="checked" name="remember" />
              Remember me
            </label> -->
          </div>
        </div>
        <div class="modal-footer"></div>
      </div>
    </div>
  </div>
</template>

<script>
// import axios from "axios";
export default {
  name: "LoginForm-vue",
  props: {
    msg: String,
  },
  methods: {
    login() {
      this.$store.commit("loginPrompt", false);
    },
    close() {
      this.$store.commit("loginPrompt", false);
    },
    onEnter() {
      this.login();
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.modal {
  display: block; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 9999; /* Sit on top */
  padding-top: 100px; /* Location of the box */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0, 0, 0); /* Fallback color */
  background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
}

/* Modal Content */
.modal-content {
  position: relative;
  background-color: #fefefe;
  margin: auto;
  padding: 0;
  border: 1px solid #888;
  width: 60%;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  -webkit-animation-name: animatetop;
  -webkit-animation-duration: 0.4s;
  animation-name: animatetop;
  animation-duration: 0.4s;
}

/* Add Animation */
@-webkit-keyframes animatetop {
  from {
    top: -300px;
    opacity: 0;
  }
  to {
    top: 0;
    opacity: 1;
  }
}

@keyframes animatetop {
  from {
    top: -300px;
    opacity: 0;
  }
  to {
    top: 0;
    opacity: 1;
  }
}

/* The Close Button */
.close {
  color: white;
  float: right;
  font-size: 28px;
  font-weight: bold;
  padding: 0.4rem;
}

.close:hover,
.close:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
}

.modal-header {
  padding: 2px 16px;
  background: linear-gradient(45deg, #156efd, #95bdfd);
  color: white;
}
h2 {
  padding-top: 15px;
}

.modal-body {
  padding: 10px 16px;
}

.modal-footer {
  padding: 10px 16px;
  background: linear-gradient(45deg, #156efd, #95bdfd);
  color: white;
}
</style>
<style scoped>
@import "../../../public/css/login.css";
</style>

<template>
  <section id="features">
    <div class="container px-5">
      <div class="row gx-5 align-items-center">
        <div class="col-lg-8 order-lg-1 mb-5 mb-lg-0">
          <div class="container-fluid px-5">
            <div class="row gx-5">
              <div class="col-md-6 mb-5">
                <!-- Feature item-->
                <div class="text-center">
                  <i
                    class="bi-phone icon-feature text-gradient d-block mb-3"
                  ></i>
                  <h3 class="font-alt">Ειδοποιήσεις</h3>
                  <p class="text-muted mb-0">
                    Δεν βρήκες την διαδρομής που έψαχνες; Με το πάτημα ενός
                    κουμπιού λαμβάνεις ειδοποιήσεις για όποιες διαδρομές θες!
                  </p>
                </div>
              </div>
              <div class="col-md-6 mb-5">
                <!-- Feature item-->
                <div class="text-center">
                  <i
                    class="bi-star icon-feature text-gradient d-block mb-3"
                  ></i>
                  <h3 class="font-alt">Αξιολογήσεις</h3>
                  <p class="text-muted mb-0">
                    Πραγματοποίησες μία διαδρομή με κάποιον χρήστη; Αξιολόγησέ
                    τον ώστε να ενημερωθεί η κοινότητα για την εμπειρία σου.
                  </p>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6 mb-5 mb-md-0">
                <!-- Feature item-->
                <div class="text-center">
                  <i
                    class="bi-chat icon-feature text-gradient d-block mb-3"
                  ></i>
                  <h3 class="font-alt">Συνομιλίες</h3>
                  <p class="text-muted mb-0">
                    Μόλις λάβεις έγκριση ως επιβάτης ή εγκρίνεις κάποιον ως
                    οδηγός, μπορείς να συνομιλήσεις μαζί του ελεύθερα δίχως
                    περιορισμούς.
                  </p>
                </div>
              </div>
              <div class="col-md-6">
                <!-- Feature item-->
                <div class="text-center">
                  <i
                    class="bi-gift icon-feature text-gradient d-block mb-3"
                  ></i>
                  <h3 class="font-alt">Δωρεάν</h3>
                  <p class="text-muted mb-0">
                    Όλες οι υπηρεσίες της εφαρμογής είναι απολύτως δωρεάν.
                    Κατέβασε το Ouride και απόλαυσε τα πάντα στο 100%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-4 order-lg-0">
          <!-- Features section device mockup-->
          <div class="features-device-mockup">
            <svg
              class="circle"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="circleGradient"
                  gradientTransform="rotate(45)"
                >
                  <stop class="gradient-start-color" offset="0%"></stop>
                  <stop class="gradient-end-color" offset="100%"></stop>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <svg
              class="shape-1 d-none d-sm-block"
              viewBox="0 0 240.83 240.83"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="-32.54"
                y="78.39"
                width="305.92"
                height="84.05"
                rx="42.03"
                transform="translate(120.42 -49.88) rotate(45)"
              ></rect>
              <rect
                x="-32.54"
                y="78.39"
                width="305.92"
                height="84.05"
                rx="42.03"
                transform="translate(-49.88 120.42) rotate(-45)"
              ></rect>
            </svg>
            <svg
              class="shape-2 d-none d-sm-block"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="50"></circle>
            </svg>
            <div class="device-wrapper">
              <div
                class="device"
                data-device="iPhoneX"
                data-orientation="portrait"
                data-color="black"
              >
                <div class="screen bg-black">
                  <!-- PUT CONTENTS HERE:-->
                  <!-- * * This can be a video, image, or just about anything else.-->
                  <!-- * * Set the max width of your media to 100% and the height to-->
                  <!-- * * 100% like the demo example below.-->
                  <!-- <video
                      muted="muted"
                      autoplay=""
                      loop=""
                      style="max-width: 100%; height: 100%"
                    >
                      <source
                        src="assets/img/demo-screen.mp4"
                        type="video/mp4"
                      />
                    </video> -->
                  <img
                    src="../../assets/img/demo-screen1.png"
                    style="max-width: 100%; height: 100%"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script>
export default {
  name: "Features-vue",
  props: {
    msg: String,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>

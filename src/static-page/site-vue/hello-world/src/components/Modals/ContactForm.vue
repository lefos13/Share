<template>
  <div
    class="modal fade"
    id="feedbackModal"
    tabindex="-1"
    aria-labelledby="feedbackModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-gradient-primary-to-secondary p-4">
          <h5 class="modal-title font-alt text-white" id="feedbackModalLabel">
            Φόρμα επικοινωνίας
          </h5>
          <button
            class="btn-close btn-close-white"
            type="button"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body border-0 p-4">
          <!-- * * * * * * * * * * * * * * *-->
          <!-- * * SB Forms Contact Form * *-->
          <!-- * * * * * * * * * * * * * * *-->
          <!-- This form is pre-integrated with SB Forms.-->
          <!-- To make this form functional, sign up at-->
          <!-- https://startbootstrap.com/solution/contact-forms-->
          <!-- to get an API token!-->
          <form id="contactForm" data-sb-form-api-token="API_TOKEN">
            <!-- Name input-->
            <div class="form-floating mb-3">
              <input
                class="form-control"
                id="name"
                type="text"
                placeholder="Ονοματεπώνυμο"
                data-sb-validations="required"
              />
              <label for="name">Ονοματεπώνυμο</label>
              <div class="invalid-feedback" data-sb-feedback="name:required">
                Το ονοματεπώνυμο είναι απαραίτητο.
              </div>
            </div>
            <!-- Email address input-->
            <div class="form-floating mb-3">
              <input
                class="form-control"
                id="email"
                type="email"
                placeholder="name@example.com"
                data-sb-validations="required,email"
              />
              <label for="email">Διεύθυνση email</label>
              <div class="invalid-feedback" data-sb-feedback="email:required">
                Το email είναι απαραίτητο.
              </div>
              <div class="invalid-feedback" data-sb-feedback="email:email">
                Το email είναι λανθασμένο.
              </div>
            </div>
            <!-- Phone number input-->
            <div class="form-floating mb-3">
              <input
                class="form-control"
                id="phone"
                type="tel"
                placeholder="(123) 456-7890"
                data-sb-validations="required"
              />
              <label for="phone">Κινητό τηλέφωνο</label>
              <div class="invalid-feedback" data-sb-feedback="phone:required">
                Το κινητό τηλέφωνο είναι απαραίτητο.
              </div>
            </div>
            <!-- Message input-->
            <div class="form-floating mb-3">
              <textarea
                class="form-control"
                id="message"
                type="text"
                placeholder="Enter your message here..."
                style="height: 10rem"
                data-sb-validations="required"
              ></textarea>
              <label for="message">Μήνυμα</label>
              <div class="invalid-feedback" data-sb-feedback="message:required">
                Το μήνυμα είναι απαραίτητο.
              </div>
            </div>
            <!-- Submit success message-->
            <!---->
            <!-- This is what your users will see when the form-->
            <!-- has successfully submitted-->
            <div class="d-none" id="submitSuccessMessage">
              <div class="text-center mb-3">
                <div class="fw-bolder">Η αναφορά στάλθηκε επιτυχώς!</div>
              </div>
            </div>
            <!-- Submit error message-->
            <!---->
            <!-- This is what your users will see when there is-->
            <!-- an error submitting the form-->
            <div class="d-none" id="submitErrorMessage">
              <div class="text-center text-danger mb-3">Κάτι πήγε στραβά!</div>
            </div>
            <!-- Submit Button-->
            <div class="d-grid">
              <button
                class="btn btn-primary rounded-pill btn-lg disabled"
                id="submitButton"
                onclick="sendReport()"
              >
                Αποστολή
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ContactForm-vue",
  props: {
    msg: String,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>

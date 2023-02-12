import axios from "axios"

export default class registrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector('#registration-form')
        this.allFields = document.querySelectorAll('#registration-form .form-control')
        this.insertValidationElements()
        this.username = document.querySelector('#username-register')
        this.username.previousValue = ''
        this.email = document.querySelector('#email-register')
        this.email.previousValue = ''
        this.password = document.querySelector('#password-register')
        this.password.previousValue = ''
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    // events
    events() {
        this.form.addEventListener('submit', e => {
            e.preventDefault()
            this.formSubmitHandler()
        })
        this.username.addEventListener('keyup', () => {
            this.isDifferent(this.username, this.usernameHandler)
        } ) 
        this.email.addEventListener('keyup', () => {
            this.isDifferent(this.email, this.emailHandler)
        } )
        this.password.addEventListener('keyup', () => {
            this.isDifferent(this.password, this.passwordHandler)
        } ) 
        this.username.addEventListener('blur', () => {
            this.isDifferent(this.username, this.usernameHandler)
        } ) 
        this.email.addEventListener('blur', () => {
            this.isDifferent(this.email, this.emailHandler)
        } )
        this.password.addEventListener('blur', () => {
            this.isDifferent(this.password, this.passwordHandler)
        } ) 
    }

    // methods
    formSubmitHandler() {
        this.usernameInmidiately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordInmidiately()
        this.passwordAfterDelay()

        if( 
            this.username.isUnique && !this.username.errors && 
            this.email.isUnique    && !this.email.errors && 
                                      !this.password.errors
        ) {
            this.form.submit()
        }
    }

    insertValidationElements() {
        this.allFields.forEach((el) => {
            el.insertAdjacentHTML('afterend', '<div class="alert alert-danger small liveValidateMessage"> </div>')
        })
    }

    isDifferent(el, handler) {
        if(el.previousValue != el.value) {
            el.errors = false
            handler.call(this)
        }
        if(!el.errors) {
            this.hideValidationErrors(el)
        }
        el.previousValue = el.value
    }

    usernameHandler() {
        this.usernameInmidiately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800)
    }

    passwordHandler() {
        this.passwordInmidiately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800)
    }

    passwordInmidiately() {
        if(this.password.value.length > 50) {
            this.showValidationError(this.password, 'password cannot exceed 50 characters')
        }
    }

    passwordAfterDelay() {
        if(this.password.value.length<12) {
            this.showValidationError(this.password, 'password must be at least 12 characters')
        }
    }

    emailHandler() {
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(), 800)
    }

    emailAfterDelay() {
        if(!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, 'you must provide a valid email address')
        }
        if(!this.email.errors) {
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.email.value}).then((response) => {
                if(response.data) {
                    this.email.isUnique = false
                    this.showValidationError(this.email, 'that email is already being used')
                } else {
                    this.email.isUnique = true
                    this.hideValidationErrors(this.email)
                }
            }).catch(() => {
                console.log('please try again later')
            })
        }
    }

    usernameInmidiately() {
        if(this.username.value!='' && !/^([a-zA-Z0-9]+)$/.test(this.username.value) ) {
            this.showValidationError(this.username, 'username can only contain letters and numbers')
        }
        if(this.username.value.length>30) {
            this.showValidationError(this.username, 'username con not exceed 30 characters')
        }
    }

    hideValidationErrors(el) {
        el.nextElementSibling.classList.remove('liveValidateMessage--visible')
    }

    showValidationError(el, message) {
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add('liveValidateMessage--visible')
        el.errors = true
    }

    usernameAfterDelay() {
        if(this.username.value.length<3) {
            this.showValidationError(this.username, 'username must be at least 3 characters')
        }
        if(!this.username.errors) {
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.username.value}).then((response) => {
                if(response.data) {
                    this.showValidationError(this.username, 'that username is already taken')
                    this.username.isUnique = false
                } else {
                    this.username.isUnique = true
                }
            }).catch(() => {
                console.log('please try again later')
            })
        }
    }
}
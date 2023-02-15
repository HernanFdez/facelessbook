const Follow = require('../models/Follow')
const sendgrid = require('@sendgrid/mail')
const User = require('../models/User')
sendgrid.setApiKey(process.env.SENDGRIDAPIKEY)


exports.addFollow = function(req, res) {
    let follow = new Follow(req.params.username, req.visitorId )
    follow.create().then(async () => {
        let followed = req.params.username
        let newFollower = req.session.user.username
        let followedDoc = await User.findByUsername(followed) 
        let followedEmail = followedDoc.email
        console.log(followedEmail)
        sendgrid.send({
            to:   followedEmail,
            from: 'notifications.facelessbook@gmail.com',
            subject: 'New Follower',
            text: `${newFollower} started following you!`,
            html: `<a href=https://facelessbook.onrender.com/profile/${newFollower}>${newFollower}</a> started following you!`
        })
        req.flash('success', `successfully followed ${followed}`)
        req.session.save(() => res.redirect(`/profile/${followed}`))
    }).catch((errors) => {
        errors.forEach(error => req.flash('errors', error))
        req.session.save(() => res.redirect('/'))
    })
}


exports.removeFollow = function(req, res) {
    let follow = new Follow(req.params.username, req.visitorId )
    follow.delete().then(() => {
        req.flash('success', `successfully stopped following ${req.params.username}`)
        req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    }).catch((errors) => {
        errors.forEach(error => req.flash('errors', error))
        req.session.save(() => res.redirect('/'))
    })
}
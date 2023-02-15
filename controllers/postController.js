const Post = require('../models/Post') 


exports.viewCreateScreen = function(req, res) {
    res.render('create-post')
}

exports.create = async function(req, res) {
    let post = new Post(req.body, req.session.user._id)

    try {
        const newId = await post.create()
        req.flash('success', 'new post successfully created')
        req.session.save(()=>res.redirect(`/post/${newId}`))
    } catch(errors) {
        errors.forEach(error => req.flash('errors', error))
        req.session.save(()=>res.redirect('create-post'))
    }
}

exports.apiCreate = async function(req, res) {
    let post = new Post(req.body, req.apiUser._id)
    try {
        let newId = await post.create()
        res.json('congrats!')
    } catch(errors) {
        res.json(errors)
    }
}


exports.viewSingle = async function(req, res) {
    try{
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {post: post, title: post.title})
    } catch {
        res.render('404')
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
      let post = await Post.findSingleById(req.params.id, req.visitorId)
      if (post.isVisitorOwner) {
        res.render("edit-post", {post: post})
      } else {
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(() => res.redirect("/"))
      }
    } catch {
      res.render("404")
    }
  }

exports.edit = async function(req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)
    try {
        const status = await post.update()
        if(status=='success'){
            // post was updated in db
            req.flash('success', 'post successfully updated')
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach(function(error) {
                req.flash('errors', error)
                req.session.save(function() {
                    res.redirect(`/post/${req.params.id}/edit`)
                })
            })
        }
    } catch {
        // if a post with the requested id doesn't exists or
        // if the current visitor is not the owner of the post
        req.flash('errors', 'you do not have permission to perform that action')
        req.session.save(function() {
            res.redirect('/')
        })
    }
}


exports.delete = async function(req, res){
    try {
        await Post.delete(req.params.id, req.visitorId)
        req.flash('success', 'post successfully deleted')
        req.session.save( () => res.redirect(`/profile/${req.session.user.username}`))
    } catch {
        req.flash('errors', 'you do not have permission to perform that action')
        req.session.save( () => res.redirect('/'))
    }
}

exports.apiDelete = async function(req, res){
    try {
        await Post.delete(req.params.id, req.apiUser._id)
        res.json('success!')
    } catch (errors) {
        res.json('unauthorized')
    }
}


exports.search = async function(req, res) {
    try {
        const posts = await Post.search(req.body.searchTerm)
        res.json(posts)
    } catch(errors) {
        res.json([])
    }
}
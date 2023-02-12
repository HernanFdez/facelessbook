const followsCollection = require('../db').db().collection('follows')
const postCollection = require('../db').db().collection('posts')
postCollection.createIndex({title: "text", body: "text"})

const ObjectID = require('mongodb').ObjectID
const { ObjectId } = require('mongodb')
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

let Post = function(data, userid, requestedPostId){
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function() {
    if(typeof(this.data.title) != 'string') {this.data.title = ''}
    if(typeof(this.data.body ) != 'string') {this.data.body = ''}   

    // get rid of any bogus properties
    this.data = {
        title:  sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: []}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: []}),
        createdDate: new Date(),
        author: ObjectID(this.userid)
    }
}

Post.prototype.validate = function() { 
    if(this.data.title=='') {this.errors.push('you must provide a title')}
    if(this.data.body =='') {this.errors.push('you must provide post content')}
}

Post.prototype.create = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()

        if(!this.errors.length) {
            // save post into DB
            postCollection.insertOne(this.data).then((info) => {
                resolve(info.insertedId)
            }).catch(() => {
                this.errors.push('please try again later') 
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function() {
    return new Promise( async (resolve, reject) => {
        try{
            let post = await Post.findSingleById(this.requestedPostId, this.userid)
            if (post.isVisitorOwner) {
                // actually update db
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}


Post.prototype.actuallyUpdate = function() {
    return new Promise( async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            await postCollection.findOneAndUpdate({_id: new ObjectId(this.requestedPostId)}, {$set: {title: this.data.title, body: this.data.body}})
            resolve('success')
        } else {
            resolve('failure')
        }
    })
}


Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations = []) {
    return new Promise(async function(resolve, reject) {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: 'users', localField: 'author', foreignField: '_id', as: 'authorDocument'}},
            {$project: {
                title: 1,
                body: 1,
                authorId: "$author",
                createdDate: 1,
                author: {$arrayElemAt: ["$authorDocument", 0]}
            }}            
        ]).concat(finalOperations)

        let posts = await postCollection.aggregate(aggOperations).toArray()

        // clean up author property in each post object
        posts = posts.map(function(post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar 
            }
            return post
        })

        resolve(posts)
    })
}



Post.findSingleById = function(id, visitorId) {
    return new Promise(async function(resolve, reject) {
        if(typeof(id)!='string' || !ObjectID.isValid(id)) {
            reject()
            return
        }

        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectID(id)} }
        ], visitorId)

        if(posts.length) {
            resolve(posts[0])
        } else {
            reject()
        }
    })
}



Post.findByAuthorId = function(authorId){
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}}
    ])
}


Post.delete = function(postIdToDelete, currentUserId) {
    return new Promise(async (resolve, reject) => {
        try{
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if(post.isVisitorOwner) {
                await postCollection.deleteOne({_id: new ObjectId(postIdToDelete)})
                resolve()
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}


Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
        if(typeof(searchTerm) == 'string'){
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}}
            ],
            undefined,
            [
                {$sort: {score: {$meta: 'textScore'}}}
            ])
            resolve(posts)
        } else {
            reject()
        }
    })
}


Post.countPostsByAuthor = function(id) {
    return new Promise(async (resolve, reject) => {
        let postCount = await postCollection.countDocuments({author: id})
        resolve(postCount)
    })
}


Post.getFeed = async function(id) {
    // create an array of the user IDs that the current user follows
    let followedUsers = await followsCollection.find({authorId: new ObjectId(id)}).toArray()
    followedUsers = followedUsers.map(followedDoc => followedDoc.followedId)

    // look for posts where the author is in the above array of followed users
    return Post.reusablePostQuery([
        {$match: {author: {$in: followedUsers}}},
        {$sort: {createdDate: -1}}
    ])
}


module.exports = Post
// ==UserScript==
// @name        otaimprove
// @namespace   otaimprove
// @description cool things for ota (and tinyboard, and probably vichan)
// @include     https://ota-ch.com/jp/*
// @version     0.0.3
// @grant       none
// @license     GPLv3 https://opensource.org/licenses/GPL-3.0
// ==/UserScript==
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// todo: refactor

let userprefs = require('./userprefs.js')
const HIDDEN_THREADS = 'HIDDEN_THREADS'
const HIDE_BTN_CLASS = 'hideBtnClass'

// todo: I think I keep replies stored seperately from threads.  In theory you might have lots of replies and threads hidden.
//    If you open a thread that would waste a ton of time doing thousands of unnecessary dom
//    searches for replies that cannot possibly be in the thread. This probably isnt that uncommon.
//    format should be [{'thread_id' : [reply_id, reply_id, reply_id]}, {'thread_id2': [reply_id, reply_id]}]
const HIDDEN_REPLIES = 'HIDDEN_REPLIES'

let GET_HIDDEN_THREADS = () => {
    // I forgot to take into account board type.
  let pathname = document.location.pathname
  // parse the board name
  let boardName = pathname.split('/')[1]
  return HIDDEN_THREADS + `_${boardName}`
}

let GET_HIDDEN_REPLIES = () => {
    // I forgot to take into account board type.
  let pathname = document.location.pathname
  // parse the board name
  let boardName = pathname.split('/')[1]
  return HIDDEN_REPLIES + `_${boardName}`
}

const flatten = arr => arr.reduce(
  (acc, val) => acc.concat(
    Array.isArray(val) ? flatten(val) : val
  ),
  []
)

// let userSettings = {}

class OtaImprove {
  migrate002To003 () {
    // if they have something there don't migrate them.
    if (!window.localStorage.getItem(GET_HIDDEN_THREADS()) ||
        !window.localStorage.getItem(GET_HIDDEN_REPLIES())) {
      return
    }
    // assume that their hidden threads were all meant for a /jp/ board.
    let oldHidden = window.localStorage.getItem(HIDDEN_THREADS)
    window.localStorage.setItem(HIDDEN_THREADS + `_jp`, oldHidden)
    // clear the old localstorage values.
    window.localStorage.setItem(HIDDEN_THREADS, '')
  }

  constructor () {
    // todo: remove at some point.
    // todo: activate before release
    // this.migrate002To003()
    // todo: fixme debug false
    this.DEBUG = true
    this.hiddenThreads = JSON.parse(window.localStorage.getItem(GET_HIDDEN_THREADS())) || []
    // kill potential duplicate ids.
    this.hiddenThreads = Array.from(new Set(this.hiddenThreads))
    this.hiddenReplies = JSON.parse(window.localStorage.getItem(GET_HIDDEN_REPLIES())) || []
    this.hiddenReplies = Array.from(new Set(this.hiddenReplies))
    this.visibleThreads = []
    this.visibleReplies = []

    // functions to be called whenever a hide performs.
    // todo
    this.hideActions = []

    this.createDebugMenu()
    this.performDomEdits()

    // this.createHideButtons()

    // this.batchHideThreads(document, this.hiddenThreads)
  }

  performDomEdits () {
    // collect threads and replies.
    let threadRoot = document.querySelector('form[name="postcontrols"]')
    let threadCollection = Array.prototype.slice.call(threadRoot.children)
    .filter(element => element.id && element.id.includes('thread_'))
    let replyCollection = threadCollection.map(element =>
                            Array.prototype.slice.call(element.children))
    replyCollection = flatten(replyCollection)
                      .filter(element => element.id && element.id.includes('reply_'))
    // let visibleThreads = []
    // let visibleReplies = []
    let visiblePosts = threadCollection.concat(replyCollection)

    this.hideThreadsRENAME(visiblePosts, this.hiddenThreads, this.hiddenReplies)
  }

  // visiblePosts: array html elements,
  // hiddenThreads: array html elements,
  // hiddenReplies: array html elements,
  // todo: rename
  hideThreadsRENAME (visiblePosts, hiddenThreads, hiddenReplies) {
    let hideButton = this.createHideButton()

    // create the hide buttons
    for (let i = 0; i < visiblePosts.length; i++) {
      let post = visiblePosts[i]
      let introElement = post.querySelector('.intro')
      let uniqueHideButton = hideButton.cloneNode(true)

      introElement.appendChild(uniqueHideButton)

      uniqueHideButton.addEventListener('click', () => {
        let postId = post.id
        console.log('clicked', postId)
        this.updateHiddenPosts(postId, hiddenThreads, hiddenReplies)
        // todo: update
        this.hidePostTODORENAME(document, postId)
      })
    }

    // filter the replies by the visible threads.
    // todo: sort visiblePosts and do smart filtering so these both are nlgn instead of n2
    let visiblePostIds = visiblePosts.map(ele => ele.id)
    let filteredHiddenThreads = hiddenThreads.filter(threadId => visiblePostIds.indexOf(threadId) !== -1)
    let filteredHiddenReplies = hiddenReplies.filter(obj => {
      let threadKey = Object.keys(obj)[0]
      if (!threadKey.includes('thread_')) {
        console.error('invalid state:', hiddenThreads, hiddenReplies, threadKey)
      }
      return visiblePostIds.indexOf(threadKey) !== -1
    })
    filteredHiddenReplies = filteredHiddenReplies.map(obj => Object.values(obj)[0])
    filteredHiddenReplies = flatten(filteredHiddenReplies)

    for (let i = 0; i < filteredHiddenThreads.length; i++) {
      this.hidePostTODORENAME(document, filteredHiddenThreads[i])
    }
    for (let i = 0; i < filteredHiddenReplies.length; i++) {
      this.hidePostTODORENAME(document, filteredHiddenReplies[i])
    }
  }

  hidePostTODORENAME (parentNode, id) {
    if (id.includes('thread_')) {
      // todo:
      let threadHtmlElement = parentNode.querySelector('#' + id)
      let introElement = threadHtmlElement.querySelector('.intro')
      let threadParent = threadHtmlElement.parentElement
      let hiddenThreadElement = this.getHiddenThreadElement(introElement, id, this.threadUnhideButtonListener)

      threadHtmlElement.style = 'display:none;'
      threadParent.insertBefore(hiddenThreadElement, threadHtmlElement)
    } else if (id.includes('reply_')) {
      let replyHtmlElement = parentNode.querySelector('#' + id)
      let replyParent = replyHtmlElement.parentElement
      let introElement = replyHtmlElement.querySelector('.intro')
      let hiddenReplyElement = this.getHiddenReplyElement(introElement, id, this.replyUnhideButtonListener)

      replyHtmlElement.style = 'display:none;'
      replyParent.insertBefore(hiddenReplyElement, replyHtmlElement)
    } else {
      window.alert('something went wrong hiding the post: ' + id)
      console.error('something went wrong help.')
    }
  }

  getHiddenThreadElement (introElement, postId, unhideButtonListener) {
    let hiddenThreadElement = document.createElement('div')
    let hiddenThreadElementIntro = introElement.cloneNode(true)
    let oldHideButton = hiddenThreadElementIntro.querySelector('.' + HIDE_BTN_CLASS)
    let newHideButton = oldHideButton.cloneNode(true)
    hiddenThreadElementIntro.replaceChild(newHideButton, oldHideButton)

    hiddenThreadElement.appendChild(hiddenThreadElementIntro)
    hiddenThreadElement.appendChild(document.createElement('hr'))

    newHideButton.addEventListener('click', () => unhideButtonListener(postId, hiddenThreadElement, this.hiddenThreads))

    return hiddenThreadElement
  }

  threadUnhideButtonListener (postId, hiddenThreadElement, hiddenThreads) {
    let threadHtmlElement = document.querySelector('#' + postId)
    threadHtmlElement.style = 'display: block'
    let threadParent = threadHtmlElement.parentNode
    threadParent.removeChild(hiddenThreadElement)

    let index = hiddenThreads.indexOf(postId)
    hiddenThreads.splice(index, 1)
    window.localStorage.setItem(GET_HIDDEN_THREADS(), JSON.stringify(hiddenThreads))
    console.log(hiddenThreads)
    console.log('removing hidden reply element, unhiding reply', postId)
  }

  getHiddenReplyElement (introElement, postId, unhideButtonListener) {
    let hiddenReplyElement = document.createElement('div')
    // this is kind of lazy, in theory we should have a method that builds our own hiddenReplyElement
    let hiddenReplyElementIntro = introElement.cloneNode(true)
    let oldHideButton = hiddenReplyElementIntro.querySelector('.' + HIDE_BTN_CLASS)
    let newHideButton = oldHideButton.cloneNode(true)
    hiddenReplyElementIntro.replaceChild(newHideButton, oldHideButton)

    // this part and listener handling is the only thing that should matter.
    hiddenReplyElement.className = 'post reply'
    hiddenReplyElement.appendChild(hiddenReplyElementIntro)
    // hiddenReplyElement.appendChild(document.createElement('br'))

    newHideButton.addEventListener('click', () => unhideButtonListener(postId, hiddenReplyElement, this.hiddenReplies))

    return hiddenReplyElement
  }

  replyUnhideButtonListener (postId, hiddenReplyElement, hiddenReplies) {
    let replyHtmlElement = document.querySelector('#' + postId)
    replyHtmlElement.style = 'display: inline-block'
    let replyParentThread = replyHtmlElement.parentNode
    replyParentThread.removeChild(hiddenReplyElement)
    // todo: modify global hiddenReplies
    // get the array of hidden replies for this post's parent thread from hiddenReplies
    let hiddenRepliesForParentThread = hiddenReplies.filter(obj => obj[replyParentThread.id])[0][replyParentThread.id]
    let hiddenReplyIndex = hiddenRepliesForParentThread.indexOf(postId)
    if (hiddenReplyIndex === -1) {
      console.error('Invalid state:', postId, hiddenReplies)
    }
    hiddenRepliesForParentThread.splice(hiddenReplyIndex, 1)
    window.localStorage.setItem(GET_HIDDEN_REPLIES(), JSON.stringify(hiddenReplies))
    console.log(hiddenReplies)
    console.log('removing hidden reply element, unhiding reply', postId)
  }

  updateHiddenPosts (postId, hiddenThreads, hiddenReplies) {
    if (postId.includes('thread')) {
      this.updateHiddenThreads(postId, hiddenThreads)
    } else {
      this.updateHiddenReplies(postId, hiddenReplies)
    }
  }

  updateHiddenThreads (postId, hiddenThreads) {
    hiddenThreads.push(postId)
    window.localStorage.setItem(GET_HIDDEN_THREADS(), JSON.stringify(hiddenThreads))
  }

  // todo
  updateHiddenReplies (postId, hiddenReplies) {
    let threadElement = document.querySelector('#' + postId).parentNode
    // {'threadId' : [hiddenReply1, hiddenReply2, hiddenReply3, ...]}
    let hiddenReplyParentThingObject = hiddenReplies.filter(x => x[threadElement.id])[0]
    if (hiddenReplyParentThingObject) {
      hiddenReplyParentThingObject[threadElement.id].push(postId)
    } else {
      // todo
      hiddenReplies.push({[threadElement.id]: [postId]})
    }
    // todo
    window.localStorage.setItem(GET_HIDDEN_REPLIES(), JSON.stringify(hiddenReplies))
  }

  createHideButton () {
    let hideButton = document.createElement('a')
    hideButton.innerText = 'Hide'
    // Unfortunately since some stylesheets(Miku at least) use a a:link pseudo-class to style buttons it can't
    // always look like [Reply] link button.  don't set an href since it rockets you to the top of the page.
    hideButton.className = HIDE_BTN_CLASS
    return hideButton
  }

  createDebugMenu () {
    if (!this.DEBUG) {
      return
    }

    let debugLink = document.createElement('button')
    debugLink.style = 'float: right;'
    debugLink.innerText = 'Debug OtaImprove'
    document.querySelector('.boardlist').appendChild(debugLink)

    let debugElement = document.createElement('div')
    debugElement.style = 'display:none'

    let localStorageClear = document.createElement('button')
    localStorageClear.innerText = 'Clear hidden threads'

    document.querySelector('.boardlist').appendChild(debugElement)
    debugElement.appendChild(localStorageClear)

    // Event handlers.
    debugLink.addEventListener('click', () => {
      console.debug('debug menu open')
      debugElement.style = 'display: block; background: white; color: black'
      // update the debug display
      debugElement.innerHTML = `<div>${JSON.stringify(this)}</div><br>`
      console.dir(this)
      debugElement.appendChild(localStorageClear)
    })
    localStorageClear.addEventListener('click', () => {
      console.debug('before', window.localStorage)
      window.localStorage.setItem(HIDDEN_THREADS, '[]')
      window.localStorage.setItem(GET_HIDDEN_THREADS(), '[]')
      window.localStorage.setItem(HIDDEN_REPLIES, '[]')
      window.localStorage.setItem(GET_HIDDEN_REPLIES(), '[]')
      console.debug('after', window.localStorage)
    })
  }

  // Creates all the hide buttons for the visible threads on the page, and then using the
  // batch hides the stored hiddenThreads array
  createHideButtons () {
    // the form HTML element containing all the thread <div>'s
    let threadRoot = document.querySelector('form[name="postcontrols"]')
    let threadCollection = threadRoot.children

    // todo: unify under post view eg visiblePosts includes threads and replies.
    let visibleThreads = []
    let visibleReplies = []

    let hideButton = document.createElement('a')
    hideButton.innerText = 'Hide'
    // Unfortunately since some stylesheets(Miku at least) use the a:link pseudo-class to style buttons it can't
    // always look like [Reply] link button.  don't set an href since it rockets you to the top of the page.
    hideButton.className = HIDE_BTN_CLASS

    for (let i = 0; i < threadCollection.length; i++) {
      let thread = threadCollection.item(i)
      // filter the leading hidden input element, and trailing delete elements.
      // thread elements have an id of the form 'thread_#####'
      if (!thread.id || !thread.id.includes('thread')) {
        // its not a thread element, skip it
        continue
      }

      visibleThreads.push(thread.id)

      // intro element contains the checkbox, name, date string, post number, etc.
      let introElement = thread.querySelector('.intro')
      let uniqueHideButton = hideButton.cloneNode(true)
      uniqueHideButton.addEventListener('click', () => {
        let threadId = thread.id
        console.log('clicked', threadId)
        // update the array of hiddenThreads, update the localStore, and then hide the thread.
        this.hiddenThreads.push(threadId)
        window.localStorage.setItem(HIDDEN_THREADS, JSON.stringify(this.hiddenThreads))
        this.hideThread(document, threadId, false, true)
      })

      introElement.appendChild(uniqueHideButton)

      // process the threads child replies.
      let threadChildren = thread.children
      for (let i = 0; i < threadChildren.length; i++) {
        let reply = threadChildren.item(i)
        if (!reply.id || !reply.id.includes('reply')) {
          continue
        }

        visibleReplies.push(reply.id)

        let replyIntroElement = reply.querySelector('.intro')
        let replyUniqueHideBtn = hideButton.cloneNode(true)
        replyUniqueHideBtn.addEventListener('click', () => {
          let replyId = reply.id
          console.log('clicked hide', replyId)
          this.hiddenReplies.push(replyId)
          this.hideThread(document, replyId, false, false)
        })

        replyIntroElement.appendChild(replyUniqueHideBtn)
      }
    }

    this.visibleThreads = visibleThreads
    this.visibleReplies = visibleReplies

    // after it has created all the hide buttons, and we are done iterating through the threads collection
    // it can call hideThread to modify the dome
    let filteredThreadsToHide = this.hiddenThreads.filter(id => this.visibleThreads.includes(id))
    console.log('performing batch hide', this.visibleThreads, filteredThreadsToHide)
    for (let i = 0; i < filteredThreadsToHide.length; i++) {
      this.hideThread(document, filteredThreadsToHide[i], false)
    }
  }

  hideThread (parentNode, id, addToHiddenThreads = false, isThread = true) {
    if (addToHiddenThreads) {
      this.hiddenThreads.push(id)
    }

    // handle constructing values differently.
    if (!isThread) {
      let replyHtmlElement = document.getElementById(id)
      let replyParent = replyHtmlElement.parentElement
      let hiddenReplyElement = document.createElement('div')
      let introElement = replyHtmlElement.querySelector('.intro')
      let hiddenReplyElementIntroElement = introElement.cloneNode(true)

      let oldHideButtonTakenFromThePost = hiddenReplyElementIntroElement.querySelector('.' + HIDE_BTN_CLASS)
      let newHideButton = oldHideButtonTakenFromThePost.cloneNode(true)
      hiddenReplyElementIntroElement.replaceChild(newHideButton, oldHideButtonTakenFromThePost)

      // this part and listener handling is the only thing that should matter.
      replyHtmlElement.style = 'display:none;'
      hiddenReplyElement.className = 'post reply'
      hiddenReplyElement.appendChild(hiddenReplyElementIntroElement)
      // hiddenReplyElement.appendChild(document.createElement('br'))

      replyParent.insertBefore(hiddenReplyElement, replyHtmlElement)

      newHideButton.addEventListener('click', () => {
        replyHtmlElement.style = 'display: inline-block'
        replyParent.removeChild(hiddenReplyElement)
        // todo: modify global hiddenReplies
        let index = this.hiddenReplies.indexOf(id)
        this.hiddenReplies.splice(index, 1)
        // window.localStorage.setItem(HIDDEN_THREADS, JSON.stringify(this.hiddenThreads))
        console.log('removing hidden reply element, unhiding reply', replyHtmlElement.id)
      })
      return
    }

    let threadHtmlElement = document.getElementById(id)
    let threadParent = threadHtmlElement.parentElement
    let hiddenThreadElement = document.createElement('div')
    let introElement = threadHtmlElement.querySelector('.intro')
    let hiddenThreadElementIntroElement = introElement.cloneNode(true)

    let oldHideButtonTakenFromThePost = hiddenThreadElementIntroElement.querySelector('.' + HIDE_BTN_CLASS)
    let newHideButton = oldHideButtonTakenFromThePost.cloneNode(true)
    hiddenThreadElementIntroElement.replaceChild(newHideButton, oldHideButtonTakenFromThePost)

    threadHtmlElement.style = 'display:none;'
    hiddenThreadElement.appendChild(hiddenThreadElementIntroElement)
    hiddenThreadElement.appendChild(document.createElement('hr'))

    threadParent.insertBefore(hiddenThreadElement, threadHtmlElement)

    newHideButton.addEventListener('click', () => {
      threadHtmlElement.style = 'display: block'
      threadParent.removeChild(hiddenThreadElement)
      let index = this.hiddenThreads.indexOf(id)
      this.hiddenThreads.splice(index, 1)
      window.localStorage.setItem(HIDDEN_THREADS, JSON.stringify(this.hiddenThreads))
      console.log('removing hidden thread element, unhiding thread', threadHtmlElement.id)
    })
  }
}

exports.exportImportsWorking = () => console.debug('import worked. export worked : ' + JSON.stringify(userprefs.preferences))
exports.run = () => {
  console.log('called the run method')
  console.log('do some stuff')
  console.log('whatever')
}
exports.OtaImprove = OtaImprove

},{"./userprefs.js":3}],2:[function(require,module,exports){
;(() => {
  let otaimprove = require('./otaimprove.js')
  otaimprove.exportImportsWorking()
  otaimprove.run()

  document.onreadystatechange = function () {
    if (!window.localStorage) {
      window.alert('browser unsupported')
    }

    if (document.readyState === 'complete') {
      console.log('Started script from require')
      let otaImprove = new otaimprove.OtaImprove()
      console.dir(otaImprove)
    }
  }
})()

},{"./otaimprove.js":1}],3:[function(require,module,exports){
;(() => {
  let preferences = {
    whatever: 'something',
    a: 'b'
  }
  exports.preferences = preferences
})()

},{}]},{},[2]);

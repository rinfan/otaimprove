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
let HIDDEN_THREADS = 'HIDDEN_THREADS'
let HIDE_BTN_CLASS = 'hideBtnClass'

// todo: I think I keep replies stored seperately from threads.  In theory you might have lots of replies and threads hidden.
//    If you open a thread that would waste a ton of time doing thousands of unnecessary dom searches. This probably isnt
//    format should be [{'thread_id' : [reply_id, reply_id, reply_id]}, {'thread_id2': [reply_id, reply_id]}]
// let HIDDEN_REPLIES = 'HIDDEN_REPLIES'

// let userSettings = {}

class OtaImprove {
  constructor () {
    // todo: fixme debug false
    this.DEBUG = true
    this.hiddenThreads = JSON.parse(window.localStorage.getItem(HIDDEN_THREADS)) || []
    // kill potential duplicate ids.
    this.hiddenThreads = Array.from(new Set(this.hiddenThreads))
    this.hiddenReplies = []
    this.visibleThreads = []
    this.visibleReplies = []

    this.createDebugMenu()
    this.createHideButtons()
    // this.batchHideThreads(document, this.hiddenThreads)
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
    // simple data dumps that don't need a listener should go here.
    debugElement.innerHTML = `<div>${JSON.stringify(this)}</div><br>`

    let localStorageClear = document.createElement('button')
    localStorageClear.innerText = 'Clear hidden threads'

    document.querySelector('.boardlist').appendChild(debugElement)
    debugElement.appendChild(localStorageClear)

    // Event handlers.
    debugLink.addEventListener('click', () => {
      console.debug('debug menu open')
      debugElement.style = 'display: block; background: white; color: black'
      // update the data dump
      debugElement.innerHTML = `<div>${JSON.stringify(this)}</div><br>`
    })
    localStorageClear.addEventListener('click', () => {
      console.debug('before', this.hiddenThreads)
      window.localStorage.setItem(HIDDEN_THREADS, '[]')
      console.debug('after', window.localStorage.getItem(HIDDEN_THREADS))
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
    // Unfortunately since some stylesheets(Miku at least) use a a:link pseudo-class to style buttons it can't
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
    foo: 'bar',
    a: 'b'
  }
  exports.preferences = preferences
})()

},{}]},{},[2]);

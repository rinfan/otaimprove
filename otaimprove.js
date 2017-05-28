// ==UserScript==
// @name        otaimprove
// @namespace   otaimprove
// @description cool things for ota (and tinyboard, and probably vichan)
// @include     https://ota-ch.com/jp/*
// @version     0.0.2
// @grant       none
// ==/UserScript==
// todo: refactor

;(() => {
  let HIDDEN_THREADS = 'HIDDEN_THREADS'
  let HIDE_BTN_CLASS = 'hideBtnClass'

  class OtaImprove {
    constructor () {
      // todo: fixme debug false
      this.DEBUG = true
      this.hiddenThreads = JSON.parse(window.localStorage.getItem(HIDDEN_THREADS)) || []
      // kill potential duplicate ids.
      this.hiddenThreads = Array.from(new Set(this.hiddenThreads))
      this.visibleThreads = []

      this.createDebugMenu()
      this.createHideButtons()
      this.batchHideThreads(document, this.hiddenThreads)
    }

    createDebugMenu () {
      if (!this.DEBUG) { return }

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

      debugLink.addEventListener('click', () => {
        console.debug('debug menu open')
        debugElement.style = 'display: block; background: white; color: black'
      })
      localStorageClear.addEventListener('click', () => {
        console.debug('before', this.hiddenThreads)
        window.localStorage.setItem(HIDDEN_THREADS, '[]')
        console.debug('after', window.localStorage.getItem(HIDDEN_THREADS))
      })
    }

    // todo: this should go : make a button, is this in hidden threads? hide it, else we're done.
    // todo narrow scope so this can be run alongside  fn threadHider(), on startup after reading hidden threads.
    createHideButtons () {
      // the form HTML element containing all the thread <div>'s
      let threadRoot = document.querySelector('form[name="postcontrols"]')
      let threadCollection = threadRoot.children
      let visibleThreads = []

      let hideButton = document.createElement('a')
      hideButton.innerText = 'Hide'
      // Unfortunately since some stylesheets(Miku at least) use a a:link pseudo-class to style buttons it can't
      // always look like [Reply] link button.  don't set an href since it rockets you to the top of the page.
      hideButton.className = HIDE_BTN_CLASS
      // 0th element is a hidden input field, last two elements are delete fields.
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
          this.hideThread(thread, threadId)
        })

        introElement.appendChild(uniqueHideButton)
      }

      this.visibleThreads = visibleThreads
    }

    hideThread (parentNode, id, addToHiddenThreads = false) {
      if (addToHiddenThreads) {
        this.hiddenThreads.push(id)
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

    // hide each thread in threadsToHide
    batchHideThreads (parent, threadsToHide) {
      let filteredThreadsToHide = threadsToHide.filter(id => this.visibleThreads.includes(id))
      console.log('performing batch hide', this.visibleThreads, filteredThreadsToHide)
      for (let i = 0; i < filteredThreadsToHide.length; i++) {
        this.hideThread(parent, filteredThreadsToHide[i], false)
      }
    }
  }

  document.onreadystatechange = function () {
    if (!window.localStorage) {
      window.alert('browser unsupported')
    }

    if (document.readyState === 'complete') {
      console.log('Started script')
      let otaImprove = new OtaImprove()
      console.dir(otaImprove)
    }
  }
})()

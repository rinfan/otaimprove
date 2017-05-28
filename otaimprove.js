// ==UserScript==
// @name        otaimprove
// @namespace   otaimprove
// @description cool things for ota (and tinyboard, and probably vichan)
// @include     https://ota-ch.com/jp/*
// @version     0.0.1
// @grant       none
// ==/UserScript==
// todo: cleanup element creation, use innerHTML w/ template strings.
// todo: refactor

;(() => {
  let HIDDEN_THREADS = 'HIDDEN_THREADS'
  let HIDE_BTN_CLASS = 'hideBtnClass'

  class OtaImprove {
    constructor () {
     // todo: fixme debug false
      this.DEBUG = true
      this.hiddenThreads = JSON.parse(window.localStorage.getItem(HIDDEN_THREADS)) || []
      this.createDebugMenu()
      this.createHideButtons()
      this.batchHideThreads(document, this.hiddenThreads)
    }

    createDebugMenu () {
      if (!this.DEBUG) { return }

      let debugLink = document.createElement('div')
      debugLink.style = 'color: black; font-size: 28px; float: right; box-shadow: 0px 0px 30px 0px rgba(127, 0, 127, 0.67);'
      debugLink.innerText = 'Debug'
      document.querySelector('.boardlist').appendChild(debugLink)

      let debugElement = document.createElement('div')
      debugElement.style = 'display:none'
      let otaImproveElement = document.createElement('div')
      otaImproveElement.innerText = JSON.stringify(this)
      let localStorageClear = document.createElement('button')
      localStorageClear.innerText = 'Clear hidden threads'

      document.querySelector('.boardlist').appendChild(debugElement)

      debugElement.appendChild(otaImproveElement)
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

  // todo narrow scope so this can be run alongside  fn threadHider(), on startup after reading hidden threads.
  // todo: this should create an array of threads on the current page so it doesnt do dom searches
  //   for threads in localStorage that aren't on the current page
    createHideButtons () {
      let threadRoot = document.querySelector('form[name="postcontrols"]')
      let threadCollection = threadRoot.children

      let hideButton = document.createElement('a')
      hideButton.innerText = 'Hide'
      hideButton.attributes['href'] = '#'
      hideButton.className = HIDE_BTN_CLASS
    // 0th element is a hidden input field
      for (let i = 0; i < threadCollection.length; i++) {
        let thread = threadCollection.item(i)
      // filter the leading hidden input element, and trailing delete elements.
      // todo: might be more clear to just !idstrcontains('thread'), and likewise for 'post'
        if (thread.tagName !== 'DIV' || !thread.classList || thread.classList.length !== 0) {
          continue
        }

        let introElement = thread.querySelector('.intro')
        let uniqueHideButton = hideButton.cloneNode(true)
        uniqueHideButton.addEventListener('click', () => {
          let threadId = thread.id
          console.log('clicked', threadId)
          this.hiddenThreads.push(threadId)
          window.localStorage.setItem(HIDDEN_THREADS, JSON.stringify(this.hiddenThreads))
          this.hideThread(thread, threadId, false)
        })
        introElement.appendChild(uniqueHideButton)
      }
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
      for (let i = 0; i < threadsToHide.length; i++) {
        this.hideThread(parent, threadsToHide[i], false)
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

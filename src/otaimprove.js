// todo: refactor

let userprefs = require('./userprefs.js')
const HIDDEN_THREADS = 'HIDDEN_THREADS'
const HIDE_BTN_CLASS = 'hideBtnClass'
const INFINITE_SCROLL_ID = 'rfoi-infinite-scroll-id'

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
    // todo: remove migration at some point.
    // todo: activate before release
    // this.migrate002To003()
    // todo: fixme debug false
    this.DEBUG = true
    this.hiddenThreads = JSON.parse(window.localStorage.getItem(GET_HIDDEN_THREADS())) || []
    // kill potential duplicate ids.
    this.hiddenThreads = Array.from(new Set(this.hiddenThreads))
    this.hiddenReplies = JSON.parse(window.localStorage.getItem(GET_HIDDEN_REPLIES())) || []
    this.hiddenReplies = Array.from(new Set(this.hiddenReplies))

    // todo: figure out a name for the "unhidden/hidden introbar htmlelement"
    // todo: input array of htmlelements to be displayed on the hidden introbar
    // todo: input array of htmlelements to be displayed on the displayed introbar
    // todo functions to be called whenever a hide performs.
    this.hideListeners = []
    // todo functions to be called whenever an unhide performs.
    this.unhideListeners = []

    this.createDebugMenu()
    this.performDomEdits()
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

    let visiblePosts = threadCollection.concat(replyCollection)

    // Create the hide buttons & hide the users hidden posts
    this.hideThreadsRENAME(visiblePosts, this.hiddenThreads, this.hiddenReplies)

    // Create infinite scroll elements
    this.setupInfiniteScroll()
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
    filteredHiddenReplies = filteredHiddenReplies.filter(id => visiblePostIds.indexOf(id) !== -1)

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

  setupInfiniteScroll () {
    INFINITE_SCROLL_ID
    let infiniteScrollLoader = document.createElement('div')
    infiniteScrollLoader.id = INFINITE_SCROLL_ID
    infiniteScrollLoader.style = 'height: 50px; width: 50px; background: black; color:white'
    infiniteScrollLoader.innerHTML = 'Loader more threads...'

    this.appendAfterLastThread(infiniteScrollLoader)

    infiniteScrollLoader.addEventListener('click', () => this.infiniteScrollListener(this.getCurrentPage()))
  }

  appendAfterLastThread (htmlElement) {
    let threadContainer = document.querySelector('[name="postcontrols"]')
    threadContainer.insertBefore(htmlElement, threadContainer.childNodes[threadContainer.length - 2])
  }

  getCurrentPage () {
    let pathnames = window.location.pathname.split('/')
    let pagename = pathnames[pathnames.length - 1]
    if (pagename.includes('index')) {
      // page 0
      return 0
    } else {
      let page = /\d*/g.exec(pagename)
      let pagenum = parseInt(page, 10)
      if (!pagenum) {
        console.error('failed to get current page')
      }
      return pagenum
    }
  }

  infiniteScrollListener (currentPage) {
    // todo need to use window.location.pathname
    console.log('infinite scroll time!')
    infinteScrollListener

    // uses an xhr to get the next threads and append them.
    let xhr = new XMLHttpRequest()
    xhr.open('GET', nextPageUrl)
    xhr.responseType = 'document'

    xhr.addEventListener('load', function () {
      let response = this.response
      let nextPageThreadContainer = response.querySelector('[name="postcontrols"]')
    })

    xhr.send()
  }
}

exports.exportImportsWorking = () => console.debug('import worked. export worked : ' + JSON.stringify(userprefs.preferences))
exports.run = () => {
  console.log('called the run method')
  console.log('do some stuff')
  console.log('whatever')
}
exports.OtaImprove = OtaImprove

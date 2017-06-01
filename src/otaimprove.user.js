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

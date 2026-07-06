// Defer background-video downloads until after the page's images have
// finished loading, so limited bandwidth (e.g. slow mobile connections)
// goes to visible images first. The poster image (set as this element's
// CSS background-image) still shows immediately; the actual <video>
// source is only attached once the window "load" event fires.
(function () {
  function hydrateVideos() {
    var videos = document.querySelectorAll('.w-background-video-atom video[data-wf-ignore]');
    for (var i = 0; i < videos.length; i++) {
      var video = videos[i];
      var source = video.querySelector('source[data-src]');
      if (!source) continue;
      source.src = source.getAttribute('data-src');
      video.setAttribute('autoplay', '');
      video.load();
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    }
  }

  if (document.readyState === 'complete') {
    hydrateVideos();
  } else {
    window.addEventListener('load', hydrateVideos);
  }
})();

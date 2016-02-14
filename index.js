// Wrap all our code in an IIFE to avoid our definitions being stuck on the window object
(function () {
  // Enable strict mode
  // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Strict_mode
  'use strict';

  // Define some literal constants to avoid "magic numbers" in our code
  // Read the source comments for explanation of the value's representation
  const CANVAS_WIDTH = document.body.clientWidth / 1.2;
  const CANVAS_HEIGHT = 300;
  const BACKGROUND_COLOR = 'rgb(60, 60, 60)';
  const BAR_OFFSET_FACTOR = 1.4;
  const BAR_PADDING = 2;

  // Set the body's background color here rather than CSS so we can keep it in
  // sync with our canvas' background color without having to change it here
  // AND in the CSS
  document.body.style.backgroundColor = BACKGROUND_COLOR;

  // Start by getting a reference to our canvas element
  const canvas = document.getElementById('freqCanvas');

  // Set the width and height to our defined width and height
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Get a reference to the canvas' context, passing in a contextType of "2d"
  // The contextType defines the rendering context associated to the canvas, such as
  // "2d", "webgl" (3D), "webgl2" (3D), and "bitmaprenderer" (Bitmap images)
  const canvasCtx = canvas.getContext('2d');

  // Different browsers name this API differently, so attempt to get the "standard"
  // name first, falling back to vendor-prefixed versions of the same API
  // This will be undefined (falsy) if none of the options exist
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // Check if it's set -- older browsers won't have it set and trying to call
  // a method that doesn't exist will result in an error
  if (navigator.getUserMedia) {
    const constraints = { audio: true, video: false };
    navigator.getUserMedia(constraints, getUserMediaSuccess, getUserMediaError);
  } else {
    // No API available to get the user's audio/video stream, do something else
    // such as informing them
    displayError('Error: Your browser may not support audio/video capture');
  }

  function getUserMediaSuccess (audioStream) {
    // Create a new instance of the AudioContext API
    // The AudioContext API represents an audio-processing graph built from
    // audio modules linked together, each represented by an AudioNode
    const audioCtx = new AudioContext();

    // To extract data from your audio source, an AnalyserNode is needed
    // The AnalyserNode interface represents a node able to provide real-time
    // frequency and time-domain information (which can then be used to build
    // data visualizations such as a frequency graph!)
    const analyser = audioCtx.createAnalyser();

    // Set the frequency domain of the Fast Fourier Transform used by the
    // analyser node (the default is 2048)
    // We have set the FFT size to be much smaller so that each bar in the graph
    // is big enough to actually look like a bar rather than a thin strand
    analyser.fftSize = 256;

    // Pass our stream to our AudioContext instance to create an audio source
    var source = audioCtx.createMediaStreamSource(audioStream);

    // Connect our audio source to the AnalyserNode
    source.connect(analyser);

    // frequencyBinCount is value half that of the FFT size; Generally equates
    // to the number of data points you will have to play with for the visualization
    var bufferLength = analyser.frequencyBinCount;

    // Create a typed array that is the length of the amount of data points
    // we're expecting
    var dataArray = new Uint8Array(bufferLength);

    // Clear the canvas of what had been drawn on it before to get ready for
    // the new visualization display
    canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Define a draw function to be called repeatedly that will render an
    // updated frequency graph in our canvas
    function draw () {
      // Use requestAnimationFrame to keep looping the drawing function once
      // it has been started (this is how this becomes a recursive function)
      var drawVisual = requestAnimationFrame(draw);

      // Populate the data array with data from the analyser node
      analyser.getByteFrequencyData(dataArray);

      // Set the background color ("fill") of the canvas and then created a filled
      // rectangle (filled with the fill color) of the entire canvas size
      canvasCtx.fillStyle = BACKGROUND_COLOR;
      canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // We want the bars to fit evenly across the canvas, so we define the
      // width of each bar as the canvas width divided by the number of bars
      // We multiply by another factor to account for the many empty or
      // near-empty bars representing frequency ranges too _high_ for "everyday",
      // effectively pushes those bars off the canvas
      var barWidth = (CANVAS_WIDTH / bufferLength) * BAR_OFFSET_FACTOR;
      var barHeight;

      // Canvases use a coordinate plan to draw inner contents --
      // On an x/y plane assuming a 4th quadrant visible range, 0 is the far left
      // of the plane, which is where we want the bars to start
      var x = 0;

      // Loop equivalent to the number of items in our data array, drawing a bar
      // for each iteration of the loop
      for (var i = 0; i < bufferLength; i++) {
        // Set the bar's height using the data point with a factor for enlargement
        barHeight = dataArray[i] * 1.5;

        // Change the fill style to the one we're going to use for the bars
        // We can use the data point value to "brighten" the color of the bar
        // for "taller" bars (i.e. greater values)
        // To ease the visual contrast, we want the bars to fade to the background
        // color the closer they get to 0, so we can set the red & green values to
        // the same base and add 60 to ensure bars with data values of zero are
        // the same color as the background.
        canvasCtx.fillStyle = `rgb(60, 60, ${dataArray[i] + 60})`;

        // Add the bar by drawing a rectangle on the canvas at (x, y) using the
        // calculated width and height. We want each bar to stick up from the bottom
        // of the canvas, not down from the top, as it would if we set the vertical
        // position to 0. Therefore, we instead set the vertical position each time
        // to the height of the canvas minus barHeight / 2, so therefore each bar
        // will be drawn from partway down the canvas, down to the bottom.
        canvasCtx.fillRect(x, CANVAS_HEIGHT - (barHeight / 2), barWidth, barHeight);

        // Start the next bar at barWidth + desired padding between bars (in px)
        x += barWidth + BAR_PADDING;
      }
    }

    // Start the drawing process
    draw();
  }

  function getUserMediaError (err) {
    // There was an error getting the audio stream, do something such as
    // informing the user
    displayError('Error: ', err.name);
  }

  function displayError (errorText) {
    // Clear the canvas of what had been drawn on it before
    canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Set the canvas' fill style to the desired color of the error text
    canvasCtx.fillStyle = 'rgb(255, 20, 48)';

    // Set the canvas' font style
    canvasCtx.font = '32px serif';

    // Add the error text to the canvas, offset from the left and at half height
    // Set a max text width of the canvas width to avoid runoff. Although this
    // will cause the text to condense, that's marginally better than running
    // off completely
    canvasCtx.fillText(errorText, 0, CANVAS_HEIGHT / 2, CANVAS_WIDTH);
  }
})();

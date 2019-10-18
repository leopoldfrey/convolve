window.AudioContext;
var audioContext;
var audioInput = null,
    effectInput = null,
    wetGain = null,
    dryGain = null,
    outputMix = null,
    currentEffectNode = null,
    reverbBuffer = null;
var useFeedbackReduction = false;
var lpInputFilter=null;

var sample = null;
var source = null;
var input = null;

var constraints = { audio: true };

function convertToMono( input ) {
	console.log('Convert to mono');
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

// this is ONLY because we have massive feedback without filtering out
// the top end in live speaker scenarios.
function createLPInputFilter() {
    console.log('createLPInputFilter');
    lpInputFilter = audioContext.createBiquadFilter();
    lpInputFilter.frequency.value = 2048;
    return lpInputFilter;
}

function gotStream(stream) {
    console.log('gotStream');
    input = audioContext.createMediaStreamSource(stream);

    audioInput = convertToMono( input );

    if (useFeedbackReduction) {
        audioInput.connect( createLPInputFilter() );
        audioInput = lpInputFilter;
        
    }
    audioInput.connect(dryGain);
    audioInput.connect(effectInput);
    audioInput.connect(analyser1);
    if(currentEffectNode != null)
	    audioInput.connect( currentEffectNode );
    crossfade(1.0);
    
    cancelAnalyserUpdates();
    updateAnalysers();
}

function startSound() {
	console.log('startSound');
	source = audioContext.createBufferSource(); // creates a sound source
  	source.buffer = sample; 
  	initNoStream(source);
    source.start(0);
    cancelAnalyserUpdates();
    updateAnalysers();

}

function stop() {
	console.log('stopSound');
	try {
    	source.stop();
    } catch(error) {
    	console.log(error);
    }
    try {
    	input.disconnect();
    } catch(error) {
    	console.log(error);
    }
}

function initNoStream(src) {
    console.log('initNoStream');
    audioInput = convertToMono( src );

	/*if (useFeedbackReduction) {
        audioInput.connect( createLPInputFilter() );
        audioInput = lpInputFilter;
        
    }//*/
    // create mix gain nodes
    audioInput.connect(dryGain);
    audioInput.connect(effectInput);
    audioInput.connect(analyser1);
    if(currentEffectNode != null)
	    audioInput.connect( currentEffectNode );
    crossfade(1.0);
    
    cancelAnalyserUpdates();
    updateAnalysers();
}

function loadSound(filename) {
	console.log('loadSound '+filename);
    var request = new XMLHttpRequest();
	request.open("GET", "sounds/"+filename, true);
	request.responseType = "arraybuffer";
	request.onload = function() {
  		audioContext.decodeAudioData(request.response,
    		function(buffer) {
      			console.log('-> buffer loaded');
    			sample = buffer;
      			source = audioContext.createBufferSource(); // creates a sound source
  				source.buffer = buffer;                    // tell the source which sound to play
  				initNoStream(source);//*/
    		});
	}
	request.send();
}

function loadIR(filename) {
	console.log('loadIR '+filename);
    var irRRequest = new XMLHttpRequest();
    irRRequest.open("GET", "sounds/"+filename, true);
    irRRequest.responseType = "arraybuffer";
    irRRequest.onload = function() {
        audioContext.decodeAudioData( irRRequest.response, 
            function(buffer) {
            	console.log('-> IR loaded');
    			reverbBuffer = buffer;
            	if(currentEffectNode != null)
	            	currentEffectNode.disconnect();
            	currentEffectNode = createReverb();
				audioInput.connect( currentEffectNode );
            } );
    }
    irRRequest.send();
}

function initContext() {
	console.log('initContext');
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext();	

	initVizu();

    outputMix = audioContext.createGain();
    dryGain = audioContext.createGain();
    wetGain = audioContext.createGain();
    effectInput = audioContext.createGain();
	dryGain.connect(outputMix);
    wetGain.connect(outputMix);
    outputMix.connect( audioContext.destination);
    outputMix.connect(analyser2);
    
    
}

function startStream() {
	console.log('startStream');
    
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	if (!navigator.getUserMedia)
        return(alert("Error: getUserMedia not supported!"));
	//*/

    navigator.getUserMedia(constraints, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

function crossfade(value) {
	console.log('crossfade '+value);
	// equal-power crossfade
	var gain1 = Math.cos(value * 0.5*Math.PI);
	var gain2 = Math.cos((1.0-value) * 0.5*Math.PI);

	dryGain.gain.value = gain1;
	wetGain.gain.value = gain2;
}

function createReverb() {
    console.log('createReverb');
	var convolver = audioContext.createConvolver();
    convolver.buffer = reverbBuffer; // impulseResponse( 2.5, 2.0 );  // reverbBuffer;
    convolver.connect( wetGain );
    return convolver;
}

function impulseResponse( duration, decay, reverse ) {
    console.log('impulseResponse '+duration+' '+decay+' '+reverse);
	var sampleRate = audioContext.sampleRate;
    var length = sampleRate * duration;
    var impulse = audioContext.createBuffer(2, length, sampleRate);
    var impulseL = impulse.getChannelData(0);
    var impulseR = impulse.getChannelData(1);

    if (!decay)
        decay = 2.0;
    for (var i = 0; i < length; i++){
      var n = reverse ? length - i : i;
      impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
}


// VISUALIZER


var rafID = null;
var analyser1;
var analyserView1;

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;


function cancelAnalyserUpdates() {
    if (rafID)
        window.cancelAnimationFrame( rafID );
    rafID = null;
}

function updateAnalysers(time) {
    analyserView1.doFrequencyAnalysis( analyser1 );
    analyserView2.doFrequencyAnalysis( analyser2 );
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

function initVizu() {
    o3djs.require('o3djs.shader');

    analyser1 = audioContext.createAnalyser();
    analyser1.fftSize = 1024;
    analyser2 = audioContext.createAnalyser();
    analyser2.fftSize = 1024;

    analyserView1 = new AnalyserView("view1");
    analyserView1.initByteBuffer( analyser1 );
    analyserView2 = new AnalyserView("view2");
    analyserView2.initByteBuffer( analyser2 );
    analyserView1.setAnalysisType(ANALYSISTYPE_SONOGRAM);
    analyserView2.setAnalysisType(ANALYSISTYPE_SONOGRAM);
}

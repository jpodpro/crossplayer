/**
 * Web Link Player class - Default Constructor
 * @param options
 */
var webLinkPlayer = function( options, player )
{
    this._type = 'weblink';
    this._player = player;
    this._options = options;
    this._audioElement = null;
    this._firstPlay = true;

    this.initAudioElement( 'weblink' );
}

// inherit from abstract player
webLinkPlayer.prototype = Object.create( abstractPlayer.prototype );


/**
 * Init audio element - defining here allows sub classes to inherit
 */
webLinkPlayer.prototype.initAudioElement = function( type )
{
    // create the audio element
    this._audioElement = document.createElement( 'audio' );
    this._player._containers[type].appendChild( this._audioElement );
    this._audioElement.addEventListener( 'waiting', this.onLoading.bind( this ) );
    this._audioElement.addEventListener( 'playing', this.onPlaying.bind( this ) );
    this._audioElement.addEventListener( 'pause', this.onPause.bind( this ) );
    this._audioElement.addEventListener( 'ended', this.onEnded.bind( this ) );
};


/**
 * Plays the given web link url
 * @param url
 */
webLinkPlayer.prototype.playUrl = function( url )
{
    this._audioElement.setAttribute( 'src', url );
    this._audioElement.play();
};


/**
 * Play method
 */
webLinkPlayer.prototype.play = function()
{
    this._audioElement.play();
};


/**
 * Pause method
 */
webLinkPlayer.prototype.pause = function()
{
    this._audioElement.pause();
};


/**
 * Stop method
 */
webLinkPlayer.prototype.stop = function()
{
    this._audioElement.src = '';
    this._player.setState( this._player.states.STOPPED );
};


/**
 * Gets the playback progress and notifies via given callback
 * @param callback
 */
webLinkPlayer.prototype.getProgress = function( callback )
{
    callback( this._audioElement.currentTime*1000 );
};


/**
 * Seek to the position specified by positionMS
 * @param positionMS
 */
webLinkPlayer.prototype.seek = function( positionMS )
{
    this._audioElement.currentTime = positionMS/1000;
};


/**
 * Called when the player is loading
 */
webLinkPlayer.prototype.onLoading = function()
{
    this._player.setState( this._player.states.LOADING );
};


/**
 * Called when the player is playing
 */
webLinkPlayer.prototype.onPlaying = function()
{
    this._firstPlay = false;
    this._player.setState( this._player.states.PLAYING );
    this._player.setDuration( this._audioElement.duration*1000 );
};


/**
 * Called when the player is paused
 */
webLinkPlayer.prototype.onPause = function()
{
    this._player.setState( this._player.states.PAUSED );
};


/**
 * Called when the player has ended
 */
webLinkPlayer.prototype.onEnded = function()
{
    this._player.setState( this._player.states.STOPPED );
    this._player.ended();
};
/**
 * YouTube Player class - Default Constructor
 * @param options
 */
var youTubePlayer = function( options, player )
{
    this._type = 'youtube';
    this._player = player;
    this._options = options;
    this._ytPlayer = null;
    this._waitLimit = 10000;
    this._waitTimer = null;
    this._initializing = false;
    this._ready = false;
    this._readyError = false;
    this._firstPlay = true;
};


// inherit from abstract player
youTubePlayer.prototype = Object.create( abstractPlayer.prototype );


/**
 * YouTube Player initialization.
 * @param videoId
 */
youTubePlayer.prototype.init = function( videoId )
{
    this._initializing = true;

    // create the player iframe element
    var ytPlayerId = 'pp-yt-player-'+this._player.generateRandomString(8);
    var iframeSrc = 'https://www.youtube.com/embed/'+videoId+'?enablejsapi=1';
    var iframeElement = document.createElement( 'iframe' );
    var origin = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
    if( origin.indexOf( 'file://' ) === -1 ) iframeSrc += '&origin='+origin;
    iframeElement.setAttribute( 'id', ytPlayerId );
    iframeElement.setAttribute( 'type', 'text/html' );
    iframeElement.setAttribute( 'width', '100%' );
    iframeElement.setAttribute( 'height', '100%' );
    iframeElement.setAttribute( 'src', iframeSrc );
    iframeElement.setAttribute( 'frameborder', 0 );
    this._player._containers.youtube.appendChild( iframeElement );

    // load the iframe API
    var scriptElement = document.createElement( 'script' );
    scriptElement.src = 'https://www.youtube.com/iframe_api';
    var firstScriptTag = document.getElementsByTagName( 'script' )[0];
    firstScriptTag.parentNode.insertBefore( scriptElement, firstScriptTag );
    scriptElement.onload = function()
    {
        YT.ready( function()
        {
            // set loading timeout for edge cases when player creation error is undetectable
            this._waitTimer = setTimeout( function()
            {
                this._readyError = true;
                throw new Error( 'YouTube player not initializing. Possible Flash out of date error.' );
            }.bind( this ), this._waitLimit );

            this._ytPlayer = new YT.Player( ytPlayerId,
                {
                    playerVars:
                    {
                        controls: 0,
                        showinfo: 0,
                        rel: 0
                    },
                    events:
                    {
                        onReady: function( event )
                        {
                            this.onReady();
                        }.bind( this ),
                        onStateChange: function( event )
                        {
                            this.onStateChange( event );
                        }.bind( this ),
                        onError: function( event )
                        {
                            this.onError( event );
                        }.bind( this )
                    }
                } );
        }.bind( this ) );
    }.bind( this );
}


/**
 * Callback fired when player is ready for action
 */
youTubePlayer.prototype.onReady = function()
{
    clearTimeout( this._waitTimer );
    this._ready = true;
};


/**
 * Callback fired when there is an initialization error
 * @param event
 */
youTubePlayer.prototype.onError = function( event )
{
    clearTimeout( this._waitTimer );
    this._readyError = true;
    this._player.setState( this._player.states.STOPPED );
    throw new Error( 'Error initializing YouTube Player: '+event.data );
    console.log( 'youtube init error: '+event );
};


/**
 * Callback fired when the player state changes
 * @param event
 */
youTubePlayer.prototype.onStateChange = function( event )
{
    if( event.data == YT.PlayerState.PLAYING )
    {
        if( this._firstPlay && this._player._iOS )
        {
            this._player._containers[this._type].firstChild.style.display = 'none';
            this._firstPlay = false;
        }

        this._player.setState( this._player.states.PLAYING );
        this._player.setDuration( this._ytPlayer.getDuration()*1000 );
    }
    else if( event.data == YT.PlayerState.PAUSED )
    {
        this._player.setState( this._player.states.PAUSED );
    }
    else if( event.data == YT.PlayerState.BUFFERING )
    {
        this._player.setState( this._player.states.LOADING );
    }
    else if( event.data == YT.PlayerState.ENDED )
    {
        this._player.setState( this._player.states.STOPPED );
        this._player.ended();
    }
};


/**
 * Plays the given youtube url
 * @param url
 * @returns {number}
 */
youTubePlayer.prototype.playUrl = function( url )
{
    var videoId = /v=([A-Za-z0-9\-_]+)/.exec( url );

    if( videoId === null )
    {
        throw new Error( "Invalid YouTube URL" );
    }

    if( !this._ready && !this._readyError )
    {
        if( !this._initializing )
        {
            this.init( videoId );
        }

        return setTimeout( function()
        {
            this.playUrl( url );
        }.bind( this ), 500 );
    }
    else if( this._readyError )
    {
        return;
    }

    if( this._firstPlay && this._player._iOS )
    {
        this._player._containers[this._type].firstChild.style.display = 'block';
        this._player.interactionRequired( this._type );
        this._ytPlayer.cueVideoById( videoId[1], 0.1, 'small' );
    }
    else
    {
        this._ytPlayer.loadVideoById( videoId[1], 0.1, "small" );
    }
};


/**
 * Play method
 */
youTubePlayer.prototype.play = function()
{
    if( this._ytPlayer && this._ready ) this._ytPlayer.playVideo();
};


/**
 * Pause method
 */
youTubePlayer.prototype.pause = function()
{
    if( this._ytPlayer && this._ready ) this._ytPlayer.pauseVideo();
};


/**
 * Stop method
 */
youTubePlayer.prototype.stop = function()
{
    if( this._ytPlayer && this._ready )
    {
        this._ytPlayer.stopVideo();
        this._player.setState( this._player.states.STOPPED );
    }
};


/**
 * Gets the playback progress and notifies using given callback
 * @param callback
 */
youTubePlayer.prototype.getProgress = function( callback )
{
    if( this._ytPlayer && this._ready ) callback( this._ytPlayer.getCurrentTime()*1000 );
};


/**
 * Seeks to position specified by positionMS
 * @param positionMS
 */
youTubePlayer.prototype.seek = function( positionMS )
{
    if( this._ytPlayer && this._ready ) this._ytPlayer.seekTo( positionMS/1000 );
};
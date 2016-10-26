/**
 * Main player class
 *
 * @param options
 *      elementId string: REQUIRED, the element ID for the player
 *      progressInterval int: MS between each progress update
 *      enableSoundCloud bool: whether to enable the SoundCloud player (default: true)
 *      enableYouTube bool: whether to enable the YouTube player (default: true)
 *      enableDropBox bool: whether to enable the DropBox player (default: true)
 *      enableWebLink bool: whether to enable the WebLink player (default: true)
 *      scClientId string: SoundCloud client id. When provided the player will use the superior HTTP API instead of the default Widget API
 */
var basePlayer = function( options )
{
    this._options = options;
    this._state = this.states.STOPPED;
    this._currentUrl = null;
    this._currentPlayer = null;
    this._progressTimer = null;
    this._players = {};
    this._containers = {};
    this._callbacks = {};
    this._elapsedMS = 0;
    this._durationMS = 0;
    this._audioElementsEnabled = false;
    this._iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // options defaults
    var defaultOptions = {
        progressInterval: 1000,
        enableSoundCloud: true,
        enableYouTube: true,
        enableWebLink: true,
        enableDropBox: true
    };

    if( !options || !options.elementId )
    {
        throw new Error( "Option 'elementId' is required" );
    }

    for( var key in defaultOptions )
    {
        if( !this._options[key] )
        {
            this._options[key] = defaultOptions[key];
        }
    }

    this._container = document.querySelector( '#'+this._options.elementId );


    if( this._options.enableSoundCloud )
    {
        this.createPlayerContainer( 'soundcloud' );
        this._players.soundcloud = new soundCloudPlayer( this._options, this );
    }

    if( this._options.enableYouTube )
    {
        this.createPlayerContainer( 'youtube' );
        this._players.youtube = new youTubePlayer( this._options, this );
    }

    if( this._options.enableWebLink )
    {
        this.createPlayerContainer( 'weblink' );
        this._players.weblink = new webLinkPlayer( this._options, this );
    }

    if( this._options.enableDropBox )
    {
        this.createPlayerContainer( 'dropbox' );
        this._players.dropbox = new dropBoxPlayer( this._options, this );
    }
};


/**
 * Player States
 */
basePlayer.prototype.states =
{
    STOPPED: 0,
    LOADING: 1,
    PLAYING: 2,
    PAUSED:  3
};


/**
 * Creates the container for a given player type
 * @param type
 * @param parent
 */
basePlayer.prototype.createPlayerContainer = function( type )
{
    this._containers[type] = document.createElement( 'div' );
    this._containers[type].setAttribute( 'class', type );
    this._containers[type].setAttribute( 'style', 'position:absolute; top:0; left:0; height: 100%; width:100%; display:none;' );

    switch( type )
    {
        case 'soundcloud':
            var errorMessage = document.createElement( 'p' );
            errorMessage.setAttribute( 'style', 'display:none;' );
            errorMessage.appendChild( document.createTextNode( 'iOS requires more interaction. Please press "Listen in Browser" and remember to thank Apple for the privilege.' ) );
            this._containers[type].appendChild( errorMessage );
            break;

        case 'youtube':
            var errorMessage = document.createElement( 'p' );
            errorMessage.setAttribute( 'style', 'display:none;' );
            errorMessage.appendChild( document.createTextNode( 'iOS requires more interaction. Please press play again and remember to thank Apple for the privilege.' ) );
            this._containers[type].appendChild( errorMessage );
            break;
    }

    this._container.appendChild( this._containers[type] );
};


/**
 * Calls the specified callback function (if exists), with given data
 * @param callback
 * @param data
 */
basePlayer.prototype.callback = function( callback, data )
{
    if( this._callbacks[callback] )
    {
        this._callbacks[callback]( data );
    }
};


/**
 * Generates a random alpha-numeric string of specified length
 * @param length
 * @returns {string}
 */
basePlayer.prototype.generateRandomString = function( length )
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


/**
 * Sets the player state
 * @param newState
 */
basePlayer.prototype.setState = function( newState )
{
    if( this._state != newState )
    {
        this._state = newState;

        try
        {
            switch( this._state )
            {
                case this.states.STOPPED:
                    this._currentUrl = null;
                    this._elapsedMS = 0;
                    this._durationMS = 0;
                    clearInterval( this._progressTimer );
                    this.callback( 'onStopped' );
                    break;

                case this.states.LOADING:
                    clearInterval( this._progressTimer );
                    this.callback( 'onLoading' );
                    break;

                case this.states.PLAYING:
                    clearInterval( this._progressTimer );
                    this._progressTimer = setInterval( this.updateProgress.bind( this ), this._options.progressInterval );
                    this.callback( 'onPlaying' );
                    break;

                case this.states.PAUSED:
                    clearInterval( this._progressTimer );
                    this.callback( 'onPaused' );
                    break;
            }
        }
        catch( e )
        {
            throw e;
        }
    }
};


/**
 * Sets the visiblity of the current player container. Only the active player will be visible.
 * @param container
 */
basePlayer.prototype.setVisible = function( container )
{
    for( var key in this._containers )
    {
        this._containers[key].style.display = 'none';
    }

    this._containers[container].style.display = 'block';
};


/**
 * Sets track duration in milliseconds.
 * @param durationMS
 */
basePlayer.prototype.setDuration = function( durationMS )
{
    this._durationMS = durationMS;
};


/**
 * Called when the current track has ended
 */
basePlayer.prototype.ended = function()
{
    this.callback( 'onEnded' );
};


/**
 * Called when there is additional track data retrieved.
 * At this point it is only used by SoundCloud player.
 * @param data
 */
basePlayer.prototype.trackData = function( data )
{
    this.callback( 'onTrackData', data );
};


/**
 * Called when the player has determined that user interaction is required.
 * Generally this only happens when the user is on iOS. Apple requires extreme
 * amounts of user interaction to play media on their device.
 * @param playerName
 */
basePlayer.prototype.interactionRequired = function( type )
{
    this.callback( 'onInteractionRequired', type );
};


/**
 * Called on an interval to update the playback progress
 */
basePlayer.prototype.updateProgress = function()
{
    try
    {
        this._currentPlayer.getProgress( function( elapsedMS )
        {
            this._elapsedMS = elapsedMS;

            // trigger callback for progress update
            this.callback( 'onProgress', {elapsedMS:this._elapsedMS, durationMS:this._durationMS} );
        }.bind( this ));
    }
    catch( e )
    {
        clearInterval( this._progressTimer );
        throw e;
    }
};


/**
 * Special technique to synchronously launch play on audio element.
 * This allows async control of audio element on iOS.
 * @param callback
 */
basePlayer.prototype.enableAudioElement = function( audioElement )
{
    var onPlay = function( e )
    {
        audioElement.removeEventListener( 'play', onPlay, false );
    };

    audioElement.addEventListener( 'play', onPlay, false );
    audioElement.play();
};


/**
 * Plays a given URL using appropriate player
 * @param url: the URL to play
 * @returns {string}: the type of the player handling this URL
 */
basePlayer.prototype.playUrl = function( url )
{
    try
    {
        // enable all audio elements for iOS
        if( !this._audioElementsEnabled )
        {
            for( var key in this._players )
            {
                if( this._players[key]._audioElement )
                {
                    this.enableAudioElement( this._players[key]._audioElement );
                }
            }

            this._audioElementsEnabled = true;
        }

        if( this._state != this.states.STOPPED )
        {
            this._currentPlayer.stop();
        }

        this.setState( this.states.LOADING );

        // determine url type
        if( url.indexOf( 'youtu.be' ) != -1 || url.indexOf( 'youtube.com' ) != -1 )
        {
            this.setVisible( 'youtube' );
            this._currentPlayer = this._players.youtube;
            this._currentPlayer.playUrl( url );
        }
        else if( url.indexOf( 'soundcloud.com' ) != -1 )
        {
            this.setVisible( 'soundcloud' );
            this._currentPlayer = this._players.soundcloud;
            this._currentPlayer.playUrl( url );
        }
        else if( url.indexOf( 'dropbox.com' ) != -1 || url.indexOf( 'dropboxusercontent.com' ) != -1 )
        {
            this.setVisible( 'dropbox' );
            this._currentPlayer = this._players.dropbox;
            this._currentPlayer.playUrl( url );
        }
        else
        {
            // assume it is a direct web link
            this.setVisible( 'weblink' );
            this._currentPlayer = this._players.weblink;
            this._currentPlayer.playUrl( url );
        }

        return this._currentPlayer._type;
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Play method
 */
basePlayer.prototype.play = function()
{
    try
    {
        this._currentPlayer.play();
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Pause method
 */
basePlayer.prototype.pause = function()
{
    try
    {
        this._currentPlayer.pause();
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Toggles the play/pause state
 */
basePlayer.prototype.togglePlayPause = function()
{
    try
    {
        if( this._state == this.states.PLAYING )
        {
            this._currentPlayer.pause();
        }
        else if( this._state == this.states.PAUSED )
        {
            this._currentPlayer.play();
        }
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Seek to given position
 * @param positionMS
 */
basePlayer.prototype.seek = function( positionMS )
{
    try
    {
        this._currentPlayer.seek( positionMS );
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Stop method
 */
basePlayer.prototype.stop = function()
{
    try
    {
        this._currentPlayer.stop();
    }
    catch( e )
    {
        throw e;
    }
};


/**
 * Registers onStopped callback
 * @param callback
 */
basePlayer.prototype.onStopped = function( callback )
{
    this._callbacks.onStopped = callback;
};


/**
 * Registers onLoading callback
 * @param callback
 */
basePlayer.prototype.onLoading = function( callback )
{
    this._callbacks.onLoading = callback;
};


/**
 * Registers onPlaying callback
 * @param callback
 */
basePlayer.prototype.onPlaying = function( callback )
{
    this._callbacks.onPlaying = callback;
};


/**
 * Registers onPaused callback
 * @param callback
 */
basePlayer.prototype.onPaused = function( callback )
{
    this._callbacks.onPaused = callback;
};


/**
 * Registers onEnded callback
 * @param callback
 */
basePlayer.prototype.onEnded = function( callback )
{
    this._callbacks.onEnded = callback;
};


/**
 * Registers onProgress callback
 * @param callback
 */
basePlayer.prototype.onProgress = function( callback )
{
    this._callbacks.onProgress = callback;
};


/**
 * Registers onTrackData callback
 * @param callback
 */
basePlayer.prototype.onTrackData = function( callback )
{
    this._callbacks.onTrackData = callback;
};


/**
 * Registers onInteractionRequired callback
 * @param callback
 */
basePlayer.prototype.onInteractionRequired = function( callback )
{
    this._callbacks.onInteractionRequired = callback;
};
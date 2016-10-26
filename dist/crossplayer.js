(function(global)
{


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


/**
 * Abstract Player Class.
 * Defines methods that all inheriting players must implement
 * @param options
 * @param player
 */
var abstractPlayer = function( options, player )
{

}


/**
 * Plays the given URL
 * @param url
 */
abstractPlayer.prototype.playUrl = function( url )
{
    throw new Error( 'Load method not implemented' );
}


/**
 * Play method
 */
abstractPlayer.prototype.play = function()
{
    throw new Error( 'Play method not implemented' );
}


/**
 * Pause method
 */
abstractPlayer.prototype.pause = function()
{
    throw new Error( 'Pause method not implemented' );
}


/**
 * Stop method
 */
abstractPlayer.prototype.stop = function()
{
    throw new Error( 'Stop method not implemented' );
}


/**
 * Get Progress method
 * @param callback
 */
abstractPlayer.prototype.getProgress = function( callback )
{
    throw new Error( 'Get progress method not implemented' );
}


/**
 * Seek method
 * @param positionMS
 */
abstractPlayer.prototype.seek = function( positionMS )
{
    throw new Error( 'Seek method not implemented' );
}


/**
 * SoundCloud Player class - Default Constructor
 * @param options
 */
var soundCloudPlayer = function( options, player )
{
    this._type = 'soundcloud';
    this._player = player;
    this._options = options;
    this._scriptLoaded = false;
    this._widget = null;
    this._scTrack = null;
    this._audioElement = null;
    this._firstPlay = true;
    this._seekTo = -1;

    if( this._options.scClientId )
    {
        this.loadScript( 'https://connect.soundcloud.com/sdk/sdk-3.1.2.js', function()
        {
            SC.initialize( { client_id: this._options.scClientId } );
            this._scriptLoaded = true;
        }.bind( this ));

        // setup the audio element
        this._audioElement = document.createElement( 'audio' );
        this._player._containers.soundcloud.appendChild( this._audioElement );
        this._audioElement.addEventListener( 'waiting', this.httpOnLoad.bind( this ) );
        this._audioElement.addEventListener( 'playing', this.httpOnPlay.bind( this ) );
        this._audioElement.addEventListener( 'pause', this.httpOnPause.bind( this ) );
        this._audioElement.addEventListener( 'ended', this.httpOnEnd.bind( this ) );
    }
    else
    {
        // use widget-style player.
        // unfortunately this requires shit-loads of user interaction on iOS, but that's the glory of apple.
        this.loadScript( 'https://w.soundcloud.com/player/api.js', function()
        {
            this._scriptLoaded = true;
        }.bind( this ));
    }
};


// inherit from abstract player
soundCloudPlayer.prototype = Object.create( abstractPlayer.prototype );


/**
 * Loads javascript library and calls callback when complete
 * @param script
 */
soundCloudPlayer.prototype.loadScript = function( script, callback )
{
    var scriptElement = document.createElement( 'script' );
    scriptElement.src = script;
    scriptElement.onload = callback;
    document.body.appendChild( scriptElement );
};


/**
 * Creates SoundCloud widget using an iframe in a hidden div
 * @param url
 */
soundCloudPlayer.prototype.createWidget = function( url )
{
    var iframeElement = document.createElement( 'iframe' );
    iframeElement.setAttribute( 'src', 'https://w.soundcloud.com/player/?url=' + encodeURIComponent( url ) );
    iframeElement.setAttribute( 'style', 'height:100%; width:100%;' );
    this._player._containers.soundcloud.appendChild( iframeElement );

    this._widget = SC.Widget( iframeElement );
    this._widget.bind( SC.Widget.Events.READY, this.widgetOnReady.bind( this ) );
    this._widget.bind( SC.Widget.Events.PLAY, this.widgetOnPlay.bind( this ) );
    this._widget.bind( SC.Widget.Events.FINISH, this.widgetOnEnded.bind( this ) );
};


/**
 * Plays SoundCloud URL
 * @param url
 */
soundCloudPlayer.prototype.playUrl = function( url )
{
    // wait for API script to load
    if( !this._scriptLoaded )
    {
        setTimeout( function()
        {
            this.playUrl( url );
        }.bind( this ), 500 );

        return;
    }

    if( this._options.scClientId )
    {
        SC.resolve( url )
            .then( function( track )
            {
                this._player.trackData( track );
                this._scTrack = track;
                this._audioElement.setAttribute( 'src', track.stream_url+'?client_id='+this._options.scClientId );
                this._audioElement.play();
            }.bind( this ) );
    }
    else
    {
        if( !this._widget )
        {
            // create widget
            this.createWidget( url );
        }
        else
        {
            // load url in existing widget
            var auto_play = ( this._firstPlay && this._player._iOS ) ? false : true;
            this._widget.load( url, {auto_play:auto_play} );
        }

        if( this._player._iOS )
        {
            this._player._containers[this._type].firstChild.style.display = 'block';
            this._player.interactionRequired( this._type );
        }
    }
};


/**
 * Called when the HTTP API is loading a track
 */
soundCloudPlayer.prototype.httpOnLoad = function()
{
    this._player.setState( this._player.states.LOADING );
};


/**
 * Called when the HTTP API is playing
 */
soundCloudPlayer.prototype.httpOnPlay = function()
{
    this._firstPlay = false;
    this._player.setState( this._player.states.PLAYING );
    this._player.setDuration( this._audioElement.duration*1000 );
};


/**
 * Called when the HTTP API is paused
 */
soundCloudPlayer.prototype.httpOnPause = function()
{
    this._player.setState( this._player.states.PAUSED );
};


/**
 * Called when the HTTP API track has ended
 */
soundCloudPlayer.prototype.httpOnEnd = function()
{
    this._player.setState( this._player.states.STOPPED );
    this._player.ended();
};


/**
 * Called when the widget API is ready to receive calls
 */
soundCloudPlayer.prototype.widgetOnReady = function()
{
    if( !this._player._iOS )
    {
        this.play();
    }
};


/**
 * Called when the widget API has started playing
 */
soundCloudPlayer.prototype.widgetOnPlay = function()
{
    this._firstPlay = false;
    this._player.setState( this._player.states.PLAYING );
    this._widget.getCurrentSound( function( sound )
    {
        this._player.setDuration( sound.duration );
        //this._player.trackData( sound );

    }.bind( this ));


    if( this._player._iOS )
    {
        this._player._containers[this._type].firstChild.style.display = 'none';
    }
};


/**
 * Called when the widget API playing track has ended
 */
soundCloudPlayer.prototype.widgetOnEnded = function()
{
    // only handle if state is playing since FUCKING iOS fires this twice. FUCKING iOS. fuck apple.
    if( this._player._state == this._player.states.PLAYING )
    {
        this._player.setState( this._player.states.STOPPED );
        this._player.ended();
    }
};


/**
 * Play method
 */
soundCloudPlayer.prototype.play = function()
{
    if( this._options.scClientId )
    {
        this._audioElement.play();
    }
    else
    {
        this._widget.play();
    }
};


/**
 * Pause method
 */
soundCloudPlayer.prototype.pause = function()
{
    if( this._options.scClientId )
    {
        this._audioElement.pause();
    }
    else
    {
        this._widget.pause();
        this._player.setState( this._player.states.PAUSED );
    }
};


/**
 * Stop method
 */
soundCloudPlayer.prototype.stop = function()
{
    if( this._options.scClientId )
    {
        this._audioElement.src = '';
    }
    else
    {
        this._widget.pause();
    }

    this._player.setState( this._player.states.STOPPED );
};


/**
 * Gets the playback progress and notifies using the given callback
 * @param callback
 */
soundCloudPlayer.prototype.getProgress = function( callback )
{
    if( this._options.scClientId )
    {
        callback( this._audioElement.currentTime*1000 );
    }
    else
    {
        if( this._seekTo > 0 )
        {
            callback( this._seekTo );
        }
        else
        {
            this._widget.getPosition( callback );
        }

    }
};


/**
 * Seeks to position specified by positionMS
 * @param positionMS
 */
soundCloudPlayer.prototype.seek = function( positionMS )
{
    if( this._options.scClientId )
    {
        this._audioElement.currentTime = positionMS/1000;
    }
    else
    {
        // deal with shitty widget lag on iOS
        this._seekTo = positionMS;
        setTimeout( function()
        {
            this._seekTo = -1;
        }.bind( this ), 2000 );

        this._widget.seekTo( positionMS );
    }
};


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
    this._ready = false;
    this._readyError = false;
    this._firstPlay = true;

    // create the player element
    var ytPlayerId = 'pp-yt-player-'+this._player.generateRandomString( 8 );
    var ytPlayer = document.createElement( 'div' );
    ytPlayer.setAttribute( 'id', ytPlayerId );
    ytPlayer.setAttribute( 'style', 'width:100%; height:100%;' );
    this._player._containers.youtube.appendChild( ytPlayer );

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
                    height: '50',
                    width: '50',
                    videoId: "",
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
};


// inherit from abstract player
youTubePlayer.prototype = Object.create( abstractPlayer.prototype );


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
    if( !this._ready && !this._readyError )
    {
        return setTimeout( function()
        {
            this.playUrl( url );
        }.bind( this ), 500 );
    }
    else if( this._readyError )
    {
        return;
    }

    var videoId = /v=([A-Za-z0-9\-_]+)/.exec( url );

    if( videoId === null )
    {
        throw new Error( "Invalid YouTube URL" );
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


/**
 * DropBox player class - default constructor
 */
var dropBoxPlayer = function( options, player )
{
    this._type = 'dropbox';
    this._player = player;
    this._options = options;
    this._firstPlay = true;

    this.initAudioElement( 'dropbox' );
};

// dropbox player inherits from web link player since it behaves almost identically
dropBoxPlayer.prototype = Object.create( webLinkPlayer.prototype );


/**
 * Plays the given URL
 */
dropBoxPlayer.prototype.playUrl = function( url )
{
    // format link
    url = url.replace( /\?.*/g, '' );
    url += '?dl=1';

    this._audioElement.setAttribute( 'src', url );
    this._audioElement.play();
};


/**
 * This is the exported player which allows only limited access to the main player
 * @param options
 */
var exportPlayer = function( options )
{
    this._player = new basePlayer( options );
};

exportPlayer.prototype.playUrl = function( url )
{
    return this._player.playUrl( url );
};

exportPlayer.prototype.play = function()
{
    return this._player.play();
};

exportPlayer.prototype.pause = function()
{
    return this._player.pause();
};

exportPlayer.prototype.togglePlayPause = function()
{
    return this._player.togglePlayPause();
};

exportPlayer.prototype.seek = function( positionMS )
{
    return this._player.seek( positionMS );
};

exportPlayer.prototype.stop = function()
{
    return this._player.stop();
};

exportPlayer.prototype.onStopped = function( callback )
{
    return this._player.onStopped( callback );
};

exportPlayer.prototype.onLoading = function( callback )
{
    return this._player.onLoading( callback );
};

exportPlayer.prototype.onPlaying = function( callback )
{
    return this._player.onPlaying( callback );
};

exportPlayer.prototype.onPaused = function( callback )
{
    return this._player.onPaused( callback );
};

exportPlayer.prototype.onEnded = function( callback )
{
    return this._player.onEnded( callback );
};

exportPlayer.prototype.onProgress = function( callback )
{
    return this._player.onProgress( callback );
};

exportPlayer.prototype.onTrackData = function( callback )
{
    return this._player.onTrackData( callback );
};

exportPlayer.prototype.onInteractionRequired = function( callback )
{
    return this._player.onInteractionRequired( callback );
};


global.CrossPlayer = exportPlayer;

})( this );
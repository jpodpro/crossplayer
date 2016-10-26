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